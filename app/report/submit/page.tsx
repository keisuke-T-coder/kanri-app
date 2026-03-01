"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';

// 日付文字列を YYYY-MM-DD に統一する関数
const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

// 今日の日付を取得 (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function SubmitReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const worker = searchParams.get('worker') || "";

  const [todayReports, setTodayReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ★ 安全装置: 担当者が選ばれていない（全員まとめ）場合はブロック
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
        
        // 今日のデータだけを抽出（自動リセット機能）
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

  // 合計金額の計算
  let totalTechFee = 0;
  let totalAmount = 0;

  todayReports.forEach(r => {
    totalTechFee += Number(r.技術料) || 0;
    totalAmount += (Number(r.修理金額) || 0) + (Number(r.販売金額) || 0);
  });

  // ----------------------------------------------------------------
  // エラー画面（担当者が選ばれていない場合）
  // ----------------------------------------------------------------
  if (isInvalidWorker) {
    return (
      <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[24px] shadow-sm max-w-sm w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-[#eaaa43] font-black text-lg tracking-widest mb-2">担当者が未選択です</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
            日報を提出するためには、<br/>個人の名前を選択する必要があります。<br/>「全員まとめ」では送信できません。
          </p>
          <button 
            onClick={() => router.back()} 
            className="w-full bg-[#eaaa43] text-white py-3.5 rounded-xl font-bold tracking-widest active:scale-95 transition-transform"
          >
            戻って担当者を選ぶ
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // ローディング画面
  // ----------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#eaaa43] border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-400 font-bold text-sm tracking-widest">本日のデータを集計中...</p>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // A-5: スクショ特化型 提出ボード（メイン画面）
  // ----------------------------------------------------------------
  // 日付のフォーマット (例: 2026.03.01)
  const d = new Date();
  const displayDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayStr = days[d.getDay()];

  return (
    <div className="min-h-screen bg-[#f8f6f0] p-2 sm:p-3 flex flex-col font-sans text-slate-800 pb-8">
      
      {/* 戻るボタン（スクショの邪魔にならないよう上部に小さく配置） */}
      <div className="flex justify-start mb-2 pl-1">
        <button onClick={() => router.back()} className="text-gray-400 flex items-center text-[11px] font-bold active:scale-95 transition-transform bg-white/50 px-2 py-1 rounded-full">
          <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          メニューに戻る
        </button>
      </div>

      {/* 👑 ヘッダー（リッチなゴールドグラデーション） */}
      <div className="bg-gradient-to-r from-[#eaaa43] to-[#d4952b] rounded-[18px] p-4 shadow-md text-white">
        <div className="flex justify-between items-end mb-2.5">
          <h1 className="text-xs font-black tracking-widest drop-shadow-sm">{displayDate} ({dayStr}) 日報提出</h1>
          <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-md shadow-inner backdrop-blur-sm">
            担当: {worker}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-white/20 pt-2.5 mt-1">
          <div className="text-[11px] font-medium drop-shadow-sm">
            本日の完了件数: <span className="text-xl font-black">{todayReports.length}</span> 件
          </div>
          <div className="text-right">
            <div className="text-[9px] opacity-90 leading-none drop-shadow-sm mb-0.5">本日の売上合計</div>
            <div className="text-[22px] font-black leading-none drop-shadow-md">
              <span className="text-xs mr-0.5 font-bold opacity-80">¥</span>{totalAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 📋 リスト部分（極限までコンパクトに。10〜12件がスクロールなしで収まる） */}
      <div className="flex-1 bg-white rounded-[18px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 mt-2 p-1.5 overflow-hidden flex flex-col relative">
        
        {/* テーブルヘッダー */}
        <div className="flex text-[9px] text-gray-400 font-bold border-b-2 border-[#eaaa43]/20 pb-1.5 px-1 pt-1 mb-0.5">
          <div className="w-9 text-center">時間</div>
          <div className="flex-1 pl-1">訪問先 / 品目・内容</div>
          <div className="w-[60px] text-right pr-1">技術/合計</div>
        </div>

        {/* 0件の場合 */}
        {todayReports.length === 0 && (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 py-10">
            <span className="text-3xl mb-2 block opacity-30">📄</span>
            <p className="text-xs font-bold">本日の提出データはありません</p>
          </div>
        )}

        {/* データ一覧（奇数行と偶数行で色を変えて視認性UP） */}
        {todayReports.map((r, index) => (
          <div key={index} className={`flex items-center py-1.5 border-b border-gray-50 px-1 ${index % 2 === 1 ? 'bg-[#f8f6f0]/50' : ''}`}>
            
            {/* 時間 */}
            <div className="w-9 text-[9px] text-gray-500 text-center font-bold leading-tight">
              {r.開始時間 || "未定"}<br/><span className="text-gray-400">{r.終了時間 || "未定"}</span>
            </div>
            
            {/* 訪問先・内容 */}
            <div className="flex-1 pl-1.5 pr-1 overflow-hidden">
              <div className="text-[11px] font-black text-gray-800 truncate leading-tight">
                {r.訪問先} <span className="text-[8px] text-gray-400 font-normal ml-0.5">{r.エリア}</span>
              </div>
              <div className="text-[9px] text-gray-500 truncate mt-[2px] leading-tight">
                {r.品目} {r.品番 ? `(${r.品番})` : ''} / {r.依頼内容}
              </div>
              
              {/* 赤字伝票バッジ（社長目線で一番目立たせる） */}
              {r.遠隔高速利用 === '有' && r.伝票番号 && (
                <div className="text-[8.5px] text-red-500 font-bold mt-[2px] border border-red-200 bg-red-50 px-1 py-[0.5px] rounded-[3px] inline-block shadow-sm">
                  伝: {r.伝票番号}
                </div>
              )}
            </div>
            
            {/* 金額 */}
            <div className="w-[60px] text-right flex flex-col justify-center pr-0.5">
              <div className="text-[8px] text-gray-400 font-bold leading-tight mb-[1px]">¥{Number(r.技術料).toLocaleString()}</div>
              {/* 修理か販売かで色を分ける */}
              <div className={`text-[11px] font-black leading-tight ${r.作業区分 === '販売' ? 'text-[#d98c77]' : 'text-[#547b97]'}`}>
                ¥{(Number(r.修理金額) + Number(r.販売金額)).toLocaleString()}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* 📸 スクショ＆送信案内（この画面だけは下部の共通ナビゲーションを隠す） */}
      <div className="mt-3 flex flex-col items-center">
        <p className="text-[10px] text-gray-400 font-bold mb-2">
          👆 この画面をスクリーンショットして管理者に送信してください
        </p>
        <button 
          onClick={() => alert("※実際のアプリでは、ここでLINE等を立ち上げる機能などに繋ぎます。まずはスクリーンショットを撮影してください。")}
          className="bg-gray-800 text-white text-[11px] font-bold px-6 py-2.5 rounded-full shadow-md active:scale-95 transition-transform tracking-widest flex items-center"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          送信完了（トップへ戻る）
        </button>
      </div>

    </div>
  );
}

// Next.jsのビルドエラー回避
export default function SubmitReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f6f0] flex justify-center items-center font-bold text-gray-500">読み込み中...</div>}>
      <SubmitReportContent />
    </Suspense>
  );
}
