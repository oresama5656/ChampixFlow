import React from 'react';

// タブ定義
const TABS = [
  { id: 'overview',  label: '一覧・カレンダー' },
  { id: 'register',  label: '新規登録' },
  { id: 'settings',  label: 'オプション' },
  { id: 'history',   label: '履歴' },
];

function TabNav({ activeTab, onTabChange, onExportCSV }) {
  return (
    <div className="bg-surface-800 border-b border-surface-700">
      <div className="container mx-auto px-4 max-w-screen-2xl">
        <nav className="flex items-center space-x-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-200 cursor-pointer
                ${activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-surface-600'
                }
              `}
            >
              {tab.label}
            </button>
          ))}

          {/* CSV書き出しは右端に配置 */}
          <button
            onClick={onExportCSV}
            className="ml-auto py-3 px-4 text-sm font-medium text-success-400 hover:text-success-300
                       transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
          >
            {/* ダウンロードアイコン（SVG） */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV書き出し
          </button>
        </nav>
      </div>
    </div>
  );
}

export default TabNav;
