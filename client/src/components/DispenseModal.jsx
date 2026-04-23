import React, { useState } from 'react';
import StampCard from './StampCard.jsx';

/**
 * DispenseModal – 来局時に交付情報を入力するモーダル（患者詳細 兼 記録画面）
 */
function DispenseModal({ patient, onClose, onDispense }) {
  const today = new Date().toISOString().split('T')[0];
  
  let defaultWeek = 1;
  if (patient?.start_date) {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const startObj = new Date(patient.start_date + 'T00:00:00');
    const elapsedDays = Math.floor((todayObj - startObj) / (1000 * 60 * 60 * 24));
    defaultWeek = Math.min(Math.max(Math.floor(elapsedDays / 7) + 1, 1), 12);
  }
  if (patient?.latest_week) {
    const addedWeeks = patient?.last_days ? Math.max(1, Math.round(patient.last_days / 7)) : 2;
    defaultWeek = Math.min(patient.latest_week + addedWeeks, 12);
  }

  const [form, setForm] = useState({
    dispense_date: today,
    days: patient?.last_days || 14, // 前回と同じ日数をデフォルト
    is_starter: false,
    memo: '',
    week: defaultWeek,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedDays = parseInt(form.days, 10);
      await onDispense(patient.id, {
        ...form,
        days: isNaN(parsedDays) ? 14 : parsedDays,
      });
    } catch {
      alert('登録に失敗しました');
    } finally {
      if (document.body) setLoading(false); // unmount時のエラー回避
    }
  };

  const handlePrint = () => {
    const cardEl = document.getElementById('modal-stamp-card');
    if (!cardEl) return;
    
    const clone = cardEl.cloneNode(true);
    clone.id = 'stamp-card-print-clone';
    document.body.appendChild(clone);
    document.body.classList.add('printing-stamp-card');
    
    setTimeout(() => {
      window.print();
      
      setTimeout(() => {
        document.body.classList.remove('printing-stamp-card');
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      }, 200);
    }, 200);
  };

  return (
    // モーダルオーバーレイ
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}>
      <div 
        className="card w-full max-w-5xl my-auto p-0 overflow-hidden flex flex-col md:flex-row relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* 閉じるボタン（右上の×） */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-surface-700 hover:bg-surface-600 text-slate-300 transition print:hidden"
        >
          ✕
        </button>

        {/* --- 左ペイン：患者情報と交付フォーム --- */}
        <div className="w-full md:w-80 border-r border-surface-700 bg-surface-800 p-6 flex flex-col print:hidden">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-100 mb-1">{patient?.name}様</h2>
            <p className="text-sm text-slate-400">来局記録・交付入力</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 flex-1">
            {/* 交付日 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                交付日 <span className="text-danger-400">*</span>
              </label>
              <input
                type="date"
                value={form.dispense_date}
                onChange={e => setForm(f => ({ ...f, dispense_date: e.target.value }))}
                required
                className="input"
              />
            </div>

            {/* 交付日数 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                交付日数 <span className="text-danger-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.days}
                onChange={e => setForm(f => ({ ...f, days: e.target.value }))}
                required
                className="input"
                placeholder="例: 14"
              />
            </div>

            {/* 週数 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                何週目ですか？ <span className="text-danger-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={form.week}
                onChange={e => setForm(f => ({ ...f, week: e.target.value }))}
                required
                className="input"
                placeholder="例: 4"
              />
            </div>

            {/* スターターキットフラグ */}
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-surface-600 bg-surface-700/50 hover:bg-surface-700 transition">
              <input
                type="checkbox"
                checked={form.is_starter}
                onChange={e => setForm(f => ({ ...f, is_starter: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
              <span className="text-sm text-slate-200">
                スターターキット交付<br/>
                <span className="text-[10px] text-slate-400">0.5mg×11錠 + 1.0mg×3錠</span>
              </span>
            </label>

            {/* メモ */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">メモ（任意）</label>
              <textarea
                rows={2}
                value={form.memo}
                onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                placeholder="特記事項があれば"
                className="input resize-none"
              />
            </div>

            <div className="pt-4 mt-auto">
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? '登録中...' : '記録を保存する'}
              </button>
            </div>
          </form>
        </div>

        {/* --- 右ペイン：スタンプ状況と印刷 --- */}
        <div className="flex-1 bg-surface-900 p-6 flex flex-col print:p-0 print:bg-white">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <h3 className="text-sm font-semibold text-slate-300">現在の進捗とスタンプカード情報</h3>
            <button 
              onClick={handlePrint}
              className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 border border-surface-600 hover:border-indigo-500 hover:text-indigo-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              カードを印刷
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center bg-surface-800 rounded-xl border border-surface-700 p-4 print:border-none print:bg-transparent print:p-0">
            {/* スタンプカード自体 */}
            <div className="w-full">
              <StampCard patient={patient} overrideWeek={parseInt(form.week, 10)} printId="modal-stamp-card" />
            </div>
          </div>
          
          <p className="text-xs text-center text-slate-500 mt-4 print:hidden">
            ※ 上記は現在の状況です。「記録を保存する」を押すとスタンプが更新されます。<br/>
            更新された最新のカードを渡す場合は、保存後に印刷ボタンを押してください。
          </p>
        </div>
      </div>
    </div>
  );
}

export default DispenseModal;
