"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worker = searchParams.get('worker') || '';

  const handleGoToOutlook = () => {
    // Outlookモバイルアプリを優先的に起動するURLスキーム
    window.location.href = 'ms-outlook://';
    
    // フォールバック（アプリがない場合やPCの場合など）
    // 数秒後にアプリが起動していなければウェブ版を開くなど
    setTimeout(() => {
      if (document.hasFocus()) {
        window.open('https://outlook.office.com/mail/', '_blank');
      }
    }, 2500);
  };

  const handleGoToSubmit = () => {
    const query = worker ? `?worker=${encodeURIComponent(worker)}` : '';
    router.push(`/report/submit${query}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center justify-center p-6 text-center font-sans">
      
      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-xl p-8 flex flex-col items-center border border-orange-100/50">
        
        {/* 🚨 注意喚起アイコン */}
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-inner">
          <span className="text-5xl">🚨</span>
        </div>

        <h1 className="text-2xl font-black text-gray-800 mb-4 tracking-tighter leading-tight">
          報告メールは<br/>
          <span className="text-red-500 underline decoration-red-200 underline-offset-8">送信しましたか？</span>
        </h1>

        <p className="text-sm text-gray-500 font-bold mb-10 leading-relaxed">
          報告漏れを防ぐため、<br/>
          先にOutlookでのメール送信を<br/>
          完了させてください。
        </p>

        <div className="w-full flex flex-col gap-4">
          {/* Outlook 起動ボタン */}
          <button 
            onClick={handleGoToOutlook}
            className="w-full bg-[#0078d4] text-white py-4 rounded-[18px] font-black tracking-widest active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10-10-4.48-10-10zm2.5 0c0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5-3.36-7.5-7.5-7.5-7.5 3.36-7.5 7.5zM12 7c.55 0 1 .45 1 1v3h3c.55 0 1 .45 1 1s-.45 1-1 1h-4c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1z" />
            </svg>
            Outlookへ（送信に移動）
          </button>

          {/* はい（次に進む）ボタン */}
          <button 
            onClick={handleGoToSubmit}
            className="w-full bg-[#eaaa43] text-white py-4 rounded-[18px] font-black tracking-widest active:scale-95 transition-transform shadow-md"
          >
            はい、送信済みです
          </button>

          {/* 戻るボタン */}
          <button 
            onClick={() => router.back()}
            className="text-gray-400 font-bold text-sm mt-2 hover:text-gray-600 active:scale-95 transition-all"
          >
            メニューへ戻る
          </button>
        </div>

      </div>

      <div className="mt-8 text-gray-300 text-[10px] font-black tracking-widest uppercase opacity-50">
        Security & Reminder System
      </div>

    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
