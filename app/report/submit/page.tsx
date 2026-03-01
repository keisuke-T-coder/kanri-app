"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';

const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 時間フォーマット（「1899-12-29T15:03...」などを綺麗に修正）
function formatTime(timeStr: string) {
  if (!timeStr) return "未定";
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) { }
  return timeStr;
}

function SubmitReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const worker = searchParams.get('worker') || "";

  const [todayReports, setTodayReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ★ 追加: 送信完了ポップアップの状態管理
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const isInvalidWorker = !worker || worker === "add";

  useEffect(() => {
    if (isInvalidWorker) {
      setIsLoading(false);
      return;
    }

    const fetchTodayReports = async () => {
      try {
        const res = await fetch(`${GAS_URL}?worker=${encodeURIComponent(worker)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        const todayStr = getTodayString();
        const filtered = data.filter((r: any) => extractDateForInput(r.日付) === todayStr);
        setTodayReports(filtered);
      } catch (error) {
        console.error("日報データの取得に失敗しました", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayReports();
  }, [worker, isInvalidWorker]);

  let totalTechFee = 0;
  let totalAmount = 0;

  todayReports.forEach(r => {
    totalTechFee += Number(r.技術料) || 0;
    totalAmount += (Number(r.修理金額) || 0) + (Number(r.販売金額) || 0);
  });

  // ★ 追加: 送信完了ボタンを押した時の処理
  const handleComplete = () => {
    setShowCompletionModal(true);
  };

  // ★ 追加: ポップアップの「確認」を押してトップへ戻る処理
  const handleReturnToTop = () => {
    setShowCompletionModal(false);
    router.push('/report');
  };

  if (isInvalidWorker) {
    return (
      <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[24px] shadow-sm max-w-sm w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-[#eaaa43] font-black text-lg tracking-widest mb-2">担当者が未選択です</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
            日報を提出するためには、<br/>個人の名前を選択する必要があります。<br/>「全員まとめ」では送信できません。
          </p>
          <button onClick={() => router.back()} className="w-full bg-[#eaaa43] text-white py-3.5 rounded-xl font-bold tracking-widest active:scale-95 transition-transform">
            戻って担当者を選ぶ
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#eaaa43] border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-400 font-bold text-sm tracking-widest">本日のデータを集計中...</p>
      </div>
    );
  }

  const d = new Date();
  const displayDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayStr = days[d.getDay()];

  return (
    <div className="min-h-screen bg-[#f8f6f0] p-1.5 sm:p-3 flex flex-col font-sans text-slate-800 pb-2">
      
      {/* 戻るボタン */}
      <div className="flex justify-start mb-1.5 pl-1">
        <button onClick={() => router.back()} className="text-gray-400 flex items-center text-[10px] font-bold active:scale-95 transition-transform bg-white/60 px-2 py-0.5 rounded-full">
          <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          メニューに戻る
        </button>
      </div>

      {/* 👑 ★変更: 極限までスリム化したヘッダー */}
      <div className="bg-gradient-to-r from-[#eaaa43] to-[#d4952b] rounded-[14px] p-2.5 shadow-md text-white flex justify-between items-center">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-bold bg-white/20 px-1.5 py-[2px] rounded shadow-inner backdrop-blur-sm">
              担当: {worker}
            </span>
            <span className="text-[10px] font-black tracking-widest drop-shadow-sm">
              {displayDate} ({dayStr})
            </span>
          </div>
          <div className="text-[10px] font-medium drop-shadow-sm leading-none mt-1.5">
            完了件数: <span className="text-[15px] font-black">{todayReports.length}</span> 件
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] opacity-90 leading-none drop-shadow-sm mb-0.5">本日の売上合計</div>
          <div className="text-[18px] font-black leading-none drop-shadow-md">
            <span className="text-[10px] mr-0.5 font-bold opacity-80">¥</span>{totalAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 📋 ★変更: 12件収納を目指す超圧縮・リッチデザインのリスト */}
      <div className="flex-1 bg-white rounded-[14px] shadow-sm border border-gray-100 mt-2 p-1 overflow-hidden flex flex-col relative">
        
        {/* テーブルヘッダー */}
        <div className="flex text-[9px] text-gray-400 font-bold border-b border-gray-100 pb-1 pt-0.5 mb-0.5 px-1">
          <div className="w-[35px] text-center">時間</div>
          <div className="flex-1 pl-1">訪問先 / 内容</div>
          <div className="w-[50px] text-right">技術/計</div>
        </div>

        {todayReports.length === 0 && (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 py-10">
            <span className="text-3xl mb-2 block opacity-30">📄</span>
            <p className="text-xs font-bold">本日の提出データはありません</p>
          </div>
        )}

        {/* データ一覧 */}
        {todayReports.map((r, index) => (
          <div key={index} className="flex items-center py-1 border-b border-gray-50 relative bg-white hover:bg-gray-50">
            
            {/* ★ リッチデザイン: 左端のアクセントカラーバー（修理は青系、販売は赤系） */}
            <div className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full ${r.作業区分 === '販売' ? 'bg-[#d98c77]' : 'bg-[#547b97]'}`}></div>
            
            {/* 時間 */}
            <div className="w-[35px] text-[9px] text-gray-500 text-center font-bold leading-[1.1] pl-1">
              {formatTime(r.開始時間)}<br/>
              <span className="text-gray-400 text-[8px]">{formatTime(r.終了時間)}</span>
            </div>
            
            {/* 内容 */}
            <div className="flex-1 pl-1.5 pr-1 overflow-hidden">
              <div className="flex items-center gap-1 mb-[1px]">
                <span className="text-[11px] font-black text-gray-800 truncate leading-none pt-0.5">{r.訪問先}</span>
                <span className="text-[7.5px] text-gray-400 font-bold border border-gray-200 rounded px-1 leading-none py-[2px] whitespace-nowrap bg-gray-50">
                  {/* 「エリア」という文字を削って幅を節約 */}
                  {r.エリア?.replace('エリア', '') || ''}
                </span>
              </div>
              <div className="text-[8.5px] text-gray-500 truncate leading-none mt-[2px]">
                {r.品目} {r.品番 ? `(${r.品番})` : ''} / {r.依頼内容}
              </div>
              
              {/* 伝票番号 */}
              {r.遠隔高速利用 === '有' && r.伝票番号 && (
                <div className="text-[7.5px] text-white font-bold mt-[3px] bg-red-500 px-1 py-[1.5px] rounded-[2px] inline-block shadow-sm leading-none">
                  伝: {r.伝票番号}
                </div>
              )}
            </div>
            
            {/* 金額 */}
            <div className="w-[50px] text-right flex flex-col justify-center pr-1">
              <div className="text-[8px] text-gray-400 font-bold leading-[1.1] mb-[1px]">¥{Number(r.技術料).toLocaleString()}</div>
              <div className={`text-[10px] font-black leading-[1.1] ${r.作業区分 === '販売' ? 'text-[#d98c77]' : 'text-[#547b97]'}`}>
                ¥{(Number(r.修理金額) + Number(r.販売金額)).toLocaleString()}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* 📸 スクショ案内 ＆ ★変更: ポップアップを呼び出す送信ボタン */}
      <div className="mt-2 flex flex-col items-center">
        <p className="text-[9px] text-gray-400 font-bold mb-1.5">
          👆 この画面をスクリーンショットして管理者に送信してください
        </p>
        <button 
          onClick={handleComplete}
          className="bg-gray-800 text-white text-[11px] font-bold px-6 py-2 rounded-full shadow-md active:scale-95 transition-transform tracking-widest flex items-center"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          送信完了（トップへ戻る）
        </button>
      </div>

      {/* =========================================
          ★ 追加: 「お疲れ様でした！」ポップアップ
          ========================================= */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-8 flex flex-col items-center text-center shadow-2xl transform transition-all scale-100">
            
            {/* アニメーション付きのアイコン */}
            <div className="text-6xl mb-4 animate-bounce">
              🎉
            </div>
            
            <h3 className="text-[#eaaa43] font-black text-xl mb-3 tracking-widest leading-tight">
              本日の業務、<br/>お疲れ様でした！
            </h3>
            
            <p className="text-sm text-gray-600 font-medium leading-relaxed mb-8">
              日報の提出が完了しました。<br/>明日もよろしくお願いいたします。
            </p>
            
            <button 
              onClick={handleReturnToTop}
              className="w-full bg-[#eaaa43] text-white py-3.5 rounded-xl font-bold tracking-widest active:scale-95 transition-transform shadow-md"
            >
              確認してトップへ戻る
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

export default function SubmitReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f6f0] flex justify-center items-center font-bold text-gray-500">読み込み中...</div>}>
      <SubmitReportContent />
    </Suspense>
  );
}
