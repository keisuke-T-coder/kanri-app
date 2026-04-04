"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  // 初回自動遷移処理は削除しました

  // ★ 追加：未実装のボタンを押したときのアラート処理
  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Coming soon...\n現在開発中です。次回アップデートをお待ちください。");
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-24 relative overflow-hidden text-slate-800">

      {/* 画面上部のオレンジヘッダー */}
      <div className="w-[92%] max-w-md mt-6 mb-10 bg-[#eaaa43] rounded-[14px] py-4 shadow-sm flex items-center justify-center">
        <h1 className="text-white font-bold tracking-widest text-lg">MENU / メニュー</h1>
      </div>

      {/* 5つのメニューカード */}
      <div className="grid grid-cols-2 gap-4 w-[92%] max-w-md">

        {/* 1. 日報入力 */}
        <Link href="/report" className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform">
          <h2 className="text-[1.1rem] font-black text-gray-900 tracking-widest mb-1">日報入力</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-2">Daily Report</p>
          <div className="w-[50%] h-[2px] bg-[#cba358]"></div>
        </Link>

        {/* 2. 案件管理 (Coming Soon) */}
        <div onClick={handleComingSoon} className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer">
          <h2 className="text-[1.1rem] font-black text-gray-400 tracking-widest mb-1">案件管理</h2>
          <p className="text-[10px] text-gray-300 font-medium mb-2 opacity-50">Management</p>
          <div className="w-[50%] h-[2px] bg-gray-200"></div>
        </div>

        {/* 3. ホワイトボード */}
        <Link href="/whiteboard" className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform">
          <h2 className="text-[1.1rem] font-black text-gray-900 tracking-widest mb-1">ホワイトボード</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-2">Whiteboard</p>
          <div className="w-[50%] h-[2px] bg-[#cba358]"></div>
        </Link>

        {/* 4. 部品管理 */}
        <Link href="/parts" className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform">
          <h2 className="text-[1.1rem] font-black text-gray-900 tracking-widest mb-1">部品管理</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-2">Parts List</p>
          <div className="w-[50%] h-[2px] bg-[#cba358]"></div>
        </Link>
      </div>

      {/* 5. LTS依頼 (Main Application Entry) */}
      <div 
        onClick={(e) => {
          e.preventDefault();
          const pass = prompt("LTS専用エリアへのログインパスワードを入力してください");
          if (pass === "syuke") {
            router.push("/cases");
          } else if (pass !== null) {
            alert("パスワードが正しくありません。");
          }
        }} 
        className="w-[92%] max-w-md mt-4 bg-white rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer border border-[#eaaa43]/30"
      >
        <h2 className="text-[1.3rem] font-black text-gray-900 tracking-[0.1em] mb-1">LTS 依頼</h2>
        <p className="text-[10px] text-[#eaaa43] font-bold uppercase tracking-widest">Lts Repair Requests</p>
        <div className="w-[30%] h-[3px] bg-[#eaaa43] mt-3 rounded-full"></div>
      </div>

      {/* 画面下のナビゲーションバー（TabBar） */}
      <div className="fixed bottom-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto pb-2 z-10">

        {/* ホーム（アクティブ・オレンジ色） */}
        <Link href="/" className="p-2 cursor-pointer">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eaaa43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>

        {/* お知らせ */}
        <div onClick={handleComingSoon} className="p-2 cursor-pointer active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>

        {/* ユーザー */}
        <div onClick={handleComingSoon} className="p-2 cursor-pointer active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        {/* 設定 */}
        <div onClick={handleComingSoon} className="p-2 cursor-pointer active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>

        {/* バージョン表記 (右下) */}
        <span className="absolute bottom-[6px] right-4 text-[10px] text-gray-400 italic">app version 1.0</span>
      </div>

    </div>
  );
}
