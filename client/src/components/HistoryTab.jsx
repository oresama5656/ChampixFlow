import React from 'react';

const STATUS_LABEL = {
  active:          '進行中',
  dropout_concern: '離脱懸念',
  completed:       '完了（卒業）',
  archived:        'アーカイブ',
};

/**
 * HistoryTab – 完了・離脱確定済みの患者アーカイブ
 */
function HistoryTab({ archived }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-100">履歴（アーカイブ）</h2>
        <span className="text-xs text-slate-500">{archived.length}名</span>
      </div>

      {archived.length === 0 ? (
        <p className="text-center text-slate-500 text-sm py-8">
          アーカイブされた患者はいません
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">患者名</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">服用開始日</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">最終来局日</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">ステータス</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">メモ</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {archived.map(p => (
                <tr key={p.id} className="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                  <td className="px-3 py-2.5 text-slate-200 font-medium">{p.name}</td>
                  <td className="px-3 py-2.5 text-slate-400">{p.start_date}</td>
                  <td className="px-3 py-2.5 text-slate-400">{p.last_dispense_date || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-700 text-slate-400 border border-surface-600">
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs">{p.memo || '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-slate-600 hover:text-danger-400 transition-colors p-1"
                      title="完全に削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistoryTab;
