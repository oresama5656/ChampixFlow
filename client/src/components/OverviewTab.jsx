import React from 'react';
import PatientList from './PatientList.jsx';
import GanttCalendar from './GanttCalendar.jsx';

/**
 * OverviewTab – メイン画面（左:患者リスト / 右:ガントカレンダー）
 */
function OverviewTab({ patients, ganttData, onToggleVisible, onArchive, onDispense, loading }) {
  return (
    <div
      className="grid gap-4 h-full min-w-0"
      style={{ gridTemplateColumns: '18rem minmax(0, 1fr)', minHeight: 'calc(100vh - 160px)' }}
    >
      {/* 左ペイン：患者リスト */}
      <PatientList
        patients={patients}
        onToggleVisible={onToggleVisible}
        onArchive={onArchive}
        onDispenseSuccess={() => {}} // データは App.jsx で一元管理
      />

      {/* 右ペイン：ガントチャートカレンダー */}
      <GanttCalendar
        patients={patients}
        ganttData={ganttData}
      />
    </div>
  );
}

export default OverviewTab;
