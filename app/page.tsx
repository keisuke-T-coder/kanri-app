"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [selectedWorker, setSelectedWorker] = React.useState<string | null>(null);

  useEffect(() => {
    // 日報画面で保存されている担当者を取得
    const worker = localStorage.getItem('selectedWorker');
    setSelectedWorker(worker);
  }, []);

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

      {/* 2つのメニューカード */}
      <div className="grid grid-cols-1 gap-4 w-[92%] max-w-md">

        {/* 1. 日報入力 */}
        <Link href="/report" className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-10 flex flex-col items-center justify-center active:scale-95 transition-transform border border-transparent hover:border-orange-100">
          <h2 className="text-[1.3rem] font-black text-gray-900 tracking-widest mb-1">日報入力</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-3">Daily Report</p>
          <div className="w-[40%] h-[3px] bg-[#eaaa43] rounded-full"></div>
        </Link>

        {/* 2. ホワイトボード */}
        <Link href="/whiteboard" className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-10 flex flex-col items-center justify-center active:scale-95 transition-transform border border-transparent hover:border-orange-100">
          <h2 className="text-[1.3rem] font-black text-gray-900 tracking-widest mb-1">ホワイトボード</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-3">Whiteboard</p>
          <div className="w-[40%] h-[3px] bg-[#eaaa43] rounded-full"></div>
        </Link>

      </div>

      {/* バージョン表記 (右下) */}
      <span className="fixed bottom-4 right-4 text-[10px] text-gray-400 italic">app version 1.1</span>

    </div>
  );
}
