import React, { useMemo, useState } from 'react';

/**
 * 日付を YYYY-MM-DD 文字列から Date オブジェクトに変換
 */
function parseDate(str) {
  return new Date(str + 'T00:00:00');
}

/**
 * Date を YYYY-MM-DD 文字列に変換
 */
function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

/**
 * その月のすべての日付の配列を生成
 */
function getDaysInMonth(year, month) {
  const days = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(toDateStr(new Date(d)));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ステータスカラーマップ
const STATUS_COLOR = {
  active:          'bg-brand-500',
  dropout_concern: 'bg-danger-500',
  completed:       'bg-success-500',
};

/**
 * GanttCalendar – 右ペイン
 * - 1ヶ月単位ページ切り替え
 * - 患者ごとの実線バー（交付済み）＋透明バー（次回予定）
 * - 最下部に在庫集計ヒートマップ（1.0mg錠必要量）
 */
function GanttCalendar({ patients, ganttData }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // 前月・次月移動
  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // 表示する日付一覧
  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  // バーの表示を計算
  const barsPerPatient = useMemo(() => {
    if (!ganttData?.bars) return {};
    const map = {};
    ganttData.bars.forEach(bar => {
      if (!map[bar.patient_id]) map[bar.patient_id] = [];
      map[bar.patient_id].push(bar);
    });
    return map;
  }, [ganttData]);

  // 在庫ヒートマップの最大値（正規化用）
  const reserveMap = ganttData?.reserveMap || {};
  const maxReserve = useMemo(() => {
    const vals = days.map(d => reserveMap[d] || 0);
    return Math.max(...vals, 1);
  }, [days, reserveMap]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  // 表示する患者（表示フラグONのもの）
  const visiblePatients = patients.filter(p => p.visible !== 0 && p.status !== 'archived');

  // セル幅：日数が多いほど小さく
  const cellW = Math.floor(Math.max(22, Math.min(36, 900 / days.length)));

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      {/* カレンダーヘッダー */}
      <div className="px-4 py-3 border-b border-surface-700 flex items-center gap-3">
        <button onClick={goToPrev} className="btn-ghost p-1.5" title="前月">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-slate-200 flex-1 text-center">{monthLabel}</h2>
        <button onClick={goToNext} className="btn-ghost p-1.5" title="次月">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button onClick={goToToday} className="text-xs text-brand-400 hover:text-brand-300 transition-colors cursor-pointer px-2 py-1 rounded border border-brand-500/30 hover:border-brand-400">
          今月
        </button>
      </div>

      {/* ガントチャート本体（横スクロール可） */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="border-collapse min-w-full" style={{ tableLayout: 'fixed' }}>
          {/* 日付ヘッダー行 */}
          <thead>
            <tr>
              {/* 患者名列 */}
              <th className="sticky left-0 z-10 bg-surface-800 text-left px-3 py-2 text-xs font-medium text-slate-400 border-b border-r border-surface-700 w-32 min-w-[8rem]">
                患者名
              </th>
              {days.map(day => {
                const d = parseDate(day);
                const isToday = day === toDateStr(today);
                const isSun = d.getDay() === 0;
                const isSat = d.getDay() === 6;
                return (
                  <th
                    key={day}
                    title={day}
                    style={{ width: cellW, minWidth: cellW }}
                    className={`
                      py-1 text-center text-[10px] font-medium border-b border-r border-surface-700
                      ${isToday ? 'bg-brand-500/30 text-brand-300' : ''}
                      ${isSun && !isToday ? 'text-danger-400' : ''}
                      ${isSat && !isToday ? 'text-brand-400' : ''}
                      ${!isToday && !isSun && !isSat ? 'text-slate-500' : ''}
                    `}
                  >
                    <div>{d.getDate()}</div>
                    <div className="text-[8px] opacity-70">
                      {['日','月','火','水','木','金','土'][d.getDay()]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* 患者ごとのバー行 */}
            {visiblePatients.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} className="px-4 py-8 text-center text-slate-500 text-sm">
                  表示中の患者がいません
                </td>
              </tr>
            )}
            {visiblePatients.map(patient => {
              const bars = barsPerPatient[patient.id] || [];
              return (
                <tr key={patient.id} className="hover:bg-surface-700/30 transition-colors">
                  {/* 患者名（固定列） */}
                  <td className="sticky left-0 z-10 bg-surface-800 px-3 py-1.5 text-xs text-slate-300 border-r border-b border-surface-700 truncate w-32 min-w-[8rem]">
                    {patient.name}
                  </td>
                  {/* 日ごとのセル */}
                  {days.map(day => {
                    // この日にかかるバーを探す
                    const solidBar  = bars.find(b => b.type === 'solid' && b.start <= day && day < b.end);
                    const ghostBar  = bars.find(b => b.type === 'ghost' && b.start <= day && day < b.end);
                    const isToday = day === toDateStr(today);

                    return (
                      <td
                        key={day}
                        style={{ width: cellW, minWidth: cellW }}
                        className={`
                          relative h-8 border-r border-b border-surface-700/50 p-0
                          ${isToday ? 'bg-brand-500/10' : ''}
                        `}
                      >
                        {solidBar && (
                          <div
                            className={`absolute inset-x-0.5 inset-y-1 rounded text-[9px] flex items-center px-0.5 truncate
                              font-medium text-white shadow-sm cursor-pointer
                              ${STATUS_COLOR[patient.status] || 'bg-brand-500'}
                            `}
                            title={`${patient.name}（交付済み）`}
                          >
                            {solidBar.start === day && (
                              <span className="truncate leading-none">{patient.name}</span>
                            )}
                          </div>
                        )}
                        {!solidBar && ghostBar && (
                          <div
                            className={`absolute inset-x-0.5 inset-y-1 rounded border-2 border-dashed
                              text-[9px] flex items-center px-0.5 truncate cursor-pointer
                              border-brand-400/60 text-brand-400/60
                            `}
                            title={`${patient.name}（次回予定）`}
                          >
                            {ghostBar.start === day && (
                              <span className="truncate leading-none">{patient.name}</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* 在庫集計ヒートマップ行 */}
            <tr className="bg-surface-800/50">
              <td className="sticky left-0 z-10 bg-surface-800 px-3 py-1.5 text-[10px] font-semibold text-slate-400 border-r border-t-2 border-surface-600 w-32 min-w-[8rem]">
                1.0mg予約
              </td>
              {days.map(day => {
                const count = reserveMap[day] || 0;
                const intensity = count / maxReserve; // 0〜1
                // 在庫が多いほど濃い色
                const bg = count === 0
                  ? 'bg-transparent'
                  : intensity > 0.7 ? 'bg-brand-500'
                  : intensity > 0.4 ? 'bg-brand-500/60'
                  : 'bg-brand-500/30';

                return (
                  <td
                    key={day}
                    style={{ width: cellW, minWidth: cellW }}
                    className={`border-r border-t-2 border-surface-600 border-b border-surface-700/50 h-8 p-0.5`}
                    title={count > 0 ? `${day}: 1.0mg×${count}錠予約` : ''}
                  >
                    {count > 0 && (
                      <div className={`w-full h-full rounded-sm ${bg} flex items-center justify-center`}>
                        <span className="text-[9px] text-white font-bold leading-none">{count}</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="px-4 py-2 border-t border-surface-700 flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded bg-brand-500 inline-block" />交付済み
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded border-2 border-dashed border-brand-400/60 inline-block" />次回予定
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded bg-danger-500 inline-block" />離脱懸念
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded bg-success-500 inline-block" />完了
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="w-3 h-2 rounded bg-brand-500/60 inline-block" />在庫集計（1.0mg錠）
        </span>
      </div>
    </div>
  );
}

export default GanttCalendar;
