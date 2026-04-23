/**
 * dataManager.js
 * File System Access API を使ったローカルファイル（champix_data.json）への
 * データ読み書きモジュール。
 * IndexedDB でフォルダハンドルを永続化し、再訪時の再選択を不要にする。
 */

// ファイル名の定義
const DATA_FILE_NAME = 'champix_data.json';
const DB_NAME = 'ChampixFlow';
const DB_STORE = 'handles';

// -----------------------------------------------
// IndexedDB ヘルパー
// -----------------------------------------------

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
  });
}

export async function saveDirectoryHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(handle, 'directory');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get('directory');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// -----------------------------------------------
// ファイル読み書き
// -----------------------------------------------

/** フォルダハンドルから champix_data.json を読み込んでデータを返す */
export async function loadData(directoryHandle) {
  const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME, { create: true });
  const file = await fileHandle.getFile();
  const text = await file.text();
  if (!text) return getEmptyData();
  try {
    const parsed = JSON.parse(text);
    return {
      patients: Array.isArray(parsed.patients) ? parsed.patients : [],
      dispensings: Array.isArray(parsed.dispensings) ? parsed.dispensings : [],
    };
  } catch {
    return getEmptyData();
  }
}

/** データをファイルに書き込む */
export async function saveData(directoryHandle, data) {
  const fileHandle = await directoryHandle.getFileHandle(DATA_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

function getEmptyData() {
  return { patients: [], dispensings: [] };
}

// -----------------------------------------------
// 計算ロジック（server/index.js から移植）
// -----------------------------------------------

/** 日付文字列に n 日加算した文字列を返す */
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** 服用開始日から12週間のスケジュールを計算する */
export function calcSchedule(startDate) {
  const start = new Date(startDate);
  return {
    start_date: startDate,
    phase1_end: addDays(start, 2),   // Day1-3終了
    phase2_end: addDays(start, 6),   // Day4-7終了
    maintenance_start: addDays(start, 7),  // Day8開始
    treatment_end: addDays(start, 83),     // 12週目最終日
  };
}

/** 交付日 + 日数から次回来局予定日を計算する */
export function calcNextDate(dispenseDate, days) {
  return addDays(dispenseDate, days);
}

/** 患者の最新交付情報からステータスを自動判定する */
export function calcStatus(patient, latestDispensing) {
  if (patient.status === 'archived') return 'archived';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedule = calcSchedule(patient.start_date);
  const treatmentEnd = new Date(schedule.treatment_end);

  if (today > treatmentEnd && latestDispensing) return 'completed';
  if (!latestDispensing) return 'active';

  const nextDate = new Date(calcNextDate(latestDispensing.dispense_date, latestDispensing.days));
  const diffDays = Math.floor((today - nextDate) / (1000 * 60 * 60 * 24));
  if (diffDays >= 3) return 'dropout_concern';

  return 'active';
}

// -----------------------------------------------
// CRUD ヘルパー
// -----------------------------------------------

/** ID生成 */
function genId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/** 全患者に最新交付情報・スケジュール・ステータスを付与して返す */
export function buildPatients(data) {
  const { patients, dispensings } = data;
  return patients.map(p => {
    // この患者の最新交付
    const pDisp = dispensings
      .filter(d => d.patient_id === p.id)
      .sort((a, b) => {
        const dateA = a.created_at || a.dispense_date;
        const dateB = b.created_at || b.dispense_date;
        return dateB.localeCompare(dateA);
      });
    const latest = pDisp[0] || null;

    const schedule = calcSchedule(p.start_date);
    const next_date = latest ? calcNextDate(latest.dispense_date, latest.days) : null;
    const status = calcStatus(p, latest);

    return {
      ...p,
      ...schedule,
      next_date,
      status,
      last_dispense_date: latest?.dispense_date || null,
      last_days: latest?.days || null,
      last_is_starter: latest?.is_starter || 0,
      latest_week: latest?.week || null,
    };
  });
}

/** 患者登録（スターターキット自動追加付き） */
export function registerPatient(data, { name, start_date, memo, days }) {
  const patientId = genId();
  const newPatient = {
    id: patientId,
    name,
    start_date,
    memo: memo || '',
    status: 'active',
    visible: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // 初回用として自動追加
  const starterDispensing = {
    id: genId() + 1,
    patient_id: patientId,
    dispense_date: start_date,
    days: days ? parseInt(days, 10) : 14,
    is_starter: 1,
    memo: '初回スターターキット自動登録',
    week: 1,
    created_at: new Date().toISOString(),
  };
  data.patients.push(newPatient);
  data.dispensings.push(starterDispensing);
  return { data, patient: newPatient };
}

/** 交付を追加 */
export function addDispensing(data, patientId, { dispense_date, days, is_starter, memo, week }) {
  const newDisp = {
    id: genId(),
    patient_id: patientId,
    dispense_date,
    days,
    is_starter: is_starter ? 1 : 0,
    memo: memo || '',
    week: week ? parseInt(week, 10) : null,
    created_at: new Date().toISOString(),
  };
  data.dispensings.push(newDisp);
  return { data, dispensing: newDisp };
}

/** 患者の visible をトグル */
export function toggleVisible(data, patientId) {
  const p = data.patients.find(x => x.id === patientId);
  if (p) {
    p.visible = p.visible === 1 ? 0 : 1;
    p.updated_at = new Date().toISOString();
  }
  return data;
}

/** 患者をアーカイブ */
export function archivePatient(data, patientId) {
  const p = data.patients.find(x => x.id === patientId);
  if (p) {
    p.status = 'archived';
    p.updated_at = new Date().toISOString();
  }
  return data;
}

/** 患者の交付履歴一覧を返す（最新順） */
export function getDispensings(data, patientId) {
  return data.dispensings
    .filter(d => d.patient_id === patientId)
    .sort((a, b) => {
      const dateA = a.created_at || a.dispense_date;
      const dateB = b.created_at || b.dispense_date;
      return dateB.localeCompare(dateA);
    })
    .map(d => ({ ...d, next_date: calcNextDate(d.dispense_date, d.days) }));
}

// -----------------------------------------------
// ガントチャートデータ生成
// -----------------------------------------------

/** 全患者のガントバー配列と在庫ヒートマップを返す */
export function buildGanttData(data) {
  const activePatients = data.patients.filter(p => p.status !== 'archived');
  const bars = [];
  const reserveMap = {};

  activePatients.forEach(p => {
    const pDisp = data.dispensings
      .filter(d => d.patient_id === p.id)
      .sort((a, b) => {
        const dateA = a.created_at || a.dispense_date;
        const dateB = b.created_at || b.dispense_date;
        return dateB.localeCompare(dateA);
      });
    const latest = pDisp[0] || null;
    const schedule = calcSchedule(p.start_date);
    const nextDate = latest ? calcNextDate(latest.dispense_date, latest.days) : null;
    const status = calcStatus(p, latest);

    // 実線バー（交付済み）
    if (latest) {
      bars.push({
        patient_id: p.id,
        patient_name: p.name,
        type: 'solid',
        start: latest.dispense_date,
        end: nextDate,
        days: latest.days,
        visible: p.visible,
        status,
      });
    }

    // 透明バー（次回予定）
    if (nextDate) {
      const nextEnd = calcNextDate(nextDate, latest?.days || 14);
      bars.push({
        patient_id: p.id,
        patient_name: p.name,
        type: 'ghost',
        start: nextDate,
        end: nextEnd,
        days: latest?.days || 14,
        visible: p.visible,
        status,
      });
    }

    // 在庫ヒートマップ：維持期間（Day8〜12週）の1.0mg×2錠/日を集計
    const mStart = new Date(schedule.maintenance_start);
    const tEnd = new Date(schedule.treatment_end);
    const today = new Date();
    let cur = new Date(Math.max(mStart.getTime(), today.getTime()));
    while (cur <= tEnd) {
      const key = cur.toISOString().split('T')[0];
      reserveMap[key] = (reserveMap[key] || 0) + 2;
      cur.setDate(cur.getDate() + 1);
    }
  });

  return { bars, reserveMap };
}

// -----------------------------------------------
// CSVエクスポート
// -----------------------------------------------

export function buildCSV(data) {
  const { patients, dispensings } = data;
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += '患者ID,患者名,服用開始日,ステータス,メモ,交付日,何週目,交付日数,スターターキット\n';
  patients.forEach(p => {
    const pDisp = dispensings.filter(d => d.patient_id === p.id);
    if (pDisp.length === 0) {
      csv += `${p.id},"${p.name}",${p.start_date},${p.status},"${p.memo || ''}",,,,いいえ\n`;
    } else {
      pDisp.forEach(d => {
        csv += `${p.id},"${p.name}",${p.start_date},${p.status},"${p.memo || ''}",${d.dispense_date},${d.week || ''},${d.days},${d.is_starter ? 'はい' : 'いいえ'}\n`;
      });
    }
  });
  return csv;
}
