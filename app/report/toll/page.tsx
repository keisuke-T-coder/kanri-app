"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const GAS_URL = '/api/gas';

const assignees = ["佐藤", "田中", "南", "新田", "徳重", "前田"];

// 時間・日付の整形関数
const formatTimeForDisplay = (timeStr: string) => {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  return timeStr;
};

const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

const getShortDateString = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
};

function TollList() {
  const searchParams = useSearchParams();
  const initialWorker = searchParams.get('worker') || ""; 

  const [currentWorker, setCurrentWorker] = useState(initialWorker);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [allData, setAllData] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // 詳細フィルタリングは後ほどクライアントサイドで行うため、一旦全データを取得（worker指定なし）
      const res = await fetch(`${GAS_URL}?worker=${encodeURIComponent(currentWorker)}`);
      if (!res.ok) throw new Error("通信エラー");
      const json = await res.json();
      setAllData(Array.isArray(json) ? json : []);
    } catch (err) {
      setError("データの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 高速・遠隔データの抽出と並び替え (英語キーに対応)
  const filteredData = allData.filter(item => {
    if (item.remote_highway_fee !== '有') return false; 
    if (!item.date) return false;
    
    const cleanDate = extractDateForInput(item.date);
    if (!cleanDate) return false;
    
    const itemMonth = cleanDate.substring(0, 7);
    return itemMonth === selectedMonth;
  }).sort((a, b) => {
    // 担当者名で並び替え（グループ化）
    if (currentWorker === "") {
      const workerA = a.assignee || "";
      const workerB = b.assignee || "";
      if (workerA !== workerB) {
        return workerA.localeCompare(workerB, 'ja');
      }
    }

    // 次に新しい日付が上に来るようにソート
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    
    // 同じ日付・担当者なら時間が早い順に並べる
    if (!a.start_time || !b.start_time) return 0;
    return a.start_time > b.start_time ? 1 : -1; 
  });

  const totalCount = filteredData.length;
  const selectedMonthDisplay = selectedMonth.replace('-', '年') + '月';

  return (
    <div className="flex flex-col items-center w-full relative">
      
      {/* 画面上部エリア（ブルー基調で統一） */}
      <div className="w-[92%] max-w-md mt-6 mb-4">
        
        {/* ヘッダー */}
        <div className="bg-[#1e40af] rounded-[14px] py-4 px-4 shadow-md flex items-center justify-between mb-4 relative overflow-hidden">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>

          <Link href="/report" className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform relative z-10">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-sm tracking-wider">戻る</span>
          </Link>
          <h1 className="text-white font-bold tracking-widest text-[17px] flex-1 text-center relative z-10 whitespace-nowrap">高速・遠隔地チェック</h1>
          <div className="w-16"></div>
        </div>

        {/* 担当者タブ */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 w-full snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            onClick={() => setCurrentWorker("")} 
            className={`snap-start shrink-0 px-5 py-2 rounded-full text-[13px] font-bold transition-all border ${currentWorker === "" ? "bg-[#1e40af] text-white border-[#1e40af] shadow-md scale-105" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          >
            全員まとめ
          </button>
          {assignees.map(a => (
            <button 
              key={a} 
              onClick={() => setCurrentWorker(a)} 
              className={`snap-start shrink-0 px-5 py-2 rounded-full text-[13px] font-bold transition-all border ${currentWorker === a ? "bg-[#1e40af] text-white border-[#1e40af] shadow-md scale-105" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* 月選択ピッカー */}
        <div className="bg-white rounded-[14px] p-3 shadow-sm flex justify-between items-center border border-gray-100">
          <span className="text-sm font-bold text-gray-500 ml-1">表示月を選択</span>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-sm font-bold text-blue-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
          />
        </div>
      </div>

      {/* サマリーカード */}
      <div className="w-[92%] max-w-md bg-white rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-4 mb-4 border-l-4 border-[#1e40af]">
        <div className="flex justify-between items-center">
          <div className="text-gray-600 font-bold text-sm">🚙 {selectedMonthDisplay} の利用状況</div>
          <div className="text-[#1e40af] font-black text-2xl">{totalCount}<span className="text-xs ml-1 font-bold text-gray-400">件</span></div>
        </div>
      </div>

      {/* 伝票リスト */}
      <div className="w-[92%] max-w-md flex flex-col gap-3">
        {isLoading ? (
          <div className="text-center py-10 text-blue-400 font-bold text-sm animate-pulse">利用データを検索中...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-400 font-bold text-sm">{error}</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[16px] shadow-sm border border-dashed border-gray-200">
            <span className="text-4xl mb-3 block opacity-50">🛣️</span>
            <p className="text-gray-400 font-bold text-sm">{selectedMonthDisplay} の高速・遠隔利用はありません</p>
          </div>
        ) : (
          filteredData.map((item, index) => (
            <div key={index} className="bg-white rounded-[14px] shadow-sm border border-blue-50 overflow-hidden flex flex-col">
              
              <div className="bg-blue-50/50 p-2.5 px-4 border-b border-blue-100/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-black text-blue-900">{getShortDateString(item.date)}</span>
                  <span className="text-[11px] font-bold text-blue-700/70">{formatTimeForDisplay(item.start_time)}</span>
                </div>
                <div className="text-[11px] font-bold bg-white text-blue-800 px-2.5 py-0.5 rounded shadow-sm border border-blue-100">
                  担: {item.assignee}
                </div>
              </div>

              <div className="p-4 flex flex-col gap-3 relative">
                <div className="flex items-start justify-between gap-2 z-10">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold mb-0.5">訪問先</p>
                    <p className="text-sm font-black text-gray-800 leading-snug">
                      {item.client && item.client !== '(-----)' ? <span className="text-[10px] text-gray-500 mr-1 bg-gray-100 px-1.5 py-0.5 rounded">{item.client}</span> : ''}
                      {item.destination}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">{item.area} / {item.work_content}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] text-blue-500 font-bold mb-0.5">伝票番号</p>
                    <div className="bg-blue-600 text-white font-black text-lg px-3 py-1.5 rounded-lg shadow-md tracking-wider min-w-[80px] text-center">
                      {item.slip_number || '未入力'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ホームへ戻るボタン */}
      <div className="fixed bottom-0 left-0 right-0 w-full p-6 flex justify-center z-40 mb-2 pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-white/90 backdrop-blur-lg border border-orange-100/50 px-10 py-3.5 rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex items-center gap-3 group active:scale-95 transition-all text-[#eaaa43]">
          <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center group-hover:bg-[#eaaa43] group-hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          </div>
          <span className="font-black text-[15px] tracking-[0.2em] pt-0.5">ホームに戻る</span>
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[#f8f6f0] font-sans text-slate-800 pb-32">
      <Suspense fallback={<div className="flex justify-center items-center h-screen text-blue-500 font-bold">画面を読み込んでいます...</div>}>
        <TollList />
      </Suspense>
    </div>
  );
}
