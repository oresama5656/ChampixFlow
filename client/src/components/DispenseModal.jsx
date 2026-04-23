import React, { useState } from 'react';

/**
 * DispenseModal – 来局時に交付情報を入力するモーダル
 */
function DispenseModal({ patient, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    dispense_date: today,
    days: patient?.last_days || 14, // 前回と同じ日数をデフォルト
    is_starter: false,
    memo: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}/dispensings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          days: parseInt(form.days),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`エラー: ${err.error}`);
        return;
      }
      onSuccess();
    } catch {
      alert('登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    // モーダルオーバーレイ
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-100 mb-1">来局記録</h2>
        <p className="text-sm text-slate-400 mb-4">{patient?.name}さん</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 交付日 */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
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
            <label className="block text-xs font-medium text-slate-300 mb-1">
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

          {/* スターターキットフラグ */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_starter}
              onChange={e => setForm(f => ({ ...f, is_starter: e.target.checked }))}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm text-slate-300">
              スターターキット交付（0.5mg×11錠 + 1.0mg×3錠）
            </span>
          </label>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">メモ（任意）</label>
            <textarea
              rows={2}
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="特記事項があれば"
              className="input resize-none"
            />
          </div>

          {/* ボタン群 */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              キャンセル
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DispenseModal;
