import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// ステータス別のカラークラス (Tailwind)
// FullCalendarのイベント要素に適用するクラス名
const STATUS_EVENT_CLASS = {
  active:          '!bg-brand-500 !border-brand-500 !text-white',
  dropout_concern: '!bg-danger-500 !border-danger-500 !text-white',
  completed:       '!bg-success-500 !border-success-500 !text-white',
};

/**
 * 1か月単位のブロックカレンダー (FullCalendar使用)
 */
function GanttCalendar({ patients, ganttData }) {
  // 表示する患者
  const visiblePatients = patients.filter(p => p.visible !== 0 && p.status !== 'archived');
  const visibleIds = visiblePatients.map(p => p.id);

  // FullCalendar に渡すイベント配列の生成
  const events = useMemo(() => {
    if (!ganttData?.bars) return [];
    
    // id -> patient マップ
    const patientMap = {};
    visiblePatients.forEach(p => {
      patientMap[p.id] = p;
    });

    const out = [];
    ganttData.bars.forEach(bar => {
      if (!visibleIds.includes(bar.patient_id)) return;
      const p = patientMap[bar.patient_id];
      if (!p) return;

      const isGhost = bar.type === 'ghost';
      
      out.push({
        id: `${bar.patient_id}-${bar.start}-${bar.type}`,
        title: p.name,
        start: bar.start,
        // FullCalendarのendは排他的なのでそのまま使用可（14日分なら startDate + 14days）
        end: bar.end,
        allDay: true,
        extendedProps: {
          isGhost,
          status: p.status
        }
      });
    });
    return out;
  }, [ganttData, visiblePatients, visibleIds]);

  // 日付枠のレンダラー（シンプルに日付のみ表示）
  const renderDayCell = (arg) => {
    return (
      <div className="w-full h-full p-1 min-h-[80px]">
        {/* 日付番号 */}
        <div className={`text-right text-xs ${arg.isToday ? 'text-brand-500 font-bold' : 'text-slate-500'}`}>
          {arg.dayNumberText.replace('日', '')}
        </div>
      </div>
    );
  };

  // バー（イベント）のスタイル適用
  const handleEventClassNames = (arg) => {
    const { isGhost, status } = arg.event.extendedProps;
    if (isGhost) {
      return [
        '!bg-transparent',
        '!border-2',
        '!border-dashed',
        '!border-brand-400/60',
        '!text-brand-400',
        'rounded-sm',
        'font-bold',
        'text-xs'
      ];
    } else {
      const colorClass = STATUS_EVENT_CLASS[status] || STATUS_EVENT_CLASS.active;
      return [
        ...colorClass.split(' '),
        'rounded-sm',
        'font-bold',
        'text-xs'
      ];
    }
  };

  return (
    <div className="card flex flex-col h-full overflow-hidden min-w-0 bg-white text-slate-800">
      {/* 凡例 */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 bg-gray-50">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-brand-500 inline-block" /> 交付済み（進行中）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded border-2 border-dashed border-brand-400/60 inline-block" /> 次回予定
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-danger-500 inline-block" /> 離脱懸念
        </span>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClassNames={handleEventClassNames}
          dayCellContent={renderDayCell}
          height="100%"
          locale="ja"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          buttonText={{
            today: '今日'
          }}
          dayMaxEvents={4}
          // Tailwindと競合しないよう標準のborderを少し調整
          firstDay={0} /* 0 = Sunday */
        />
      </div>

      <style>{`
        /* FullCalendar の上書きスタイル */
        .fc {
          --fc-border-color: #e2e8f0;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #f8fafc;
          --fc-button-bg-color: #334155;
          --fc-button-border-color: #334155;
          --fc-button-hover-bg-color: #1e293b;
          --fc-button-hover-border-color: #1e293b;
          --fc-button-active-bg-color: #0f172a;
          --fc-button-active-border-color: #0f172a;
        }
        .fc-theme-standard th {
          border: 1px solid var(--fc-border-color);
          padding: 8px 0;
          font-weight: 500;
          color: #475569;
          background: var(--fc-neutral-bg-color);
        }
        .fc-theme-standard td {
          border: 1px solid var(--fc-border-color);
        }
        .fc-day-today {
          background-color: #f0fdf4 !important; /* 今日を少しハイライト */
        }
        .fc-daygrid-day-frame {
          min-height: 80px;
        }
        .fc-event {
          cursor: pointer;
          padding: 2px 4px;
          margin-bottom: 2px;
        }
        .fc-daygrid-day-top {
          display: none; /* デフォルトの日付番号を非表示（カスタムレンダラーで表示するため） */
        }
      `}</style>
    </div>
  );
}

export default GanttCalendar;
