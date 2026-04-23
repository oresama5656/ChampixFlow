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
  if (!dateStr) return "";
  // すでにTが含まれる場合はそのまま、含まれない場合は今日として扱うためにT00:00:00を付与
  const isoStr = (typeof dateStr === 'string' && !dateStr.includes('T')) ? `${dateStr}T00:00:00` : dateStr;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return ""; 
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** 服用開始日から12週間のスケジュールを計算する */
export function calcSchedule(startDate) {
  if (!startDate) return { start_date: "", phase1_end: "", phase2_end: "", maintenance_start: "", treatment_end: "" };
  
  const isoStr = (typeof startDate === 'string' && !startDate.includes('T')) ? `${startDate}T00:00:00` : startDate;
  const start = new Date(isoStr);
  const isValid = !isNaN(start.getTime());
  
  return {
    start_date: startDate,
    phase1_end: isValid ? addDays(startDate, 2) : "",   
    phase2_end: isValid ? addDays(startDate, 6) : "",   
    maintenance_start: isValid ? addDays(startDate, 7) : "",  
    treatment_end: isValid ? addDays(startDate, 83) : "",     
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

  const nextDateISO = calcNextDate(latestDispensing.dispense_date, latestDispensing.days);
  const nextDate = new Date(nextDateISO + 'T00:00:00');
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

/** 患者登録（スターターキットなどの自動追加付き） */
export function registerPatient(data, { name, start_date, memo, days, is_starter }) {
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
  const parsedDays = parseInt(days, 10);
  const starterDispensing = {
    id: genId() + 1,
    patient_id: patientId,
    dispense_date: start_date,
    days: isNaN(parsedDays) ? 14 : parsedDays,
    is_starter: is_starter ? 1 : 0,
    memo: '初回登録時の自動登録',
    week: 1,
    created_at: new Date().toISOString(),
  };
  data.patients.push(newPatient);
  data.dispensings.push(starterDispensing);
  return { data, patient: newPatient };
}

/** 交付を追加 */
export function addDispensing(data, patientId, { dispense_date, days, is_starter, memo, week }) {
  const parsedDays = parseInt(days, 10);
  const parsedWeek = parseInt(week, 10);
  
  const newDisp = {
    id: genId(),
    patient_id: patientId,
    dispense_date,
    days: isNaN(parsedDays) ? 14 : parsedDays,
    is_starter: is_starter ? 1 : 0,
    memo: memo || '',
    week: isNaN(parsedWeek) ? null : parsedWeek,
    created_at: new Date().toISOString(),
  };
  data.dispensings.push(newDisp);
  return { data, dispensing: newDisp };
}

/** 患者の visible をトグル */
export function toggleVisible(data, patientId) {
  const p = data.patients.find(x => String(x.id) === String(patientId));
  if (p) {
    p.visible = p.visible === 1 ? 0 : 1;
    p.updated_at = new Date().toISOString();
  } else {
    console.warn(`toggleVisible: patientId ${patientId} not found`);
  }
  return data;
}

/** 患者をアーカイブ */
export function archivePatient(data, patientId) {
  const p = data.patients.find(x => String(x.id) === String(patientId));
  if (p) {
    p.status = 'archived';
    p.updated_at = new Date().toISOString();
  } else {
    console.warn(`archivePatient: patientId ${patientId} not found`);
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
    if (!schedule.maintenance_start || !schedule.treatment_end) return; // スケール計算できない場合はスキップ

    const nextDate = latest ? calcNextDate(p.start_date, latest.days) : null;
    const status = calcStatus(p, latest);

    // 実線バー（交付済み）
    if (latest) {
      const actualNextDate = calcNextDate(latest.dispense_date, latest.days);
      bars.push({
        patient_id: p.id,
        patient_name: p.name,
        type: 'solid',
        start: latest.dispense_date,
        end: actualNextDate,
        days: latest.days,
        visible: p.visible,
        status,
      });
    }

    // 透明バー（次回予定）
    if (latest) {
      const nextDate = calcNextDate(latest.dispense_date, latest.days);
      const nextEnd = calcNextDate(nextDate, latest.days || 14);
      bars.push({
        patient_id: p.id,
        patient_name: p.name,
        type: 'ghost',
        start: nextDate,
        end: nextEnd,
        days: latest.days || 14,
        visible: p.visible,
        status,
      });
    }

  });

  return { bars };
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
