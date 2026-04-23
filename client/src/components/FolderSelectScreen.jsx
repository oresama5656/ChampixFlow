import React from 'react';

/**
 * FolderSelectScreen
 * アプリ起動時にデータフォルダを選択させるスクリーン。
 * リフィル処方箋アプリ（refill_manager）と同じ UX パターン。
 */
export default function FolderSelectScreen({ resumeHandle, onStart, loading }) {
  // 既存ハンドルがある場合は「再開モード」
  const isResume = !!resumeHandle;

  const handleSelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await onStart(handle);
    } catch (e) {
      if (e.name !== 'AbortError') {
        alert('フォルダの選択に失敗しました: ' + e.message);
      }
    }
  };

  const handleResume = async () => {
    if (!resumeHandle) return;
    try {
      const perm = await resumeHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        await onStart(resumeHandle);
      } else {
        alert('フォルダへのアクセスが許可されませんでした。');
      }
    } catch (e) {
      alert('エラーが発生しました: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-4">
      {/* ロゴ・タイトル */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-4">💊</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">ChampixFlow</h1>
        <p className="text-slate-400 mt-2 text-sm">チャンピックス服用管理システム</p>
      </div>

      {/* カード */}
      <div className="w-full max-w-md bg-surface-800 rounded-2xl border border-surface-700 shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">📂</span>
        </div>

        {isResume ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2">おかえりなさい</h2>
            <p className="text-slate-400 text-sm mb-6">
              前回のフォルダ <strong className="text-white">「{resumeHandle.name}」</strong> を使用して開始します。
              <br />
              <span className="text-xs text-slate-500">※ セキュリティのため、開始ボタンの押下が必要です。</span>
            </p>
            <button
              onClick={handleResume}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>🚀</span> アプリを開始
            </button>
            <button
              onClick={handleSelect}
              disabled={loading}
              className="mt-3 w-full text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2 transition"
            >
              別のフォルダを選択する
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">データフォルダの選択</h2>
            <p className="text-slate-400 text-sm mb-6">
              患者データを保存するフォルダを選択してください。
              <br />
              <span className="text-xs text-slate-500">データはお使いのPC内にのみ保存され、外部に送信されることはありません。</span>
            </p>
            <button
              onClick={handleSelect}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition disabled:opacity-50"
            >
              {loading ? '読み込み中...' : 'フォルダを選択して開始'}
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-600">
        ChampixFlow v2.0 — データはローカルPC内にのみ保存されます
      </p>
    </div>
  );
}
