import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import TabNav from './components/TabNav.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import RegisterTab from './components/RegisterTab.jsx';
import SettingsTab from './components/SettingsTab.jsx';
import HistoryTab from './components/HistoryTab.jsx';
import FolderSelectScreen from './components/FolderSelectScreen.jsx';
import {
  loadData, saveData, buildCSV,
  loadDirectoryHandle, saveDirectoryHandle,
  buildPatients, buildGanttData,
  registerPatient, addDispensing, toggleVisible, archivePatient, deletePatient,
} from './lib/dataManager.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="card p-8 max-w-lg w-full text-center">
            <h1 className="text-2xl font-bold text-danger-400 mb-4">予期せぬエラーが発生しました</h1>
            <p className="text-slate-400 mb-6 text-sm">
              データの形式が正しくないか、システムに一時的な問題が発生している可能性があります。<br/>
              ブラウザを更新するか、フォルダを選択し直してください。
            </p>
            <pre className="bg-black/30 p-4 rounded text-left text-xs overflow-auto text-danger-300 max-h-40">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-8 btn-primary"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // フォルダハンドル（null = 未選択）
  const [dirHandle, setDirHandle] = useState(null);
  // ローカルデータ（patients, dispensings 配列）
  const [rawData, setRawData] = useState(null);
  // 画面状態
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  // アプリ起動中フラグ（フォルダ選択完了後）
  const [appReady, setAppReady] = useState(false);

  // -----------------------------------------------
  // rawData から派生データを計算
  // -----------------------------------------------
  const patients = rawData ? buildPatients(rawData).filter(p => p.status !== 'archived') : [];
  const archived = rawData ? buildPatients(rawData).filter(p => p.status === 'archived') : [];
  const ganttData = rawData ? buildGanttData(rawData) : { bars: [], reserveMap: {} };

  // -----------------------------------------------
  // 初回ロード：IndexedDB からフォルダハンドルを復元
  // -----------------------------------------------
  useEffect(() => {
    (async () => {
      const handle = await loadDirectoryHandle();
      if (!handle) return;
      try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          // 許可済みなら即起動
          await startApp(handle);
        } else {
          // 許可待ち→フォルダ選択画面を「再開モード」で表示
          setDirHandle(handle);
        }
      } catch {
        // エラー時は通常の選択画面
      }
    })();
  }, []);

  /** フォルダを選択してアプリを起動する */
  const startApp = async (handle) => {
    setLoading(true);
    try {
      const data = await loadData(handle);
      setRawData(data);
      setDirHandle(handle);
      await saveDirectoryHandle(handle);
      setAppReady(true);
    } catch (e) {
      alert('データの読み込みに失敗しました: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // データ書き込みヘルパー
  // -----------------------------------------------
  const persist = useCallback(async (newData) => {
    setRawData(newData);
    await saveData(dirHandle, newData);
  }, [dirHandle]);

  // -----------------------------------------------
  // CRUD 操作
  // -----------------------------------------------

  /** 患者登録 */
  const handleRegister = async (formData) => {
    setLoading(true);
    try {
      const { data: newData, patient } = registerPatient({ ...rawData }, formData);
      await persist(newData);
      return patient;
    } catch (e) {
      alert('登録に失敗しました: ' + e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** 交付記録 */
  const handleDispense = async (patientId, formData) => {
    setLoading(true);
    try {
      const { data: newData } = addDispensing({ ...rawData, dispensings: [...rawData.dispensings] }, patientId, formData);
      await persist(newData);
      return true;
    } catch (e) {
      alert('交付記録に失敗しました: ' + e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** 表示トグル */
  const handleToggleVisible = async (patientId) => {
    try {
      const newData = toggleVisible({ ...rawData, patients: rawData.patients.map(p => ({ ...p })) }, patientId);
      await persist(newData);
    } catch (e) {
      console.error('表示トグルエラー:', e);
    }
  };

  /** アーカイブ */
  const handleArchive = async (patientId) => {
    if (!confirm('この患者を履歴に移動しますか？')) return;
    try {
      const newData = archivePatient({ ...rawData, patients: rawData.patients.map(p => ({ ...p })) }, patientId);
      await persist(newData);
    } catch (e) {
      console.error('アーカイブエラー:', e);
    }
  };

  /** 削除 */
  const handleDelete = async (patientId) => {
    if (!confirm('この患者データを完全に削除しますか？\nこの操作は取り消せません。')) return;
    try {
      const newData = deletePatient({ ...rawData, patients: rawData.patients.map(p => ({ ...p })), dispensings: [...rawData.dispensings] }, patientId);
      await persist(newData);
    } catch (e) {
      console.error('削除エラー:', e);
    }
  };

  /** CSVエクスポート */
  const handleExportCSV = () => {
    if (!rawData) return;
    const csv = buildCSV(rawData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `champix_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // -----------------------------------------------
  // レンダリング
  // -----------------------------------------------

  // フォルダ未選択 or アプリ未起動 → フォルダ選択画面
  if (!appReady) {
    return (
      <FolderSelectScreen
        resumeHandle={dirHandle}
        onStart={startApp}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-900">
      <Header />
      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportCSV={handleExportCSV}
      />
      <main className="flex-1 container mx-auto px-4 py-4 max-w-screen-2xl min-w-0">
        {activeTab === 'overview' && (
          <OverviewTab
            patients={patients}
            ganttData={ganttData}
            onToggleVisible={handleToggleVisible}
            onArchive={handleArchive}
            onDispense={handleDispense}
            loading={loading}
          />
        )}
        {activeTab === 'register' && (
          <RegisterTab
            onRegister={handleRegister}
            loading={loading}
            onSuccess={() => setActiveTab('overview')}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            dirHandle={dirHandle}
            onChangeFolder={async () => {
              try {
                const handle = await window.showDirectoryPicker();
                await startApp(handle);
              } catch (e) {
                if (e.name !== 'AbortError') alert('フォルダの変更に失敗しました: ' + e.message);
              }
            }}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab archived={archived} onDelete={handleDelete} />
        )}
      </main>
      <footer className="bg-surface-800 border-t border-surface-700 py-3 text-center text-xs text-slate-500">
        ChampixFlow v2.0 — チャンピックス服用管理システム
      </footer>
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
