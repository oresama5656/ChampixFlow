import React from 'react';

// ChampixFlow ヘッダーコンポーネント
function Header() {
  return (
    <header className="bg-surface-800 border-b border-surface-700 px-6 py-3 flex items-center gap-3">
      {/* 薬のアイコン（SVG） */}
      <svg className="w-7 h-7 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        <rect x="3" y="3" width="18" height="18" rx="3" strokeLinecap="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
      </svg>
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">ChampixFlow</h1>
        <p className="text-xs text-slate-400">チャンピックス服用管理システム</p>
      </div>
    </header>
  );
}

export default Header;
