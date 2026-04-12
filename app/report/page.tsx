"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// GASのURL (プロキシ経由に変更)
const GAS_URL = '/api/gas';

const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

// 日付表示を綺麗にする関数
const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

// 担当者リスト
const ASSIGNEES = ["佐藤", "田中", "南", "新田", "徳重", "前田"];

// お知らせのデータ型
type Notice = {
  id: string;
  date: string;
  author: string;
  isUrgent: boolean;
  text: string;
  isActive: boolean;
  confirmedBy?: string[]; 
};

function ReportHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeModal = searchParams.get('modal');

  const [assignee, setAssignee] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedWorker') || "";
    }
    return "";
  });
  
  const [activeIndex, setActiveIndex] = useState(1); 

  // お知らせの状態管理
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoadingNotice, setIsLoadingNotice] = useState(true);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  
  // 管理画面用の状態
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const [summaryPeriod, setSummaryPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [allReports, setAllReports] = useState<any[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // 1. お知らせをGASから取得
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const res = await fetch(`${GAS_URL}?type=notice`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const formattedData = data.map(n => ({
            ...n,
            confirmedBy: n.confirmedBy ? (typeof n.confirmedBy === 'string' ? n.confirmedBy.split(',').filter(Boolean) : n.confirmedBy) : []
          }));
          setNotices(formattedData);
        }
        
        const hasActive = Array.isArray(data) ? data.some(n => n.isActive) : data?.isActive;
        if (hasActive) {
          setActiveIndex(0);
        }
      } catch (error) {
        console.error("お知らせの取得に失敗しました", error);
      } finally {
        setIsLoadingNotice(false);
      }
    };
    fetchNotice();
  }, []);

  // 2. 日報データをGASから取得
  useEffect(() => {
    const fetchReports = async () => {
      setIsReportsLoading(true);
      try {
        const workerParam = (assignee === "" || assignee === "add") ? "" : assignee;
        const res = await fetch(`${GAS_URL}?worker=${encodeURIComponent(workerParam)}`);
        const data = await res.json();
        
        if (!res.ok || (data && data.success === false)) {
          throw new Error(data.error || "通信エラー");
        }
        
        setAllReports(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error("日報データの取得に失敗しました", error);
      } finally {
        setIsReportsLoading(false);
      }
    };
    fetchReports();
  }, [assignee]);

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setAssignee(val);
    localStorage.setItem('selectedWorker', val);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 40;

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && activeIndex < 2) setActiveIndex(prev => prev + 1);
    if (distance < -minSwipeDistance && activeIndex > 0) setActiveIndex(prev => prev - 1);
  };

  // お知らせの保存
  const handleSaveNoticesToGAS = async (newNotices: Notice[], isSilent = false) => {
    setIsSavingNotice(true);
    try {
      const gasPayload = newNotices.map(n => ({
        ...n,
        confirmedBy: Array.isArray(n.confirmedBy) ? n.confirmedBy.join(',') : ''
      }));

      const payload = {
        action: 'updateNotices', 
        notices: gasPayload
      };
      
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setNotices(newNotices);
      setEditingNotice(null);
      if (!isSilent) {
        alert("保存しました！");
      }
    } catch (error) {
      if (!isSilent) {
        alert("通信エラーが発生しました。");
      }
    } finally {
      setIsSavingNotice(false);
    }
  };

  // お知らせの編集モードを開く
  const handleOpenEditForm = (notice?: Notice) => {
    if (notice) {
      setEditingNotice(notice);
    } else {
      setEditingNotice({
        id: `notice-${Date.now()}`,
        date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
        author: assignee !== 'add' && assignee !== '' ? assignee : '前田',
        isUrgent: false,
        text: '',
        isActive: true,
        confirmedBy: []
      });
    }
  };

  const handleDeleteNotice = (id: string) => {
    if (confirm("このお知らせを削除しますか？")) {
      const newNotices = notices.filter(n => n.id !== id);
      handleSaveNoticesToGAS(newNotices);
    }
  };

  const handleConfirmNotice = (noticeId: string) => {
    if (!assignee || assignee === 'add') {
      alert("トップ画面であなたの名前を選択してから確認ボタンを押してください。");
      return;
    }

    if (confirm(`${assignee}さん、確認しましたバッジをつけますか？`)) {
      const newNotices = notices.map(n => {
        if (n.id === noticeId) {
          const currentConfirmers = n.confirmedBy || [];
          if (!currentConfirmers.includes(assignee)) {
            return { ...n, confirmedBy: [...currentConfirmers, assignee] };
          }
        }
        return n;
      });
      handleSaveNoticesToGAS(newNotices, true);
    }
  };


  const openModal = (modalName: string) => {
    router.push(`?modal=${modalName}`, { scroll: false });
  };

  const closeModal = () => {
    router.push('/report', { scroll: false });
    setEditingNotice(null);
  };

  // 集計計算ロジック (英語キーに対応)
  const d = new Date();
  const currentDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = `${d.getFullYear()}`;

  let techSum = 0; let repairSum = 0; let salesSum = 0;

  allReports.forEach(item => {
    if (!item.date) return;
    const cleanDate = extractDateForInput(item.date);
    if (!cleanDate) return;
    let isMatch = false;
    if (summaryPeriod === 'day') isMatch = cleanDate === currentDay;
    else if (summaryPeriod === 'month') isMatch = cleanDate.startsWith(currentMonth);
    else if (summaryPeriod === 'year') isMatch = cleanDate.startsWith(currentYear);

    if (isMatch) {
      techSum += Number(item.tech_fee) || 0;
      repairSum += Number(item.repair_amount) || 0;
      salesSum += Number(item.sales_amount) || 0;
    }
  });

  const totalRev = repairSum + salesSum;
  const repairPercent = totalRev === 0 ? 0 : Math.round((repairSum / totalRev) * 100);
  const salesPercent = totalRev === 0 ? 0 : Math.round((salesSum / totalRev) * 100);

  const getQueryString = () => assignee && assignee !== "add" ? `?worker=${assignee}` : "";

  const activeNotices = notices.filter(n => n.isActive);
  const urgentNotices = activeNotices.filter(n => n.isUrgent);
  const normalNotices = activeNotices.filter(n => !n.isUrgent);

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-32 relative overflow-x-hidden text-slate-800">
      
      <div className="w-[92%] max-w-md mt-6 mb-6">
        <div className="bg-[#eaaa43] rounded-[14px] py-4 px-4 shadow-sm flex items-center justify-between">
          <Link href="/" className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform relative z-50">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-sm tracking-wider">戻る</span>
          </Link>
          <h1 className="text-white font-bold tracking-widest text-lg flex-1 text-center">日報入力</h1>
          <div className="w-16"></div>
        </div>

        <div className="mt-5 flex justify-between items-center gap-2">
          <Link href={`/report/submit/verify${getQueryString()}`} className="bg-white border border-[#eaaa43] text-[#eaaa43] font-bold rounded-full px-4 py-2.5 shadow-sm active:scale-95 transition-transform flex items-center text-sm z-20 hover:bg-orange-50">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            日報送信
          </Link>

          <div className="bg-white border border-gray-100 rounded-full px-5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center relative w-[160px] z-20">
            <select 
              value={assignee}
              onChange={handleAssigneeChange}
              className="bg-transparent font-black text-slate-800 outline-none appearance-none cursor-pointer w-full text-base z-10 text-center"
            >
              <option value="">担当者選択</option>
              {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="add">＋ 追加 (Add)</option>
            </select>
            <span className="text-[10px] text-gray-400 pointer-events-none absolute right-4 z-0">▼</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-[92%] max-w-md mb-8 z-20 relative">
        <Link href={`/report/new${getQueryString()}`} className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform border border-transparent hover:border-orange-100">
          <h2 className="text-[1.2rem] font-black text-gray-900 tracking-widest mb-1">新規入力</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-3">A-1</p>
          <div className="w-[50%] max-w-[50px] h-[2px] bg-[#cba358]"></div>
        </Link>
        <Link href={`/report/list${getQueryString()}`} className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform border border-transparent hover:border-orange-100 cursor-pointer">
          <h2 className="text-[1.2rem] font-black text-gray-900 tracking-widest mb-1">当日一覧</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-3">A-2</p>
          <div className="w-[50%] max-w-[50px] h-[2px] bg-[#cba358]"></div>
        </Link>
        <Link href={`/report/history${getQueryString()}`} className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform border border-transparent hover:border-orange-100 cursor-pointer">
          <h2 className="text-[1.2rem] font-black text-gray-900 tracking-widest mb-1">過去履歴</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-3">A-3</p>
          <div className="w-[50%] max-w-[50px] h-[2px] bg-[#cba358]"></div>
        </Link>
        <Link href={`/report/toll${getQueryString()}`} className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] py-8 flex flex-col items-center justify-center active:scale-95 transition-transform border border-transparent hover:border-orange-100 cursor-pointer">
          <h2 className="text-[1.1rem] font-black text-gray-900 tracking-widest mb-1 leading-tight text-center">高速代<br/>遠隔地</h2>
          <p className="text-[10px] text-gray-400 font-medium mb-3 mt-1">A-4</p>
          <div className="w-[50%] max-w-[50px] h-[2px] bg-[#cba358]"></div>
        </Link>
      </div>

      <div className="w-[92%] max-w-md mx-auto mb-6 z-20 relative">
        <div className="overflow-hidden w-full pb-2" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="flex transition-transform duration-300 ease-out w-[300%] items-stretch" style={{ transform: `translateX(-${activeIndex * (100 / 3)}%)` }}>
            
            <div className="w-1/3 px-1.5 h-64">
              <div className="bg-white rounded-[20px] shadow-[0_2px_10_rgba(0,0,0,0.03)] p-4 h-full flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[#eaaa43] font-black text-sm tracking-widest flex items-center">
                    📢 お知らせ
                  </h3>
                  <button onClick={(e) => { e.stopPropagation(); openModal('notice_manage'); }} className="text-gray-400 p-1.5 hover:text-[#eaaa43] active:scale-90 transition-transform bg-gray-50 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </button>
                </div>

                {isLoadingNotice ? (
                  <div className="flex-1 flex justify-center items-center text-gray-400 text-xs font-bold animate-pulse">取得中...</div>
                ) : (
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 relative cursor-pointer" onClick={() => openModal('notice_view')}>
                    {activeNotices.length === 0 ? (
                      <div className="flex-1 flex flex-col justify-center items-center text-center opacity-60">
                        <span className="text-2xl mb-1 block">📭</span>
                        <p className="text-[10px] text-gray-500 font-bold">現在、お知らせはありません</p>
                      </div>
                    ) : (
                      <>
                        {urgentNotices.map(notice => (
                          <div key={notice.id} className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm relative">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">🚨至急確認</span>
                              <span className="text-[9px] font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">👤 {notice.author}</span>
                            </div>
                            <p className="text-[11px] text-gray-800 font-bold leading-relaxed whitespace-pre-wrap">{notice.text}</p>
                          </div>
                        ))}

                        {urgentNotices.length === 0 && normalNotices.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm relative">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[9px] font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">👤 {normalNotices[0].author}</span>
                            </div>
                            <p className="text-[11px] text-gray-800 font-bold leading-relaxed whitespace-pre-wrap line-clamp-3">{normalNotices[0].text}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-1/3 px-1.5 h-64">
              <div onClick={() => openModal('todo')} className="bg-white rounded-[20px] shadow-[0_2px_10_rgba(0,0,0,0.03)] p-5 h-full flex flex-col justify-center cursor-pointer active:scale-[0.98] transition-transform">
                 <div className="flex items-center justify-center mb-5 pointer-events-none">
                  <h3 className="text-gray-800 font-black text-base tracking-widest relative inline-block">
                    たったできること
                    <div className="absolute -bottom-1 left-0 w-full h-1.5 bg-[#eaaa43] opacity-30 rounded-full"></div>
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 pointer-events-none">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center justify-center text-center h-[80px]">
                    <p className="text-[11px] font-bold text-gray-700 leading-snug">リピート率向上</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center justify-center text-center h-[80px]">
                    <p className="text-[11px] font-bold text-gray-700 leading-snug">緊急時の案内</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center justify-center text-center h-[80px]">
                    <p className="text-[11px] font-bold text-gray-700 leading-snug">カメラ名札提示</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center justify-center text-center h-[80px]">
                    <p className="text-[11px] font-bold text-gray-700 leading-snug">前日在宅確認</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-1/3 px-1.5 h-64">
              <div onClick={(e) => { if ((e.target as HTMLElement).tagName !== 'BUTTON') openModal('summary'); }} className="bg-white rounded-[20px] shadow-[0_2px_10_rgba(0,0,0,0.03)] p-5 h-full flex flex-col justify-center cursor-pointer active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between mb-4 pointer-events-none">
                  <h3 className="text-[#eaaa43] font-bold text-sm tracking-widest">集計</h3>
                  <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full border border-gray-200 whitespace-nowrap">
                    {assignee === "" || assignee === "add" ? "会社全体" : assignee}
                  </span>
                </div>
                {isReportsLoading ? (
                  <div className="flex-1 flex justify-center items-center text-gray-400 text-xs font-bold animate-pulse pointer-events-none">計算中...</div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-lg">
                      <button onClick={(e) => {e.stopPropagation(); setSummaryPeriod('day')}} className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${summaryPeriod === 'day' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>当日</button>
                      <button onClick={(e) => {e.stopPropagation(); setSummaryPeriod('month')} } className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${summaryPeriod === 'month' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>当月</button>
                      <button onClick={(e) => {e.stopPropagation(); setSummaryPeriod('year')} } className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors ${summaryPeriod === 'year' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>年</button>
                    </div>
                    <table className="w-full text-xs mb-4 pointer-events-none">
                      <tbody>
                        <tr className="border-b border-gray-50">
                          <td className="py-2 text-gray-500 font-medium">技術料</td>
                          <td className="py-2 text-right font-black text-gray-800"><span className="text-[10px] text-gray-400 font-normal mr-1">¥</span>{techSum.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-gray-50">
                          <td className="py-2 text-[#547b97] font-bold">修理合計</td>
                          <td className="py-2 text-right font-black text-[#547b97]"><span className="text-[10px] font-normal mr-1">¥</span>{repairSum.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-[#d98c77] font-bold">販売金額</td>
                          <td className="py-2 text-right font-black text-[#d98c77]"><span className="text-[10px] font-normal mr-1">¥</span>{salesSum.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 px-3 mt-1 h-6">
          <button onClick={() => setActiveIndex(activeIndex - 1)} className={`w-24 text-left tracking-wider ${activeIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}>&lt;&lt; 戻る</button>
          <div className="flex gap-1.5 justify-center flex-1">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeIndex === 0 ? 'bg-[#eaaa43] w-3' : 'bg-gray-200'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeIndex === 1 ? 'bg-[#eaaa43] w-3' : 'bg-gray-200'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeIndex === 2 ? 'bg-[#eaaa43] w-3' : 'bg-gray-200'}`}></span>
          </div>
          <button onClick={() => setActiveIndex(activeIndex + 1)} className={`w-24 text-right tracking-wider ${activeIndex === 2 ? 'opacity-0 pointer-events-none' : ''}`}>次へ &gt;&gt;</button>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-[#f8f6f0] z-[100] flex flex-col animate-fade-in overflow-y-auto">
          
          <div className="sticky top-0 bg-white shadow-sm px-4 py-4 flex justify-between items-center z-10">
            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 flex items-center font-bold text-sm">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>戻る
            </button>
            <h2 className="text-[#eaaa43] font-black tracking-widest text-base">
              {activeModal === 'notice_view' && 'お知らせ一覧'}
              {activeModal === 'notice_manage' && 'お知らせ管理'}
              {activeModal === 'todo' && 'たったできること'}
              {activeModal === 'summary' && '集計詳細'}
            </h2>
            <div className="w-16"></div>
          </div>

          <div className="p-4 max-w-md mx-auto w-full pb-20">
            {activeModal === 'notice_view' && (
              <div className="space-y-4">
                {activeNotices.map(notice => {
                  const isConfirmedByMe = notice.confirmedBy?.includes(assignee);
                  return (
                    <div key={notice.id} className={`bg-white rounded-[20px] shadow-sm border-l-4 ${notice.isUrgent ? 'border-red-500' : 'border-[#eaaa43]'} overflow-hidden`}>
                      <div className="p-5 pb-4">
                        <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            {notice.isUrgent && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">🚨 至急</span>}
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">👤 {notice.author}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold mt-1">{formatDateForDisplay(notice.date)}</span>
                        </div>
                        <p className="text-sm text-gray-800 font-bold leading-relaxed whitespace-pre-wrap">{notice.text}</p>
                      </div>
                      <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 tracking-wider">確認状況</span>
                          {!isConfirmedByMe && (
                            <button onClick={() => handleConfirmNotice(notice.id)} className="bg-green-500 text-white px-4 py-2 rounded-full font-black text-xs shadow-md active:scale-95 transition-transform">確認しました</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                          {notice.confirmedBy?.map((name, idx) => (
                            <span key={idx} className="bg-white border border-green-200 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">✓ {name}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeModal === 'summary' && (
              <div className="bg-white rounded-[20px] shadow-sm p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="font-black text-gray-800 text-lg tracking-widest">売上詳細</h3>
                  <span className="text-xs text-[#eaaa43] font-bold bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    {assignee || "全体"}
                  </span>
                </div>
                
                <div className="flex gap-2 mb-6 bg-gray-50 p-1.5 rounded-xl">
                  <button onClick={() => setSummaryPeriod('day')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${summaryPeriod === 'day' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>当日</button>
                  <button onClick={() => setSummaryPeriod('month')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${summaryPeriod === 'month' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>当月</button>
                  <button onClick={() => setSummaryPeriod('year')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${summaryPeriod === 'year' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>年</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-gray-500 font-bold">技術料</span>
                    <span className="text-xl font-black text-gray-800">¥{techSum.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#547b97]/5 rounded-xl p-4 flex justify-between items-center border border-[#547b97]/10">
                    <span className="text-[#547b97] font-bold">修理合計</span>
                    <span className="text-xl font-black text-[#547b97]">¥{repairSum.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#d98c77]/5 rounded-xl p-4 flex justify-between items-center border border-[#d98c77]/10">
                    <span className="text-[#d98c77] font-bold">販売金額</span>
                    <span className="text-xl font-black text-[#d98c77]">¥{salesSum.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 他のモーダル内容は省略 */}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 w-full p-6 flex justify-center z-40 mb-2 pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-white/90 backdrop-blur-lg border border-orange-100/50 px-10 py-3.5 rounded-[22px] shadow-lg flex items-center gap-3 active:scale-95 transition-all text-[#eaaa43]">
          <span className="font-black text-[15px] tracking-[0.2em] pt-0.5">ホームに戻る</span>
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportHub />
    </Suspense>
  );
}
