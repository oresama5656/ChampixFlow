import React, { useState } from 'react';
import StampCard from './StampCard.jsx';

/**
 * RegisterTab – 新規患者登録フォーム
 */
function RegisterTab({ onRegister, loading, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    name: '',
    start_date: today,
    memo: '',
  });
  const [registered, setRegistered] = useState(null); // 登録後プレビュー用

  const handleSubmit = async (e) => {
    e.preventDefault();
    const patient = await onRegister(form);
    if (patient) {
      setRegistered(patient);
      setForm({
        name: '',
        start_date: today,
        memo: '',
      });
    }
  };

  const handlePrint = () => {
    const original = document.getElementById('stamp-card-print');
    if (!original) return;
    const clone = original.cloneNode(true);
    clone.id = 'stamp-card-print-clone';
    document.body.appendChild(clone);
    document.body.classList.add('printing-stamp-card');
    
    window.print();
    
    document.body.classList.remove('printing-stamp-card');
    document.body.removeChild(clone);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-5">新規患者登録</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 患者名 */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              患者名 <span className="text-danger-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="山田 太郎"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input"
            />
          </div>

          {/* 服用開始日 */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              服用開始日 <span className="text-danger-400">*</span>
            </label>
            <input
              type="date"
              required
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="input"
            />
            {/* 自動計算プレビュー */}
            {form.start_date && (
              <p className="mt-1 text-xs text-slate-500">
                禁煙達成予定日:&nbsp;
                <span className="text-brand-400 font-medium">
                  {calcTreatmentEnd(form.start_date)}
                </span>
                （12週間後）
              </p>
            )}
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">メモ（任意）</label>
            <textarea
              rows={2}
              placeholder="特記事項があれば"
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {/* 登録ボタン */}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>

        {/* 登録完了メッセージ */}
        {registered && (
          <div className="mt-4 p-3 bg-success-500/10 border border-success-500/30 rounded-lg">
            <p className="text-sm text-success-400 font-medium">
              ✓ {registered.name}さんを登録しました
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              開始日: {registered.start_date} ／ 達成予定: {registered.treatment_end}
            </p>
          </div>
        )}
      </div>

      {/* 印刷プレビュー（画面上は縮小表示、印刷時はA5フルサイズ） */}
      {registered && (
        <div className="mt-6 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-3 font-medium">スタンプカードプレビュー（初回分）</p>
          <div id="stamp-card-print" className="w-full max-w-2xl">
            <StampCard patient={registered} />
          </div>
          
          <button 
            type="button" 
            onClick={handlePrint} 
            className="mt-6 w-full max-w-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-105 print:hidden"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            スタンプカードを印刷する
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 服用開始日から12週間後（Day 84）の日付を計算
 */
function calcTreatmentEnd(startDate) {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + 84);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default RegisterTab;
