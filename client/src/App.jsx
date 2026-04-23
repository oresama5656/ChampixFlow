import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import TabNav from './components/TabNav.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import RegisterTab from './components/RegisterTab.jsx';
import SettingsTab from './components/SettingsTab.jsx';
import HistoryTab from './components/HistoryTab.jsx';

// アクティブなタブの定義
const TABS = ['overview', 'register', 'settings', 'history'];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  // アクティブ患者リスト（archived以外）
  const [patients, setPatients] = useState([]);
  // 履歴（archived）
  const [archived, setArchived] = useState([]);
  // ガントチャートデータ（バー + 在庫集計）
  const [ganttData, setGanttData] = useState({ bars: [], reserveMap: {} });
  const [loading, setLoading] = useState(false);

  // 患者データの再取得
  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data.filter(p => p.status !== 'archived'));
      setArchived(data.filter(p => p.status === 'archived'));
    } catch (e) {
      console.error('患者データ取得エラー:', e);
    }
  }, []);

  // ガントチャートデータの再取得
  const fetchGantt = useCallback(async () => {
    try {
      const res = await fetch('/api/gantt');
      const data = await res.json();
      setGanttData(data);
    } catch (e) {
      console.error('ガントデータ取得エラー:', e);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    fetchPatients();
    fetchGantt();
  }, [fetchPatients, fetchGantt]);

  // 患者登録
  const handleRegister = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`エラー: ${err.error}`);
        return null;
      }
      const patient = await res.json();
      await fetchPatients();
      await fetchGantt();
      return patient;
    } catch (e) {
      alert('登録に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 交付（来局）記録
  const handleDispense = async (patientId, formData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/dispensings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`エラー: ${err.error}`);
        return false;
      }
      await fetchPatients();
      await fetchGantt();
      return true;
    } catch (e) {
      alert('交付記録に失敗しました');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 患者の表示/非表示トグル
  const handleToggleVisible = async (patientId) => {
    try {
      await fetch(`/api/patients/${patientId}/toggle-visible`, { method: 'PATCH' });
      await fetchPatients();
      await fetchGantt();
    } catch (e) {
      console.error('表示トグルエラー:', e);
    }
  };

  // 患者をアーカイブ（離脱確定/完了）
  const handleArchive = async (patientId) => {
    if (!confirm('この患者を履歴に移動しますか？')) return;
    try {
      await fetch(`/api/patients/${patientId}/archive`, { method: 'PATCH' });
      await fetchPatients();
      await fetchGantt();
    } catch (e) {
      console.error('アーカイブエラー:', e);
    }
  };

  // CSVエクスポート
  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/export/csv');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `champix_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('CSVエクスポートに失敗しました');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-900">
      <Header />
      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportCSV={handleExportCSV}
      />
      <main className="flex-1 container mx-auto px-4 py-4 max-w-screen-2xl">
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
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'history' && (
          <HistoryTab archived={archived} onRefresh={fetchPatients} />
        )}
      </main>
      <footer className="bg-surface-800 border-t border-surface-700 py-3 text-center text-xs text-slate-500">
        ChampixFlow v1.0 — チャンピックス服用管理システム
      </footer>
    </div>
  );
}

export default App;
