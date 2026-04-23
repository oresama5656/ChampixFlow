import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// レセコンとのポート競合を避けるため、あまり使われない番号を使用
const PORT = process.env.PORT || 3717;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// データディレクトリの作成
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// データベース初期化
const dbPath = path.join(dataDir, 'champix.db');
const db = new sqlite3.Database(dbPath);

// テーブル作成 -------------------------------------------------------

// 患者マスタ
db.run(`
  CREATE TABLE IF NOT EXISTS patients (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    start_date TEXT   NOT NULL,          -- 服用開始日 (YYYY-MM-DD)
    status    TEXT    NOT NULL DEFAULT 'active',
                                          -- active / dropout_concern / completed / archived
    visible   INTEGER NOT NULL DEFAULT 1, -- カレンダー表示フラグ (1=表示, 0=非表示)
    memo      TEXT,
    created_at TEXT   DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT   DEFAULT CURRENT_TIMESTAMP
  )
`);

// 交付履歴（来局ごとに1レコード）
db.run(`
  CREATE TABLE IF NOT EXISTS dispensings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id   INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dispense_date TEXT   NOT NULL, -- 実際の交付日 (YYYY-MM-DD)
    days         INTEGER NOT NULL, -- 交付日数
    is_starter   INTEGER NOT NULL DEFAULT 0, -- スターターキット交付フラグ
    memo         TEXT,
    created_at   TEXT   DEFAULT CURRENT_TIMESTAMP
  )
`);

// -----------------------------------------------
// スケジュール計算ヘルパー関数
// -----------------------------------------------

/**
 * 服用開始日から各フェーズの終了日を計算する
 */
function calcSchedule(startDate) {
  const start = new Date(startDate);
  const addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().split('T')[0];
  };

  return {
    start_date:         startDate,
    phase1_end:         addDays(start, 2),  // Day 1-3 終了 (0-indexed: +2)
    phase2_end:         addDays(start, 6),  // Day 4-7 終了
    maintenance_start:  addDays(start, 7),  // Day 8 開始
    treatment_end:      addDays(start, 83), // Day 84 (12週間の最終日)
  };
}

/**
 * 次回交付予定日を計算する
 * 実際の交付日 + 交付日数 = 次回予定日
 */
function calcNextDate(dispenseDate, days) {
  const d = new Date(dispenseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * 患者のステータスを日付から自動判定する
 */
function calcStatus(patient, latestDispensing) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedule = calcSchedule(patient.start_date);
  const treatmentEnd = new Date(schedule.treatment_end);

  // 12週間完了チェック
  if (today > treatmentEnd && latestDispensing) {
    return 'completed';
  }

  if (!latestDispensing) return 'active';

  // 次回来局予定日が今日より3日以上過ぎていれば離脱懸念
  const nextDate = new Date(calcNextDate(latestDispensing.dispense_date, latestDispensing.days));
  const diffDays = Math.floor((today - nextDate) / (1000 * 60 * 60 * 24));
  if (diffDays >= 3) return 'dropout_concern';

  return 'active';
}

// -----------------------------------------------
// API: 患者一覧取得
// -----------------------------------------------
app.get('/api/patients', (req, res) => {
  const sql = `
    SELECT
      p.*,
      d.dispense_date AS last_dispense_date,
      d.days          AS last_days,
      d.is_starter    AS last_is_starter
    FROM patients p
    LEFT JOIN dispensings d ON d.id = (
      SELECT id FROM dispensings WHERE patient_id = p.id ORDER BY dispense_date DESC LIMIT 1
    )
    ORDER BY p.status ASC, p.name ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'データ取得失敗' });

    // 各患者にスケジュール情報を付与
    const result = rows.map(row => {
      const schedule = calcSchedule(row.start_date);
      const nextDate = row.last_dispense_date
        ? calcNextDate(row.last_dispense_date, row.last_days)
        : null;
      // ステータスを自動更新
      const status = calcStatus(row, row.last_dispense_date ? {
        dispense_date: row.last_dispense_date,
        days: row.last_days
      } : null);
      return { ...row, ...schedule, next_date: nextDate, status };
    });
    res.json(result);
  });
});

// -----------------------------------------------
// API: 患者1件取得
// -----------------------------------------------
app.get('/api/patients/:id', (req, res) => {
  db.get('SELECT * FROM patients WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'データ取得失敗' });
    if (!row) return res.status(404).json({ error: '患者が見つかりません' });
    const schedule = calcSchedule(row.start_date);
    res.json({ ...row, ...schedule });
  });
});

// -----------------------------------------------
// API: 患者新規登録
// -----------------------------------------------
app.post('/api/patients', (req, res) => {
  const { name, start_date, memo } = req.body;
  if (!name || !start_date) {
    return res.status(400).json({ error: '患者名と服用開始日は必須です' });
  }
  const sql = `INSERT INTO patients (name, start_date, memo) VALUES (?, ?, ?)`;
  db.run(sql, [name, start_date, memo || ''], function(err) {
    if (err) return res.status(500).json({ error: '登録失敗' });
    const patientId = this.lastID;

    // 初回はスターターキット（14日分）の交付実績を自動登録
    const dispenseSql = `INSERT INTO dispensings (patient_id, dispense_date, days, is_starter, memo) VALUES (?, ?, 14, 1, '初回スターターキット自動登録')`;
    db.run(dispenseSql, [patientId, start_date], function(err3) {
      db.get('SELECT * FROM patients WHERE id = ?', [patientId], (err2, row) => {
        if (err2 || !row) return res.status(500).json({ error: 'データ取得失敗' });
        
        // ステータスを自動更新
        const newStatus = calcStatus(row, { dispense_date: start_date, days: 14 });
        db.run(`UPDATE patients SET status=? WHERE id=?`, [newStatus, patientId], () => {
          res.status(201).json({ ...row, ...calcSchedule(row.start_date), status: newStatus });
        });
      });
    });
  });
});


// -----------------------------------------------
// API: 患者情報更新
// -----------------------------------------------
app.put('/api/patients/:id', (req, res) => {
  const { name, start_date, memo, visible, status } = req.body;
  const sql = `
    UPDATE patients SET name=?, start_date=?, memo=?, visible=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `;
  db.run(sql, [name, start_date, memo || '', visible ?? 1, status || 'active', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: '更新失敗' });
    if (this.changes === 0) return res.status(404).json({ error: '患者が見つかりません' });
    db.get('SELECT * FROM patients WHERE id = ?', [req.params.id], (err2, row) => {
      if (err2) return res.status(500).json({ error: 'データ取得失敗' });
      res.json({ ...row, ...calcSchedule(row.start_date) });
    });
  });
});

// -----------------------------------------------
// API: 患者の visible トグル（カレンダー表示/非表示）
// -----------------------------------------------
app.patch('/api/patients/:id/toggle-visible', (req, res) => {
  db.run(
    `UPDATE patients SET visible = CASE WHEN visible=1 THEN 0 ELSE 1 END, updated_at=datetime('now') WHERE id=?`,
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: '更新失敗' });
      db.get('SELECT * FROM patients WHERE id = ?', [req.params.id], (err2, row) => {
        if (err2) return res.status(500).json({ error: 'データ取得失敗' });
        res.json(row);
      });
    }
  );
});

// -----------------------------------------------
// API: 患者削除（アーカイブへ移動）
// -----------------------------------------------
app.patch('/api/patients/:id/archive', (req, res) => {
  db.run(
    `UPDATE patients SET status='archived', updated_at=datetime('now') WHERE id=?`,
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: '更新失敗' });
      res.json({ message: 'アーカイブしました' });
    }
  );
});

// -----------------------------------------------
// API: 交付履歴一覧取得（患者ごと）
// -----------------------------------------------
app.get('/api/patients/:id/dispensings', (req, res) => {
  db.all(
    'SELECT * FROM dispensings WHERE patient_id=? ORDER BY dispense_date DESC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'データ取得失敗' });
      const rowsWithNext = rows.map(r => ({ ...r, next_date: calcNextDate(r.dispense_date, r.days) }));
      res.json(rowsWithNext);
    }
  );
});

// -----------------------------------------------
// API: 交付を登録（来局時に呼ぶ）
// -----------------------------------------------
app.post('/api/patients/:id/dispensings', (req, res) => {
  const { dispense_date, days, is_starter, memo } = req.body;
  if (!dispense_date || !days) {
    return res.status(400).json({ error: '交付日と日数は必須です' });
  }
  const sql = `
    INSERT INTO dispensings (patient_id, dispense_date, days, is_starter, memo)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(sql, [req.params.id, dispense_date, days, is_starter ? 1 : 0, memo || ''], function(err) {
    if (err) return res.status(500).json({ error: '登録失敗' });
    // ステータスも自動更新
    db.get('SELECT * FROM patients WHERE id=?', [req.params.id], (err2, patient) => {
      if (!err2 && patient) {
        const newStatus = calcStatus(patient, { dispense_date, days });
        db.run(`UPDATE patients SET status=?, updated_at=datetime('now') WHERE id=?`,
          [newStatus, req.params.id]);
      }
    });
    res.status(201).json({
      id: this.lastID,
      patient_id: parseInt(req.params.id),
      dispense_date,
      days,
      is_starter: is_starter ? 1 : 0,
      memo: memo || '',
      next_date: calcNextDate(dispense_date, days),
    });
  });
});

// -----------------------------------------------
// API: 全患者のガントチャートデータ（在庫集計付き）
// -----------------------------------------------
app.get('/api/gantt', (req, res) => {
  // 全患者と最新交付情報を取得
  const sql = `
    SELECT p.*,
      d.dispense_date, d.days, d.is_starter
    FROM patients p
    LEFT JOIN dispensings d ON d.id = (
      SELECT id FROM dispensings WHERE patient_id = p.id ORDER BY dispense_date DESC LIMIT 1
    )
    WHERE p.status != 'archived'
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'データ取得失敗' });

    const bars = [];
    // 日ごとの1.0mg錠予約数を集計するマップ
    const reserveMap = {};

    rows.forEach(row => {
      const schedule = calcSchedule(row.start_date);
      const nextDate = row.dispense_date ? calcNextDate(row.dispense_date, row.days) : null;

      // 実線バー（交付済み期間）
      if (row.dispense_date) {
        bars.push({
          patient_id: row.id,
          patient_name: row.name,
          type: 'solid',   // 交付済み
          start: row.dispense_date,
          end: nextDate,   // 次回来局予定日（バーの終端）
          days: row.days,
          visible: row.visible,
          status: row.status,
        });
      }

      // 透明バー（次回予定期間）
      if (nextDate) {
        const nextEnd = calcNextDate(nextDate, row.days || 14);
        bars.push({
          patient_id: row.id,
          patient_name: row.name,
          type: 'ghost',   // 次回予定
          start: nextDate,
          end: nextEnd,
          days: row.days || 14,
          visible: row.visible,
          status: row.status,
        });
      }

      // 在庫集計：維持期（Day 8以降）に 1.0mg を 2錠/日 必要
      // maintenanceStart から treatmentEnd まで、visibleに関わらず予約を計上
      const mStart = new Date(schedule.maintenance_start);
      const tEnd   = new Date(schedule.treatment_end);
      const today  = new Date();

      // 未来分のみカウント（過去分は消費済み）
      let cur = new Date(Math.max(mStart, today));
      while (cur <= tEnd) {
        const key = cur.toISOString().split('T')[0];
        reserveMap[key] = (reserveMap[key] || 0) + 2; // 1.0mg×2錠/日
        cur.setDate(cur.getDate() + 1);
      }
    });

    res.json({ bars, reserveMap });
  });
});

// -----------------------------------------------
// API: CSV エクスポート
// -----------------------------------------------
app.get('/api/export/csv', (req, res) => {
  const sql = `
    SELECT p.id, p.name, p.start_date, p.status, p.memo,
      d.dispense_date, d.days, d.is_starter
    FROM patients p
    LEFT JOIN dispensings d ON d.patient_id = p.id
    ORDER BY p.id, d.dispense_date
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'CSVエクスポート失敗' });
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '患者ID,患者名,服用開始日,ステータス,メモ,交付日,交付日数,スターターキット\n';
    rows.forEach(r => {
      csv += `${r.id},"${r.name}",${r.start_date},${r.status},"${r.memo || ''}",`;
      csv += `${r.dispense_date || ''},${r.days || ''},${r.is_starter ? 'はい' : 'いいえ'}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=champix_export.csv');
    res.send(csv);
  });
});

// -----------------------------------------------
// 静的ファイル配信（本番ビルド用）
// -----------------------------------------------
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// サーバー起動
app.listen(PORT, () => {
  console.log('\n💊 ChampixFlow サーバー起動\n');
  console.log(`📍 フロントエンド: http://localhost:5717/`);
  console.log(`📍 バックエンドAPI: http://localhost:${PORT}`);
  console.log(`💾 DB:   ${dbPath}\n`);
});
