import React, { useState } from 'react';
import DispenseModal from './DispenseModal.jsx';

// ステータスの表示名・スタイルのマップ
const STATUS_META = {
  active:          { label: '進行中',   cls: 'badge-active' },
  dropout_concern: { label: '離脱懸念', cls: 'badge-dropout' },
  completed:       { label: '完了',     cls: 'badge-completed' },
};

// 今日から開始日までの経過日数を計算
function daysSince(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
}

// 週数に変換
function daysToWeeks(days) {
  const w = Math.floor(Math.max(days, 0) / 7) + 1;
  return `第${w}週`;
}

/**
 * PatientList – 左ペインに表示する患者一覧
 */
function PatientList({ patients, onToggleVisible, onArchive, onDispense }) {
  const [selectedId, setSelectedId] = useState(null); // 交付モーダル対象
  const [searchQuery, setSearchQuery] = useState('');

  // 検索フィルタ
  const filtered = patients.filter(p =>
    p.name.includes(searchQuery)
  );

  return (
    <div className="card flex flex-col h-full">
      {/* リストヘッダー */}
      <div className="px-4 pt-4 pb-2 border-b border-surface-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-200">患者一覧</h2>
          <span className="text-xs text-slate-500">{filtered.length}名</span>
        </div>
        {/* 検索ボックス */}
        <input
          type="text"
          placeholder="患者名で検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input text-sm"
        />
      </div>

      {/* 患者リスト本体（スクロール可） */}
      <ul className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-surface-700">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-slate-500 text-sm">
            患者が登録されていません
          </li>
        )}
        {filtered.map(patient => {
          const elapsed = daysSince(patient.start_date);
          const week    = daysToWeeks(Math.max(elapsed, 0));
          const meta    = STATUS_META[patient.status] || STATUS_META.active;
          const isHidden = patient.visible === 0;

          return (
            <li
              key={patient.id}
              onClick={() => setSelectedId(patient.id)}
              className={`px-4 py-3 transition-colors duration-150 cursor-pointer ${
                isHidden ? 'opacity-40' : 'hover:bg-surface-700/50'
              }`}
            >
              {/* 1行目: 患者名 + ステータス */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-slate-100 flex-1 truncate">{patient.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>

              {/* 2行目: 経過 + 次回来局 */}
              <div className="text-xs text-slate-400 flex items-center gap-3 mb-2">
                <span>{week}（Day {elapsed + 1}）</span>
                {patient.next_date && (
                  <span className="text-warning-400">次回: {patient.next_date}</span>
                )}
              </div>

              {/* ボタン群（クリックイベントが親の li に伝播しないよう stopPropagation する） */}
              <div className="flex gap-1.5">
                {/* 来局ボタン */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedId(patient.id); }}
                  className="btn-primary text-xs py-1 px-2.5"
                >
                  来局記録
                </button>
                {/* 表示/非表示トグル */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisible(patient.id); }}
                  title={isHidden ? 'カレンダーに表示' : 'カレンダーから非表示'}
                  className="btn-ghost text-xs py-1 px-2"
                >
                  {isHidden ? (
                    // 目アイコン（表示）
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    // 目を閉じるアイコン（非表示）
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
                {/* アーカイブボタン */}
                <button
                  onClick={(e) => { e.stopPropagation(); onArchive(patient.id); }}
                  title="履歴へ移動"
                  className="btn-ghost text-xs py-1 px-2 text-slate-500 hover:text-danger-400"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 来局記録モーダル */}
      {selectedId && (
        <DispenseModal
          patient={patients.find(p => p.id === selectedId)}
          onClose={() => setSelectedId(null)}
          onDispense={async (pid, form) => {
            const success = await onDispense(pid, form);
            if (success) {
              setSelectedId(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default PatientList;
