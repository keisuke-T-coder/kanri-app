"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const GAS_URL = '/api/gas';

const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

// Dateオブジェクトから YYYY-MM-DD を生成する関数
function toDateString(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayString() {
  return toDateString(new Date());
}

// ==========================================
// ★ 修正：時間を日本時間（JST）で正しく抽出する関数
// ==========================================
function extractTime(timeStr: string) {
  if (!timeStr) return "99:99"; 
  
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;

  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    console.error("時間の変換に失敗しました:", timeStr);
  }
  
  return "99:99";
}

function formatDisplayTime(timeStr: string) {
  const t = extractTime(timeStr);
  return t === "99:99" ? "未定" : t;
}

function SubmitReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const worker = searchParams.get('worker') || "";

  const [allReports, setAllReports] = useState<any[]>([]);
  const [targetDate, setTargetDate] = useState(getTodayString());
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const isInvalidWorker = !worker || worker === "add";

  useEffect(() => {
    if (isInvalidWorker) {
      setIsLoading(false);
      return;
    }

    const fetchAllReports = async () => {
      try {
        const res = await fetch(`${GAS_URL}?worker=${encodeURIComponent(worker)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAllReports(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("日報データの取得に失敗しました", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllReports();
  }, [worker, isInvalidWorker]);

  const changeDate = (offset: number) => {
    const newD = new Date(targetDate);
    newD.setDate(newD.getDate() + offset);
    setTargetDate(toDateString(newD));
  };

  const displayedReports = allReports.filter((r: any) => extractDateForInput(r.date) === targetDate);

  let totalTechFee = 0;
  let totalAmount = 0;

  displayedReports.forEach(r => {
    totalTechFee += Number(r.tech_fee) || 0;
    totalAmount += (Number(r.repair_amount) || 0) + (Number(r.sales_amount) || 0);
  });

  const sortedReports = [...displayedReports].sort((a, b) => {
    const timeA = extractTime(a.start_time);
    const timeB = extractTime(b.start_time);
    return timeA.localeCompare(timeB);
  });

  const handleComplete = () => {
    setShowCompletionModal(true);
  };

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
        <p className="text-gray-400 font-bold text-sm tracking-widest">データを集計中...</p>
      </div>
    );
  }

  const dObj = new Date(targetDate);
  const displayDate = `${dObj.getFullYear()}.${String(dObj.getMonth() + 1).padStart(2, '0')}.${String(dObj.getDate()).padStart(2, '0')}`;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayStr = days[dObj.getDay()];

  return (
    <div className="min-h-screen bg-[#f8f6f0] p-1.5 sm:p-3 flex flex-col font-sans text-slate-800 pb-2">
      
      {/* 戻るボタン */}
      <div className="flex justify-start mb-1.5 pl-1">
        <button onClick={() => router.back()} className="text-gray-400 flex items-center text-[10px] font-bold active:scale-95 transition-transform bg-white/60 px-2 py-0.5 rounded-full">
          <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          メニューに戻る
        </button>
      </div>

      {/* 👑 ヘッダー */}
      <div className="bg-gradient-to-r from-[#eaaa43] to-[#d4952b] rounded-[14px] p-2.5 shadow-md text-white flex justify-between items-center z-10">
        
        {/* 左側：担当者、日付、件数 */}
        <div className="flex flex-col justify-between h-full">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px] font-bold bg-white/20 px-1.5 py-[2px] rounded shadow-inner backdrop-blur-sm">
              担当: {worker}
            </span>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-1 py-[1px]">
              <button onClick={() => changeDate(-1)} className="p-0.5 hover:bg-white/20 rounded-full active:scale-90 transition-transform">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <span className="text-[10px] font-black tracking-widest drop-shadow-sm w-[75px] text-center">
                {displayDate} ({dayStr})
              </span>
              <button onClick={() => changeDate(1)} className="p-0.5 hover:bg-white/20 rounded-full active:scale-90 transition-transform">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
          <div className="text-[10px] font-medium drop-shadow-sm leading-none pl-0.5">
            完了件数: <span className="text-[14px] font-black">{sortedReports.length}</span> 件
          </div>
        </div>

        {/* 右側：技術料と売上合計 */}
        <div className="text-right pr-0.5 flex flex-col justify-center gap-1">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[8px] opacity-90 drop-shadow-sm">技術料計</span>
            <span className="text-[13px] font-black drop-shadow-md tracking-wider">¥{totalTechFee.toLocaleString()}</span>
          </div>
          <div className="flex items-end justify-end gap-1.5">
            <span className="text-[9px] opacity-90 drop-shadow-sm pb-[2px]">売上合計</span>
            <span className="text-[18px] font-black drop-shadow-md tracking-wider leading-none">¥{totalAmount.toLocaleString()}</span>
          </div>
        </div>

      </div>

      {/* 📋 リスト部分 */}
      <div className="flex-1 bg-white rounded-[14px] shadow-sm border border-gray-100 mt-2 p-1 overflow-hidden flex flex-col relative z-0">
        
        {/* テーブルヘッダー */}
        <div className="flex text-[9px] text-gray-400 font-bold border-b border-gray-100 pb-1 pt-0.5 mb-1 px-1">
          <div className="w-[38px] text-center shrink-0">時間</div>
          <div className="flex-1 pl-1">訪問先 / 内容</div>
          <div className="w-[50px] text-right shrink-0">技術/計</div>
        </div>

        {sortedReports.length === 0 && (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 py-10">
            <span className="text-3xl mb-2 block opacity-30">📄</span>
            <p className="text-xs font-bold">提出データはありません</p>
          </div>
        )}

        {/* データ一覧 */}
        {sortedReports.map((r, index) => {
          const isSeiyaku = r.memo ? r.memo.includes('成約') : false; 
          const isRemote = r.remote_highway_fee === '有';

          const wrapperClass = isSeiyaku 
            ? "bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400 p-[1.5px] shadow-sm"
            : isRemote 
            ? "bg-[#6495ED] p-[1.5px] shadow-sm"
            : "border-b border-gray-100";

          const innerClass = (isSeiyaku || isRemote) ? "bg-white rounded-[4px]" : "bg-transparent";

          const seiyakuProductText = isSeiyaku && r.memo ? r.memo.replace(/【成約】\n?/g, '').trim() : '';

          return (
            <div key={index} className={`mb-[3px] rounded-[6px] ${wrapperClass}`}>
              <div className={`flex items-start py-1 px-1 ${innerClass}`}>
                
                <div className="w-[38px] text-[10px] text-gray-500 text-center font-bold leading-[1.1] pt-0.5 shrink-0">
                  {formatDisplayTime(r.start_time)}<br/>
                  <span className="text-gray-400 text-[8px]">{formatDisplayTime(r.end_time)}</span>
                </div>
                
                <div className="flex-1 pl-1.5 pr-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 mb-[2px] overflow-hidden">
                    {r.client && r.client !== '(-----)' && r.client !== '-' && (
                      <span className={`text-[7.5px] px-1 py-[1.5px] rounded border shrink-0 ${
                        ["リビング", "ハウス"].includes(r.client) ? "bg-green-100 text-green-700 border-green-200" :
                        ["トータルサービス", "タカギ"].includes(r.client) ? "bg-blue-100 text-blue-700 border-blue-200" :
                        ["崎山不動産", "ひだまり"].includes(r.client) ? "bg-purple-100 text-purple-700 border-purple-200" :
                        r.client === "LTS" ? "bg-orange-100 text-orange-700 border-orange-200" :
                        "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {r.client}
                      </span>
                    )}
                    <span className="text-[11px] font-black text-gray-800 truncate leading-none pt-0.5">{r.destination}</span>
                    <span className="text-[7.5px] text-gray-400 font-bold border border-gray-200 rounded px-1 leading-none py-[2px] whitespace-nowrap bg-gray-50">
                      {r.area?.replace('エリア', '') || ''}
                    </span>
                  </div>
                  <div className="text-[8.5px] text-gray-500 truncate leading-none mb-1">
                    {r.item} {r.part_number ? `(${r.part_number})` : ''} / {r.request_content}
                  </div>
                  
                  {/* バッジエリア */}
                  <div className="flex items-center flex-wrap gap-1 mt-[2px] overflow-hidden">
                    {isSeiyaku && (
                      <div className="flex items-center max-w-full overflow-hidden mr-1">
                        <span className="text-[7.5px] text-white font-bold bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400 px-1.5 py-[1.5px] rounded-[2px] leading-none shadow-sm shrink-0">
                          成約
                        </span>
                        {seiyakuProductText && (
                          <span className="text-[7.5px] text-pink-600 font-bold ml-1 truncate">
                            {seiyakuProductText}
                          </span>
                        )}
                      </div>
                    )}
                    {isRemote && (
                      <span className="text-[7.5px] text-white font-bold bg-[#6495ED] px-1.5 py-[1.5px] rounded-[2px] leading-none shadow-sm shrink-0">
                        遠隔
                      </span>
                    )}
                    {isRemote && r.slip_number && (
                      <span className="text-[7.5px] text-red-500 font-bold border border-red-200 bg-red-50 px-1 py-[1px] rounded-[2px] leading-none shadow-sm shrink-0">
                        伝: {r.slip_number}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="w-[50px] text-right flex flex-col justify-center pr-1 pt-0.5 shrink-0">
                  <div className="text-[8px] text-gray-400 font-bold leading-[1.1] mb-[1px]">¥{Number(r.tech_fee).toLocaleString()}</div>
                  <div className={`text-[10px] font-black leading-[1.1] ${r.work_type === '販売' ? 'text-[#d98c77]' : 'text-[#547b97]'}`}>
                    ¥{(Number(r.repair_amount) + Number(r.sales_amount)).toLocaleString()}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 📸 送信ボタン */}
      <div className="mt-2 flex flex-col items-center z-10">
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

      {/* お疲れ様でした！ポップアップ */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-8 flex flex-col items-center text-center shadow-2xl transform transition-all scale-100">
            
            <div className="text-6xl mb-4 animate-bounce drop-shadow-sm">
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
