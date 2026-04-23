import React from 'react';

// 週替わりメッセージ（第1〜第12週）
const WEEKLY_MESSAGES = [
  '禁煙開始おめでとうございます！最初の1週間が一番大切です。',
  '1週間達成！ニコチンが体から抜け始めています。',
  '3週間で多くの方が楽になります。もう少しです！',
  '味覚や嗅覚が戻ってきていませんか？食事が美味しく感じられるはずです。',
  '1ヶ月達成！タバコ代がだいぶ節約できましたね。',
  '肺の機能が改善し始めています。息切れが減った方も多いです。',
  '7週間目！禁煙に成功した方の多くがこのラインを超えています。',
  'タバコ1箱500円とすると、ここまでで約10,000円の節約です！',
  '残り1ヶ月！体調の変化を感じてもらえると嬉しいです。',
  '10週間目に入りました。ゴールはもうすぐです！',
  '残り2週間！ほぼ完走です。この調子で！',
  '第12週完了！禁煙達成おめでとうございます！これからも続けていきましょう。',
];

/**
 * 服用開始日から指定された週の情報を計算する
 */
function getWeekInfo(startDate, weekNum) {
  const start = new Date(startDate + 'T00:00:00');
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // その週の最初の日の用量を特定
  const dayOffset = (weekNum - 1) * 7 + 1; // Day番号（1始まり）
  let dose = '1.0mg × 2回/日';
  if (dayOffset <= 3) dose = '0.5mg × 1回/日';
  else if (dayOffset <= 7) dose = '0.5mg × 2回/日';

  return {
    weekStart: weekStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    weekEnd:   weekEnd.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    dose,
  };
}

/**
 * StampCard – A5横向きの患者向けスタンプカード
 * 画面上は縮小表示、印刷時はA5フルサイズ
 */
function StampCard({ patient, overrideWeek, printId = "stamp-card-print" }) {
  const settings = JSON.parse(localStorage.getItem('champixSettings') || '{}');
  const pharmacyName = settings.name || '薬局名';
  const pharmacyTel  = settings.tel  || '000-0000-0000';
  const pharmacyTip  = settings.tip  || '吸いたくなった時は、深呼吸を10回してみてください。冷たい水を飲むのも効果的です。';

  // 現在の経過週数を計算（0〜11）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(patient.start_date + 'T00:00:00');
  const elapsedDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  
  let currentWeek;
  if (typeof overrideWeek === 'number' && !isNaN(overrideWeek)) {
    // フォームで入力された週を優先（1-indexed なので -1）
    currentWeek = Math.max(0, Math.min(11, overrideWeek - 1));
  } else if (patient.latest_week) {
    // 保存済みの最新の週の記録があればそれを利用
    currentWeek = Math.max(0, Math.min(11, patient.latest_week - 1));
  } else {
    // なければ日数から計算
    currentWeek = Math.min(Math.floor(elapsedDays / 7), 11); // 0-indexed
  }

  // 最終週（禁煙達成予定日）
  const treatmentEnd = new Date(start);
  treatmentEnd.setDate(start.getDate() + 84);
  const treatmentEndStr = treatmentEnd.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div
      id={printId}
      className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-xl print:shadow-none print:rounded-none"
      style={{ 
        width: '100%', 
        maxWidth: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches ? 'none' : '700px',
        margin: '0 auto', 
        fontFamily: 'Inter, sans-serif' 
      }}
    >
      {/* ===== 上部: ヘッダー ===== */}
      <div className="bg-indigo-600 text-white px-6 py-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 mb-0.5">チャンピックス服用スケジュール</p>
          <h1 className="text-xl font-bold tracking-tight">{patient.name} 様</h1>
          <div className="flex gap-4 mt-1 text-xs opacity-90">
            <span>開始日: {patient.start_date}</span>
            <span>達成予定: {treatmentEndStr}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{currentWeek + 1} / 12</p>
          <p className="text-xs opacity-80">週目</p>
        </div>
      </div>

      {/* ===== 中央: 12マスのスタンプエリア ===== */}
      <div className="px-5 py-4 flex-1 flex flex-col min-h-0">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">服用スケジュール</p>
        <div className="grid grid-cols-6 gap-1.5 flex-1">
          {Array.from({ length: 12 }, (_, i) => {
            const weekNum = i + 1;
            const info = getWeekInfo(patient.start_date, weekNum);
            const isDone = i < currentWeek;
            const isCurrent = i === currentWeek;

            return (
              <div
                key={weekNum}
                className={`
                  rounded-lg border-2 p-1.5 text-center text-[9px]
                  ${isDone ? 'bg-emerald-50 border-emerald-400' : ''}
                  ${isCurrent ? 'bg-indigo-50 border-indigo-500 shadow-sm' : ''}
                  ${!isDone && !isCurrent ? 'bg-gray-50 border-gray-200' : ''}
                `}
              >
                <p className={`font-bold text-[10px] ${isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                  第{weekNum}週
                </p>
                <p className="text-gray-500 leading-tight mt-0.5">{info.weekStart}</p>
                <div className="stamp-container">
                  <p className="mt-1 font-medium text-gray-700">
                    {weekNum <= 1 ? '0.5mg' : weekNum <= 2 ? '0.5mg' : '1.0mg'}
                  </p>
                  {isDone && (
                    <span className="stamp-check-overlay text-emerald-600">✓</span>
                  )}
                  {isCurrent && (
                    <span className="text-indigo-600 text-[8px] absolute -bottom-1 w-full text-center font-bold">今ここ</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 下部: 薬局情報 ===== */}
      <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">吸いたくなったら</p>
          <p className="text-[11px] text-gray-700 leading-relaxed">{pharmacyTip}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-gray-700">{pharmacyName}</p>
          <p className="text-[10px] text-gray-500">☎ {pharmacyTel}</p>
        </div>
      </div>
    </div>
  );
}

export default StampCard;
