import React, { useState, useEffect } from 'react';

/**
 * SettingsTab – 薬局情報設定（localStorage保存）
 */
function SettingsTab() {
  const [form, setForm] = useState({
    name:    '',
    address: '',
    tel:     '',
    tip:     '吸いたくなった時は、深呼吸を10回してみてください。冷たい水を飲むのも効果的です。',
  });
  const [saved, setSaved] = useState(false);

  // 保存済み設定を読み込む
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('champixSettings') || '{}');
    setForm(f => ({ ...f, ...stored }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('champixSettings', JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-5">オプション設定</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 薬局名称 */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">薬局名称</label>
            <input
              type="text"
              placeholder="あやめ薬局"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input"
            />
          </div>

          {/* 住所 */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">住所</label>
            <input
              type="text"
              placeholder="茨城県日立市..."
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="input"
            />
          </div>

          {/* TEL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">電話番号</label>
            <input
              type="text"
              placeholder="0294-00-0000"
              value={form.tel}
              onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
              className="input"
            />
          </div>

          {/* 禁煙のコツ（スタンプカード下部に印字） */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              禁煙のコツ（スタンプカードに掲載）
            </label>
            <textarea
              rows={3}
              value={form.tip}
              onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
              className="input resize-none"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            {saved ? '✓ 保存しました' : '設定を保存'}
          </button>
        </form>

        {/* 使い方メモ */}
        <div className="mt-6 p-3 bg-surface-700/50 rounded-lg border border-surface-600">
          <p className="text-xs text-slate-400 leading-relaxed">
            ここで設定した薬局情報は、スタンプカード印刷に自動で反映されます。
            設定はこのPC内（ブラウザのローカルストレージ）に保存されます。
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
