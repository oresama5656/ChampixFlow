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
        title: isGhost ? `${p.name}（予定）` : p.name,
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
        <div className={`text-right text-xs ${arg.isToday ? 'text-brand-400 font-bold' : 'text-slate-400'}`}>
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
        '!text-brand-700',
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
  
  // バー（イベント）の中身の描画
  const renderEventContent = (arg) => {
    const { isGhost } = arg.event.extendedProps;
    // ghost（点線）の場合は背景が透過しているので、文字色を明るめのブランドカラーにする
    // solid（実線）の場合は背景が濃い色なので、引き続き白文字にする
    const textColor = isGhost ? '#60a5fa' : '#ffffff';
    return (
      <div className="fc-event-main-frame px-1 truncate w-full" style={{ color: textColor }}>
        <span className="fc-event-title font-bold text-[10px] sm:text-xs">
          {arg.event.title}
        </span>
      </div>
    );
  };

  return (
    <div className="card flex flex-col h-full overflow-hidden min-w-0 bg-surface-800 text-slate-100 border-surface-700">
      {/* 凡例 */}
      <div className="px-4 py-3 border-b border-surface-700 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400 bg-surface-900/50">
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
          eventOrder="title"
          events={events}
          eventClassNames={handleEventClassNames}
          eventContent={renderEventContent}
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
          --fc-border-color: #334155; /* slate-700 */
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: #0f172a; /* slate-900 */
          --fc-list-event-hover-bg-color: #1e293b;
          
          --fc-button-bg-color: #334155;
          --fc-button-border-color: #475569;
          --fc-button-hover-bg-color: #1e293b;
          --fc-button-hover-border-color: #64748b;
          --fc-button-active-bg-color: #0f172a;
          --fc-button-active-border-color: #1e293b;
        }
        .fc-theme-standard th {
          border: 1px solid var(--fc-border-color);
          padding: 8px 0;
          font-weight: 500;
          color: #94a3b8; /* slate-400 */
          background: var(--fc-neutral-bg-color);
        }
        .fc-theme-standard td {
          border: 1px solid var(--fc-border-color);
        }
        .fc-day-today {
          background-color: rgba(59, 130, 246, 0.1) !important; /* 今日を少し青くハイライト */
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
        .fc-toolbar-title {
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          color: #f1f5f9 !important;
        }
        .fc-button-primary:disabled {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

export default GanttCalendar;
