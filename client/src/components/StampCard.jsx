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
 * 患者データと交付履歴に基づいて、指定された週の情報を計算する
 */
function getWeekInfo(patient, weekNum) {
  const dispensings = patient.dispensings || [];
  
  // この週(weekNum)以前で、最も近い「週番号」を持つ交付記録を探す
  const relevantDisp = [...dispensings]
    .filter(d => d.week <= weekNum)
    .sort((a, b) => b.week - a.week)[0];

  // 交付記録があればそれを起点にし、なければ患者の開始日を起点にする
  const baseDateStr = relevantDisp ? relevantDisp.dispense_date : patient.start_date;
  const baseWeek = relevantDisp ? relevantDisp.week : 1;

  const start = new Date(baseDateStr + 'T00:00:00');
  const weekStart = new Date(start);
  // 起点からの差分週数だけ加算
  weekStart.setDate(start.getDate() + (weekNum - baseWeek) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // その週の最初の日の用量を特定
  const dayOffset = (weekNum - 1) * 7 + 1; 
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
        maxWidth: printId ? 'none' : '700px', // 印刷時は制限を完全に解除
        margin: '0 auto', 
        fontFamily: 'Inter, sans-serif',
        minHeight: printId ? '148.5mm' : 'auto' // 印刷時はA5の高さを確保
      }}
    >
      {/* ===== 上部: ヘッダー (Modern Gradient) ===== */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 text-white px-8 py-6 flex items-start justify-between shadow-inner">
        <div className="space-y-1">
          <p className="text-[10px] opacity-80 font-bold tracking-[0.2em] uppercase">お薬服用カレンダー</p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {patient.name} <span className="text-indigo-200 font-medium">様</span>
          </h2>
          <div className="flex gap-4 mt-2">
            <p className="text-[11px] opacity-90 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              開始日: <span className="font-semibold">{patient.start_date}</span>
            </p>
            <p className="text-[11px] opacity-90 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-indigo-300"></span>
              終了予定: <span className="font-semibold">{treatmentEndStr}</span>
            </p>
          </div>
        </div>
        <div className="text-right bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg">
          <div className="flex items-baseline justify-end gap-1 text-white">
            <span className="text-4xl font-black tracking-tighter tabular-nums">{currentWeek + 1}</span>
            <span className="text-lg font-bold opacity-60">/</span>
            <span className="text-xl font-bold opacity-80">12</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mt-1">現在の進捗</p>
        </div>
      </div>

      {/* ===== 中央: スタンプエリア (Modern Cards) ===== */}
      <div className="px-8 py-6 flex-1 flex flex-col min-h-0 bg-slate-50/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
            <span className="w-6 h-[1px] bg-slate-300"></span>
            週ごとの記録
            <span className="w-12 h-[1px] bg-slate-300"></span>
          </h3>
          <div className="flex gap-3">
             <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-400"></span> 完了</span>
             <span className="text-[10px] text-slate-500 flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-indigo-400"></span> 進行中</span>
          </div>
        </div>
        
        <div className="grid grid-cols-6 gap-4 flex-1">
          {Array.from({ length: 12 }, (_, i) => {
            const weekNum = i + 1;
            const info = getWeekInfo(patient, weekNum);
            const isDone = i < currentWeek;
            const isCurrent = i === currentWeek;
            
            return (
              <div 
                key={weekNum}
                className={`
                  relative rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center border-2
                  ${isDone 
                    ? 'bg-emerald-50/60 border-emerald-100' 
                    : isCurrent 
                      ? 'bg-white border-indigo-400 shadow-xl scale-[1.02] z-10' 
                      : 'bg-white/80 border-slate-100 shadow-sm'}
                `}
              >
                <span className={`text-[12px] font-black mb-1 ${isDone ? 'text-emerald-600' : isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                  第{weekNum}週
                </span>
                <span className="text-[10px] font-bold text-slate-500">{info.weekStart}</span>
                
                <div className="relative stamp-container w-full min-h-[2rem] flex items-center justify-center mt-1">
                  {isDone && (
                    <div className="stamp-check-overlay text-emerald-500 text-3xl drop-shadow-sm">✓</div>
                  )}
                </div>

                {isCurrent && (
                  <div className="absolute -bottom-2 px-3 py-1 bg-indigo-500 text-white text-[9px] font-black rounded-full shadow-md animate-pulse">
                    今ここ
                  </div>
                )}
                
                {/* 装飾用のドット */}
                <div className="absolute top-2 right-2 flex gap-0.5">
                  <div className={`w-1 h-1 rounded-full ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 下部: 薬局情報 (Premium Footer) ===== */}
      <div className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[12px] font-bold text-slate-700 mb-1 flex items-center gap-2">
            <span className="p-1 bg-amber-100 rounded-lg text-sm">💡</span>
            アドバイス
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-lg">
            {pharmacyTip}
          </p>
        </div>
        <div className="text-right border-l border-slate-100 pl-8">
          <p className="text-[14px] font-black text-slate-800 tracking-tight">{pharmacyName}</p>
          <p className="text-[11px] text-slate-400 font-bold font-mono mt-0.5">☎ {pharmacyTel}</p>
        </div>
      </div>
    </div>
  );
}

export default StampCard;
