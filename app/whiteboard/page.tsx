"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

// --- GAS連携情報と選択肢 ---
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';
const areas = ["市内南部エリア", "市街地エリア", "市内北部エリア", "日置エリア", "北薩エリア", "南薩エリア", "大隅エリア", "鹿屋エリア", "姶良エリア", "霧島エリア", "その他"];
const requestContents = ["水漏れ", "作動不良", "開閉不良", "破損", "異音", "詰り関係", "その他"];
const workContents = ["部品交換", "製品交換、取付", "清掃", "点検", "見積", "応急処置", "その他"];

// --- スタッフ設定 ---
const assignees = ["南", "新田", "德重", "田中", "佐藤"];
const staffStyles: Record<string, { border: string, bg: string, text: string, dot: string, headerBg: string }> = {
  "南": { border: "border-orange-400", bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400", headerBg: "bg-orange-100 text-orange-800" },
  "新田": { border: "border-green-400", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-400", headerBg: "bg-green-100 text-green-800" },
  "德重": { border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400", headerBg: "bg-purple-100 text-purple-800" },
  "田中": { border: "border-cyan-400", bg: "bg-cyan-50", text: "text-cyan-600", dot: "bg-cyan-400", headerBg: "bg-cyan-100 text-cyan-800" },
  "佐藤": { border: "border-gray-400", bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", headerBg: "bg-gray-200 text-gray-800" },
};

const wbItems = ["DW", "AW", "EW", "KS", "PH", "1D", "1A", "2A", "RS", "MT", "ハウス", "リビング", "ひだまり", "JIO", "LTS", "トータルサービス", "その他"];
const absenceTypes = ["1日休み", "午前休", "午後休"];

// --- タイムライン設定 ---
const START_HOUR = 7;
const END_HOUR = 21;

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(date: Date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`;
}

const parseMins = (t: string) => {
  if(!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// --- ヘルパー関数 ---
const processOverlaps = (staffSchedules: any[], dynamicHourHeight: number, dynamicMinBlock: number) => {
  const parsed = staffSchedules.map(s => ({ ...s, startMins: parseMins(s.開始時間), endMins: parseMins(s.終了時間) }))
                               .sort((a, b) => a.startMins - b.startMins);
  const columns: any[][] = [];
  parsed.forEach(s => {
    let placed = false;
    for(let i=0; i<columns.length; i++){
      if(s.startMins >= columns[i][columns[i].length-1].endMins) {
        columns[i].push(s);
        placed = true;
        break;
      }
    }
    if(!placed) columns.push([s]);
  });
  
  const numCols = columns.length || 1;
  const width = 94 / numCols; 
  
  columns.forEach((col, i) => {
    col.forEach(s => {
      s.computedLeft = 3 + (i * width);
      s.computedWidth = width;
    });
  });
  return parsed;
};

// --- サブコンポーネント: お知らせバナー ---
const NoticeBanner = ({ targetDateStr, notices, currentUser, deleteNotice, toggleNoticeConfirm, setNoticeTargetDate, setIsNoticeFormOpen }: any) => {
  const dayNotices = notices.filter((n: any) => n.date === targetDateStr);
  return (
    <div className="bg-white/50 border-b border-gray-200 p-2 space-y-2">
      {dayNotices.map((n: any) => {
        const isConfirmed = currentUser && n.confirmedBy.includes(currentUser);
        return (
          <div key={n.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex flex-col gap-1 shadow-sm relative">
             <button onClick={() => deleteNotice(n.id)} className="absolute top-1 right-2 text-gray-400 hover:text-red-500 text-xs p-1">🗑️</button>
             <div className="font-bold text-[11px] text-gray-800 pr-6">⚠️ {n.text} <span className="text-[9px] text-gray-400">({n.author})</span></div>
             <div className="flex justify-between items-center mt-1">
               <div className="text-[9px] text-gray-500 font-bold flex flex-wrap gap-1">
                  {n.confirmedBy.length > 0 ? `確認済: ${n.confirmedBy.join(', ')}` : '未確認'}
               </div>
               {currentUser && (
                 <button onClick={() => toggleNoticeConfirm(n.id)} className={`px-2 py-1 rounded text-[9px] font-black transition-colors ${isConfirmed ? 'bg-gray-200 text-gray-600' : 'bg-green-500 text-white shadow-sm active:scale-95 transition-transform'}`}>
                    {isConfirmed ? '確認済 取消' : '✅ 確認する'}
                 </button>
               )}
             </div>
          </div>
        );
      })}
      <button onClick={() => { setNoticeTargetDate(targetDateStr); setIsNoticeFormOpen(true); }} className="text-[#eaaa43] font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-transform">
        ＋ お知らせを追加
      </button>
    </div>
  );
};

// --- サブコンポーネント: タイムライン本体 ---
const TimelineCanvas = ({ targetDateStr, schedules, setSchedules, openDetail, handleCanvasClick, fetchData, isZoomed, dynamicHourHeight, dynamicMinBlock }: any) => {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
  const daySchedules = schedules.filter((s: any) => s.日付 === targetDateStr);
  
  // 長押しタイマー用のRef
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // ドラッグ操作用のローカル状態
  const [isDragging, setIsDragging] = useState(false);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  const [isPressing, setIsPressing] = useState(false); // 長押し待機中
  const [dragStartY, setDragStartY] = useState(0);
  const [draggedSchedule, setDraggedSchedule] = useState<any>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dragCurrentTop, setDragCurrentTop] = useState(0);
  const [dragStartTime, setDragStartTime] = useState("");
  const [dragEndTime, setDragEndTime] = useState("");

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, schedule: any) => {
    e.stopPropagation();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = clientY - rect.top;
    
    // 他のタイマーをクリア
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    setIsDragging(false);
    setIsActuallyDragging(false);
    setIsPressing(true);
    setDragStartY(clientY);
    setDraggedSchedule(schedule);
    setDragOffsetY(offsetY);
    setDragCurrentTop(rect.top - (e.currentTarget.parentElement?.getBoundingClientRect().top || 0));
    setDragStartTime(schedule.開始時間);
    setDragEndTime(schedule.終了時間);

    // 1秒間の長押しタイマーを開始
    longPressTimerRef.current = setTimeout(() => {
      setIsDragging(true);
      setIsActuallyDragging(true);
      setIsPressing(false);
      // 長押し完了時に軽くバイブレーション（対応機種のみ）
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    }, 1000);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    // まだドラッグ開始していない（長押し待機中）の場合
    if (!isDragging && isPressing) {
      // 10px以上動いたら「長押し」をキャンセル（ユーザーが誤って動かしたと判断）
      if (Math.abs(clientY - dragStartY) > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        setIsPressing(false);
      }
      return;
    }

    if (!isDragging || !draggedSchedule) return;

    const parentRect = document.getElementById(`canvas-${targetDateStr}`)?.getBoundingClientRect();
    if (!parentRect) return;

    let newTop = clientY - parentRect.top - dragOffsetY;
    newTop = Math.max(0, Math.min(newTop, parentRect.height - dynamicMinBlock));

    const snapPx = dynamicHourHeight / 2;
    const snappedTop = Math.round(newTop / snapPx) * snapPx;
    setDragCurrentTop(snappedTop);

    const totalMinutes = (snappedTop / dynamicHourHeight) * 60;
    const startHour = Math.floor(totalMinutes / 60) + START_HOUR;
    const startMin = Math.round((totalMinutes % 60) / 30) * 30;
    
    const durationMins = parseMins(draggedSchedule.終了時間) - parseMins(draggedSchedule.開始時間);
    const endTotalMins = (startHour - START_HOUR) * 60 + startMin + durationMins;
    const endHour = Math.floor(endTotalMins / 60) + START_HOUR;
    const endMin = endTotalMins % 60;

    const newStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const newEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    setDragStartTime(newStart);
    setDragEndTime(newEnd);
  };

  // ドラッグ終了直後の誤クリック防止用Ref
  const dragFinishedRef = React.useRef(false);

  const handleMouseUp = async (e: MouseEvent | TouchEvent) => {
    // タイマーをクリア
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const wasDraggingBefore = isDragging;
    const wasPressingBefore = isPressing;

    if (!isDragging && !isPressing && !draggedSchedule) return;
    
    const hasChanged = isDragging && isActuallyDragging && (dragStartTime !== draggedSchedule.開始時間 || dragEndTime !== draggedSchedule.終了時間);
    
    if (hasChanged) {
      const updatedSchedule = { ...draggedSchedule, 開始時間: dragStartTime, 終了時間: dragEndTime };
      setSchedules((prev: any[]) => prev.map(s => s.タイムスタンプ === draggedSchedule.タイムスタンプ ? updatedSchedule : s));
      
      // 非同期でサーバーに保存
      const saveToGAS = async (payload: any) => {
        try {
          const formBody = new URLSearchParams();
          formBody.append('data', JSON.stringify({ ...payload, action: 'update' }));
          await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
        } catch (error) {
          console.error("サーバー保存エラー", error);
          alert("通信エラーが発生しました。最新の状態を読み込みます。");
          fetchData();
        }
      };
      saveToGAS(updatedSchedule);

      // ドラッグ終了フラグを立てて、直後のクリックイベントを無視するようにする
      dragFinishedRef.current = true;
      setTimeout(() => dragFinishedRef.current = false, 100);
    }

    // ドラッグでも長押し完了でもなかった場合（＝単なるクリック）
    if (!wasDraggingBefore && wasPressingBefore && draggedSchedule) {
      openDetail(draggedSchedule, e as any);
    }

    // ★ サーバーのレスポンスを待たずに即座にドラッグ状態を解除する
    setIsDragging(false);
    setIsActuallyDragging(false);
    setIsPressing(false);
    setDraggedSchedule(null);
  };

  useEffect(() => {
    if (isDragging || isPressing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isPressing, draggedSchedule, dragOffsetY, dragStartTime, dragEndTime, isActuallyDragging]);

  return (
    <div id={`canvas-${targetDateStr}`} className="relative w-full bg-white pb-[40px]" style={{ height: `${(END_HOUR - START_HOUR + 1) * dynamicHourHeight}px`, minHeight: `${(END_HOUR - START_HOUR + 1) * dynamicHourHeight}px` }}>
      <div className="absolute inset-0 pointer-events-none z-0 flex flex-col">
        {hours.map(h => (
          <div key={h} className="w-full border-t border-gray-100 flex items-start shrink-0 relative" style={{ height: `${dynamicHourHeight}px` }}>
            <span className={`text-gray-400 font-bold pl-1 bg-white pr-1 ${isZoomed ? 'text-[8px] -mt-1' : 'text-[9px] -mt-1.5'}`}>{h}:00</span>
            <div className="absolute top-1/2 left-0 w-full border-t border-gray-50/50 border-dashed pointer-events-none"></div>
          </div>
        ))}
      </div>
      
      <div className="relative z-10 flex w-full pl-[36px] h-full cursor-pointer">
        {assignees.map(staff => {
          const staffSchedules = processOverlaps(daySchedules.filter((s: any) => s.担当者 === staff), dynamicHourHeight, dynamicMinBlock);
          const style = staffStyles[staff];
          return (
            <div key={staff} 
                 className="flex-1 border-r border-gray-50 relative min-w-[50px] hover:bg-gray-50/50 transition-colors"
                 onClick={(e) => {
                   // ドラッグ中や、終了直後のクリックは無視する
                   if (isDragging || isActuallyDragging || isPressing || dragFinishedRef.current) return;
                   
                   // 重要: スケジュールブロック本体やその中の要素を触った場合は、背景のクリックイベント（新規作成）を無視する
                   if (e.target !== e.currentTarget) return;

                   handleCanvasClick(e, staff, targetDateStr);
                 }}> 
              
              {staffSchedules.map((schedule, idx) => {
                const startMins = schedule.startMins - (START_HOUR * 60);
                const endMins = schedule.endMins - (START_HOUR * 60);
                const topPx = (startMins / 60) * dynamicHourHeight;
                let heightPx = ((endMins - startMins) / 60) * dynamicHourHeight;
                heightPx = Math.max(heightPx, dynamicMinBlock); 

                // 長押し中の視覚フィードバック
                const isCurrentPressing = isPressing && draggedSchedule?.タイムスタンプ === schedule.タイムスタンプ;

                if (schedule.isAbsence) {
                  return (
                    <div key={schedule.タイムスタンプ || idx} onClick={(e) => openDetail(schedule, e)} className="absolute bg-red-500 rounded-[4px] shadow-sm cursor-pointer active:scale-95 transition-transform flex flex-col justify-center items-center overflow-hidden border border-red-600 z-20" 
                         style={{ top: `${Math.max(0, topPx)}px`, height: `${heightPx}px`, left: `${schedule.computedLeft}%`, width: `${schedule.computedWidth}%` }}>
                      <span className={`text-white font-black writing-vertical-rl ${isZoomed ? 'text-[8px]' : 'text-[10px]'}`}>{schedule.absenceType}</span>
                    </div>
                  );
                }
                return (
                  <div key={schedule.タイムスタンプ || idx} 
                       onMouseDown={(e) => handleMouseDown(e, schedule)}
                       onTouchStart={(e) => handleMouseDown(e, schedule)}
                       className={`absolute bg-white rounded-[6px] shadow-md border ${style.border} border-l-[4px] cursor-pointer transition-all flex flex-col overflow-hidden ${isZoomed ? 'p-0.5' : 'p-1'} z-20 leading-tight ${(isDragging || isActuallyDragging) && draggedSchedule?.タイムスタンプ === schedule.タイムスタンプ ? 'opacity-0 scale-95' : ''} ${isCurrentPressing ? 'ring-4 ring-orange-400 ring-opacity-50 animate-pulse bg-orange-50' : ''}`} 
                       style={{ top: `${Math.max(0, topPx)}px`, height: `${heightPx}px`, left: `${schedule.computedLeft}%`, width: `${schedule.computedWidth}%` }}>
                    
                    {isZoomed ? (
                      <div className="flex flex-col gap-0.5 justify-center h-full">
                         <span className="bg-gray-100 text-gray-600 text-[7px] font-bold px-1 rounded truncate self-start">{schedule.wbItem === 'その他' ? schedule.wbItemDetail : schedule.wbItem}</span>
                         <span className="font-bold text-[8px] text-gray-800 truncate">{schedule.locationDetail}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-1">
                          <span className={`font-black text-[9px] ${style.text}`}>{schedule.開始時間}</span>
                          <span className="bg-gray-100 text-gray-600 text-[8px] font-bold px-1 rounded truncate min-w-0">{schedule.wbItem === 'その他' ? schedule.wbItemDetail : schedule.wbItem}</span>
                        </div>
                        <div className="font-bold text-[9px] text-gray-800 mt-0.5 line-clamp-2">{schedule.locationDetail}</div>
                      </>
                    )}
                  </div>
                );
              })}

              {isDragging && draggedSchedule && schedules.find((s: any) => s.タイムスタンプ === draggedSchedule.タイムスタンプ)?.日付 === targetDateStr && (
                <div className={`absolute bg-[#eaaa43]/80 rounded-[6px] shadow-2xl border-2 border-white border-l-[4px] border-l-[#eaaa43] flex flex-col overflow-hidden ${isZoomed ? 'p-0.5' : 'p-1'} z-50 pointer-events-none transition-none transform scale-105`}
                     style={{ 
                       top: `${dragCurrentTop}px`, 
                       height: `${((parseMins(draggedSchedule.終了時間) - parseMins(draggedSchedule.開始時間)) / 60) * dynamicHourHeight}px`, 
                       left: `${draggedSchedule.computedLeft}%`, 
                       width: `${draggedSchedule.computedWidth}%` 
                     }}>
                  <div className="flex justify-between items-start">
                    <span className="font-black text-[10px] text-white underline decoration-white decoration-2 underline-offset-2">{dragStartTime}</span>
                    <span className="bg-white/30 text-white text-[8px] font-bold px-1 rounded truncate">{draggedSchedule.wbItem}</span>
                  </div>
                  <div className="font-bold text-[9px] text-white mt-0.5">{draggedSchedule.locationDetail}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function WhiteboardContent() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentUser, setCurrentUser] = useState("");
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAbsenceMode, setIsAbsenceMode] = useState(false); 
  
  const [isZoomed, setIsZoomed] = useState(false);

  const [formData, setFormData] = useState({
    タイムスタンプ: '', 日付: getTodayString(), 開始時間: '', 終了時間: '', 担当者: '', 訪問先: '', エリア: '', クライアント: '', 品目: '', 品番: '', 依頼内容: '', 作業内容: '', 作業区分: '修理', 技術料: '0', 修理金額: '0', 販売金額: '0', 提案有無: '無', 提案内容: '', 遠隔高速利用: '無', 伝票番号: '', 状況: '未完了(予定)', メモ: '', 成約有無: '無', locationDetail: '', wbItem: '', wbItemDetail: '', absenceType: '1日休み'
  });

  const [newNoticeText, setNewNoticeText] = useState("");
  const [isNoticeFormOpen, setIsNoticeFormOpen] = useState(false);
  const [noticeTargetDate, setNoticeTargetDate] = useState("");

  // ★ ズーム状態に応じて高さを動的に変更（縮小時は32px）
  const dynamicHourHeight = isZoomed ? 32 : 50; 
  const dynamicMinBlock = isZoomed ? 26 : 44; 

  useEffect(() => {
    setMounted(true);
    const savedWorker = localStorage.getItem('savedWorker');
    if (savedWorker && assignees.includes(savedWorker)) setCurrentUser(savedWorker);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schedulesRes, noticesRes] = await Promise.all([
        fetch(GAS_URL + "?type=whiteboard"),
        fetch(GAS_URL + "?type=notice")
      ]);
      
      const data = await schedulesRes.json();
      let noticesData = [];
      try { noticesData = await noticesRes.json(); } catch(e) { console.error("お知らせパースエラー", e); }

      const parsedSchedules = data.map((row: any) => {
        let locDetail = row.場所の詳細 || row.訪問先 || "(場所未入力)"; 
        let wItem = (row.品目 === '-' || row.品目 === '(-----)') ? "未定" : (row.品目 || "未定"); 
        let wItemDet = "";
        let isAbsence = false;
        let absType = "";
        const memo = row.メモ || "";
        
        const absenceMatch = memo.match(/【WB休み】種類:(.*?)(?:\n|$)/);
        if (absenceMatch) {
          isAbsence = true;
          absType = absenceMatch[1].trim();
        }

        const match = memo.match(/【WB予定】場所:(.*?) \/ 品目:(.*?)(?:\n|$)/);
        if (match) {
          locDetail = match[1].trim();
          const parsedItem = match[2].trim();
          if (wbItems.includes(parsedItem)) wItem = parsedItem;
          else { wItem = "その他"; wItemDet = parsedItem; }
        }

        let startTimeStr = row.開始時間 || "";
        let endTimeStr = row.終了時間 || "";
        if(startTimeStr.length > 5 && startTimeStr.includes('T')) {
           const d = new Date(startTimeStr);
           startTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
        if(endTimeStr.length > 5 && endTimeStr.includes('T')) {
           const d = new Date(endTimeStr);
           endTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }

        return {
          ...row,
          タイムスタンプ: row.タイムスタンプ || "",
          日付: row.日付 || "", 担当者: row.担当者 || "", 開始時間: startTimeStr, 終了時間: endTimeStr, 訪問先: row.訪問先 || "", 依頼内容: row.依頼内容 || "", 作業内容: row.作業内容 || "", メモ: row.メモ || "", locationDetail: locDetail, wbItem: wItem, wbItemDetail: wItemDet, isAbsence, absenceType: absType
        };
      });
      setSchedules(parsedSchedules);

      const parsedNotices = Array.isArray(noticesData) ? noticesData.map((n: any) => ({
        ...n,
        confirmedBy: typeof n.confirmedBy === 'string' && n.confirmedBy !== '' ? n.confirmedBy.split(',') : (Array.isArray(n.confirmedBy) ? n.confirmedBy : [])
      })) : [];
      setNotices(parsedNotices);

    } catch (error) {
      console.error("データ取得エラー", error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncNoticesToGAS = async (updatedNotices: any[]) => {
    try {
      const payloadNotices = updatedNotices.map(n => ({
        ...n,
        confirmedBy: Array.isArray(n.confirmedBy) ? n.confirmedBy.join(',') : n.confirmedBy
      }));
      const payload = { action: 'updateNotices', notices: payloadNotices };
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));
      await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
    } catch (e) {
      console.error("お知らせ保存エラー", e);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = e.target.value;
    setCurrentUser(user);
    if (user) localStorage.setItem('savedWorker', user);
    else localStorage.removeItem('savedWorker');
  };

  const addDays = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };
  
  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    if (start) {
      const [hours, minutes] = start.split(':').map(Number);
      const end = `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setFormData({ ...formData, 開始時間: start, 終了時間: end });
    } else setFormData({ ...formData, 開始時間: start });
  };

  const handleAbsenceModeSwitch = (mode: boolean) => {
    setIsAbsenceMode(mode);
    if (mode) {
      const type = formData.absenceType || "1日休み";
      let start = "08:00"; let end = "17:00";
      if (type === "午前休") { end = "12:00"; }
      else if (type === "午後休") { start = "13:00"; }
      setFormData(prev => ({ ...prev, absenceType: type, 開始時間: start, 終了時間: end }));
    }
  };

  const handleAbsenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    let start = "08:00"; let end = "17:00";
    if (type === "午前休") { end = "12:00"; }
    else if (type === "午後休") { start = "13:00"; }
    setFormData(prev => ({ ...prev, absenceType: type, 開始時間: start, 終了時間: end }));
  };

  const openDetail = (schedule: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  const openNewForm = () => {
    setIsAbsenceMode(false);
    setFormData(prev => ({
      ...prev, タイムスタンプ: '', 日付: dateString, 担当者: currentUser || assignees[0], 開始時間: '', 終了時間: '', 訪問先: '', locationDetail: '', wbItem: '', wbItemDetail: '', エリア: '', 依頼内容: '', 作業内容: '', メモ: '', absenceType: '1日休み'
    }));
    setIsFormOpen(true);
  };

  // 他人の予定ブロック機能
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, staff: string, targetDateStr: string) => {
    if (currentUser && currentUser !== staff) {
      alert(`※ 他の担当者（${staff}さん）の予定は作成できません。\n（全員の予定を作成する場合は、右上のユーザーを「未選択」にしてください）`);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const clickedMinutes = Math.floor((offsetY / dynamicHourHeight) * 2) * 30;
    const startHour = Math.floor(clickedMinutes / 60) + START_HOUR;
    const startMin = clickedMinutes % 60;
    const endHour = Math.floor((clickedMinutes + 60) / 60) + START_HOUR;
    const endMin = (clickedMinutes + 60) % 60;
    
    const startStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    setIsAbsenceMode(false);
    setFormData(prev => ({
      ...prev, タイムスタンプ: '', 日付: targetDateStr, 担当者: staff, 開始時間: startStr, 終了時間: endStr, 訪問先: '', locationDetail: '', wbItem: '', wbItemDetail: '', エリア: '', 依頼内容: '', 作業内容: '', メモ: '', absenceType: '1日休み'
    }));
    setIsFormOpen(true);
  };

  const openEditForm = () => {
    setIsAbsenceMode(selectedSchedule.isAbsence);
    setFormData({ ...formData, ...selectedSchedule });
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!confirm("本当に削除しますか？\n（日報入力画面からも完全に消去されます）")) return;
    setIsDetailOpen(false);
    setIsLoading(true);
    try {
      const payload = { action: 'delete', タイムスタンプ: selectedSchedule.タイムスタンプ };
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));
      await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
      alert("予定を削除しました。");
      fetchData();
    } catch (error) {
      alert("削除中にエラーが発生しました。");
      setIsLoading(false);
    }
  };

  const handleSaveToGAS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let combinedMemo = formData.メモ.replace(/【WB(予定|休み)】.*?(?:\n|$)/g, '').trim();
    let finalPayload: any = { ...formData };

    if (isAbsenceMode) {
      const wbMarker = `【WB休み】種類:${formData.absenceType}`;
      combinedMemo = combinedMemo ? `${wbMarker}\n${combinedMemo}` : wbMarker;
      finalPayload.訪問先 = formData.absenceType; 
      finalPayload.状況 = "休み";
      finalPayload.エリア = "(-----)";
      finalPayload.品目 = "(-----)";
      finalPayload.依頼内容 = "(-----)";
      finalPayload.作業内容 = "(-----)";
      finalPayload.クライアント = "(-----)";
    } else {
      const finalItem = formData.wbItem === 'その他' ? formData.wbItemDetail : formData.wbItem;
      const wbMarker = `【WB予定】場所:${formData.locationDetail} / 品目:${finalItem}`;
      combinedMemo = combinedMemo ? `${wbMarker}\n${combinedMemo}` : wbMarker;
      finalPayload.エリア = formData.エリア || "(-----)";
      finalPayload.品目 = "(-----)"; 
      finalPayload.依頼内容 = formData.依頼内容 || "(-----)";
      finalPayload.作業内容 = formData.作業内容 || "(-----)";
      finalPayload.クライアント = formData.クライアント || "(-----)";
    }
    
    finalPayload.メモ = combinedMemo;
    finalPayload.action = formData.タイムスタンプ ? 'update' : 'create';

    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(finalPayload));
      await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
      alert(formData.タイムスタンプ ? "予定を更新しました！" : "予定を登録しました！");
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      alert("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNoticeConfirm = (noticeId: string) => {
    if (!currentUser) return alert("ユーザーを選択してください");
    const updatedNotices = notices.map(n => {
      if (n.id === noticeId) {
        const confirmed = n.confirmedBy.includes(currentUser);
        return { ...n, confirmedBy: confirmed ? n.confirmedBy.filter((u: string) => u !== currentUser) : [...n.confirmedBy, currentUser] };
      }
      return n;
    });
    setNotices(updatedNotices);
    syncNoticesToGAS(updatedNotices);
  };

  const deleteNotice = (noticeId: string) => {
    if (!confirm("このお知らせを削除しますか？")) return;
    const updatedNotices = notices.filter(n => n.id !== noticeId);
    setNotices(updatedNotices);
    syncNoticesToGAS(updatedNotices);
  };

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newNoticeText || !currentUser) return;
    const newNotice = { id: Date.now().toString(), date: noticeTargetDate, text: newNoticeText, author: currentUser, confirmedBy: [] };
    const updatedNotices = [...notices, newNotice];
    setNotices(updatedNotices);
    syncNoticesToGAS(updatedNotices);
    setNewNoticeText("");
    setIsNoticeFormOpen(false);
  };

  if (!mounted) return <div className="min-h-screen bg-[#f8f6f0]" />;

  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-[10px] px-3 py-2.5 text-[16px] text-gray-800 focus:outline-none focus:border-[#eaaa43] transition-all appearance-none";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-3 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";


  const isEditable = !currentUser || !selectedSchedule || currentUser === selectedSchedule.担当者;

  return (
    <div className="h-screen bg-[#f8f6f0] font-sans text-slate-800 flex flex-col overflow-hidden">
      
      {/* --- ヘッダー領域 --- */}
      <div className="flex-none pt-4 pb-2 px-2 bg-[#f8f6f0] shadow-sm z-40 border-b border-gray-200">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <Link href="/" className="text-[#eaaa43] font-black text-[12px] flex items-center active:scale-95 transition-transform">＜ 戻る</Link>
            <div className="flex items-center bg-white/50 px-2 py-1 rounded-full border border-gray-200 shadow-sm">
              <span className="text-[10px] mr-1">👤</span>
              <select value={currentUser} onChange={handleUserChange} className="bg-transparent text-xs font-bold text-gray-800 outline-none appearance-none">
                <option value="">未選択</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setViewMode('daily')} className={`flex-1 py-1.5 rounded-xl font-black text-[11px] transition-all shadow-sm ${viewMode === 'daily' ? 'bg-[#eaaa43] text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>日別 (1日)</button>
            <button onClick={() => setViewMode('weekly')} className={`flex-1 py-1.5 rounded-xl font-black text-[11px] transition-all shadow-sm ${viewMode === 'weekly' ? 'bg-[#eaaa43] text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>週別 (1週間)</button>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-gray-100">
              <button onClick={() => addDays(viewMode === 'daily' ? -1 : -7)} className="text-[#eaaa43] font-black px-2 active:scale-90 transition-transform">◀</button>
              <span className="font-black text-[11px] tracking-widest text-center min-w-[90px]">
                {viewMode === 'daily' ? formatDateDisplay(currentDate) : `${formatDateDisplay(getWeekDates()[0])}〜`}
              </span>
              <button onClick={() => addDays(viewMode === 'daily' ? 1 : 7)} className="text-[#eaaa43] font-black px-2 active:scale-90 transition-transform">▶</button>
            </div>
            <div className="flex gap-2">
              <Link href="/report" className="bg-blue-50 text-blue-500 border border-blue-200 font-black text-[10px] py-1.5 px-2 rounded-xl active:scale-95 transition-transform shadow-sm">日報入力へ</Link>
              <button onClick={openNewForm} className="bg-white text-[#eaaa43] border border-[#eaaa43] font-black text-[10px] py-1.5 px-2 rounded-xl shadow-sm active:scale-95 transition-transform">＋ 新規作成</button>
            </div>
          </div>

          {/* ★ UI改善：スタイリッシュな1ボタン縮小機能 */}
          <div className="mt-1 pt-1 border-t border-gray-200">
            <button 
              onClick={() => setIsZoomed(!isZoomed)} 
              className={`w-full py-2 rounded-xl font-black text-[11px] transition-all shadow-sm flex justify-center items-center gap-1.5 ${isZoomed ? 'bg-[#eaaa43] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isZoomed ? (
                  <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>
                ) : (
                  <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>
                )}
              </svg>
              {isZoomed ? "標準サイズに戻す" : "スクショ用に1画面に縮小する"}
            </button>
          </div>
        </div>
      </div>

      {/* --- メインキャンバス領域 --- */}
      <div className="flex-1 overflow-y-auto bg-[#f8f6f0] pb-[80px]">
        <div className="sticky top-0 z-30 flex pl-[36px] bg-[#f8f6f0]/95 backdrop-blur-sm border-b border-gray-200 py-1 shadow-sm">
          {assignees.map(staff => (
            <div key={staff} className="flex-1 text-center">
              <div className={`mx-0.5 py-1 rounded-[6px] ${staffStyles[staff].headerBg} border-b-2 ${staffStyles[staff].border}`}><span className="font-black text-[10px]">{staff}</span></div>
            </div>
          ))}
        </div>

        {viewMode === 'daily' ? (
           <div className="flex flex-col relative">
             <NoticeBanner targetDateStr={dateString} notices={notices} currentUser={currentUser} deleteNotice={deleteNotice} toggleNoticeConfirm={toggleNoticeConfirm} setNoticeTargetDate={setNoticeTargetDate} setIsNoticeFormOpen={setIsNoticeFormOpen} />
             <TimelineCanvas targetDateStr={dateString} schedules={schedules} setSchedules={setSchedules} openDetail={openDetail} handleCanvasClick={handleCanvasClick} fetchData={fetchData} isZoomed={isZoomed} dynamicHourHeight={dynamicHourHeight} dynamicMinBlock={dynamicMinBlock} />
           </div>
        ) : (
           <div className="flex flex-col gap-4 py-2">
             {getWeekDates().map((date, i) => {
               const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
               return (
                 <div key={i} className="bg-white rounded-xl shadow-sm mx-1 overflow-hidden border border-gray-200 mt-2">
                   <div className="bg-gray-100 px-3 py-1.5 font-black text-xs text-gray-700 border-b border-gray-200">
                     {formatDateDisplay(date)}
                   </div>
                    <NoticeBanner targetDateStr={dStr} notices={notices} currentUser={currentUser} deleteNotice={deleteNotice} toggleNoticeConfirm={toggleNoticeConfirm} setNoticeTargetDate={setNoticeTargetDate} setIsNoticeFormOpen={setIsNoticeFormOpen} />
                    <TimelineCanvas targetDateStr={dStr} schedules={schedules} setSchedules={setSchedules} openDetail={openDetail} handleCanvasClick={handleCanvasClick} fetchData={fetchData} isZoomed={isZoomed} dynamicHourHeight={dynamicHourHeight} dynamicMinBlock={dynamicMinBlock} />
                 </div>
               );
             })}
           </div>
        )}
      </div>

      {/* --- 詳細モーダル --- */}
      {isDetailOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}>
          <div className="bg-[#f8f6f0] w-full max-w-sm rounded-[20px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-3 flex justify-between items-center text-white ${selectedSchedule.isAbsence ? 'bg-red-500' : staffStyles[selectedSchedule.担当者].dot}`}>
              <h2 className="font-black text-sm tracking-widest">{selectedSchedule.isAbsence ? '休み設定の詳細' : '予定の詳細'}</h2>
              <button onClick={() => setIsDetailOpen(false)} className="text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 bg-white space-y-2">
              <p className="text-xs"><strong>担当:</strong> {selectedSchedule.担当者}</p>
              <p className="text-xs"><strong>時間:</strong> {selectedSchedule.開始時間} 〜 {selectedSchedule.終了時間}</p>
              {selectedSchedule.isAbsence ? (
                <p className="text-xs text-red-600 font-bold"><strong>種類:</strong> {selectedSchedule.absenceType}</p>
              ) : (
                <>
                  <p className="text-xs"><strong>訪問先:</strong> {selectedSchedule.訪問先}</p>
                  <p className="text-xs"><strong>場所:</strong> {selectedSchedule.locationDetail}</p>
                  <p className="text-xs"><strong>品目:</strong> {selectedSchedule.wbItem === 'その他' ? selectedSchedule.wbItemDetail : selectedSchedule.wbItem}</p>
                </>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 flex gap-2">
              <button onClick={() => setIsDetailOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform">閉じる</button>
              
              {isEditable ? (
                <>
                  <button onClick={handleDelete} className="flex-1 bg-white border border-red-500 text-red-500 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform">🗑️ 削除</button>
                  <button onClick={openEditForm} className="flex-1 bg-[#eaaa43] text-white py-2.5 rounded-xl text-sm font-black tracking-widest active:scale-95 transition-transform">編集する</button>
                </>
              ) : (
                <div className="flex-1 text-center text-[10px] text-gray-400 font-bold self-center flex flex-col">
                  <span>※他の担当者の予定は</span>
                  <span>編集・削除できません</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 予定登録フォーム --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-[#f8f6f0] rounded-t-[20px] sm:rounded-[20px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-white px-4 py-3 border-b flex justify-between items-center z-10 shrink-0">
              <h2 className="font-black text-[#eaaa43] text-sm">{formData.タイムスタンプ ? '予定の編集' : '予定を登録'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
                <button type="button" onClick={() => handleAbsenceModeSwitch(false)} className={`flex-1 py-2 rounded-md font-black text-[11px] transition-colors ${!isAbsenceMode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>🛠 通常の予定</button>
                <button type="button" onClick={() => handleAbsenceModeSwitch(true)} className={`flex-1 py-2 rounded-md font-black text-[11px] transition-colors ${isAbsenceMode ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'}`}>🏖️ 休み登録</button>
              </div>

              <form onSubmit={handleSaveToGAS} className="space-y-4 pb-10">
                <div className="bg-white p-3 rounded-xl shadow-sm space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className={selectWrapperClass}>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">担当者</label>
                      <select name="担当者" value={formData.担当者} onChange={handleFormChange} required className={inputBaseClass}>
                        <option value="">(選択)</option>{assignees.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">日付</label>
                      <input type="date" name="日付" value={formData.日付} onChange={handleFormChange} required className={inputBaseClass} />
                    </div>
                  </div>

                  {isAbsenceMode ? (
                    <div className="border-t border-gray-100 pt-3">
                       <div className={selectWrapperClass}>
                         <label className="block text-[10px] font-bold text-red-500 mb-0.5">休みの種類</label>
                         <select name="absenceType" value={formData.absenceType} onChange={handleAbsenceTypeChange} className={`${inputBaseClass} border-red-200 focus:border-red-500`}>
                           {absenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                       </div>
                       <div className="flex gap-2 mt-2">
                         <input type="time" name="開始時間" value={formData.開始時間} onChange={handleFormChange} required className={`${inputBaseClass} text-xs`} />
                         <span className="self-center font-bold text-gray-400">〜</span>
                         <input type="time" name="終了時間" value={formData.終了時間} onChange={handleFormChange} required className={`${inputBaseClass} text-xs`} />
                       </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">開始時間</label>
                        <input type="time" name="開始時間" value={formData.開始時間} onChange={handleStartTimeChange} required className={inputBaseClass} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">終了時間</label>
                        <input type="time" name="終了時間" value={formData.終了時間} onChange={handleFormChange} required className={inputBaseClass} />
                      </div>
                    </div>
                  )}
                </div>

                {!isAbsenceMode && (
                  <>
                    <div className="bg-white p-3 rounded-xl shadow-sm space-y-3 border-l-4 border-blue-400">
                      <p className="text-[9px] font-bold text-blue-500 mb-1">▼ 日報入力側にも登録される項目</p>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">訪問先名（顧客名など）</label>
                        <input type="text" name="訪問先" value={formData.訪問先} onChange={handleFormChange} required className={inputBaseClass} />
                      </div>
                      <div className={selectWrapperClass}>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">エリア</label>
                        <select name="エリア" value={formData.エリア} onChange={handleFormChange} className={inputBaseClass}>
                          <option value="">(任意)</option>
                          {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">場所の詳細 (WB表示用)</label>
                        <input type="text" name="locationDetail" value={formData.locationDetail} onChange={handleFormChange} required className={inputBaseClass} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                        <div className={selectWrapperClass}>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">依頼内容</label>
                          <select name="依頼内容" value={formData.依頼内容} onChange={handleFormChange} className={inputBaseClass}>
                            <option value="">(任意)</option>
                            {requestContents.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className={selectWrapperClass}>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">作業内容</label>
                          <select name="作業内容" value={formData.作業内容} onChange={handleFormChange} className={inputBaseClass}>
                            <option value="">(任意)</option>
                            {workContents.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl shadow-sm space-y-3 border-l-4 border-[#eaaa43]">
                      <p className="text-[9px] font-bold text-[#eaaa43] mb-1">▼ ホワイトボード専用項目</p>
                      <div className={selectWrapperClass}>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">品目 (WB用)</label>
                        <select name="wbItem" value={formData.wbItem} onChange={handleFormChange} required className={inputBaseClass}>
                          <option value="">(選択)</option>
                          {wbItems.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                      {formData.wbItem === 'その他' && (
                        <input type="text" name="wbItemDetail" value={formData.wbItemDetail} onChange={handleFormChange} placeholder="詳細を入力" required className={inputBaseClass} />
                      )}
                    </div>
                  </>
                )}

                <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl text-sm font-black tracking-widest active:scale-95 transition-transform shadow-md disabled:bg-gray-400 ${isAbsenceMode ? 'bg-red-500 text-white' : 'bg-[#eaaa43] text-white'}`}>
                  {isSubmitting ? '送信中...' : (isAbsenceMode ? '休みを登録する' : (formData.タイムスタンプ ? '更新して保存する' : '予定を登録する'))}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- お知らせ追加モーダル --- */}
      {isNoticeFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[20px] p-5 shadow-2xl">
             <h3 className="font-black text-[#eaaa43] mb-3 text-sm">{noticeTargetDate} のお知らせを追加</h3>
             <form onSubmit={handleAddNotice} className="space-y-4">
               <textarea value={newNoticeText} onChange={(e) => setNewNoticeText(e.target.value)} placeholder="例：午後から運搬車を使います" className={`${inputBaseClass} h-24 resize-none`} required />
               <div className="flex gap-2">
                 <button type="button" onClick={() => setIsNoticeFormOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform">キャンセル</button>
                 <button type="submit" className="flex-1 bg-[#eaaa43] text-white py-2.5 rounded-xl text-sm font-black tracking-widest active:scale-95 transition-transform">追加する</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* --- フッター --- */}
      <div className="fixed bottom-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto z-50">
        <Link href="/" className="p-2 cursor-pointer active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Link>
        <div className="p-2 cursor-pointer active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <div className="p-2 cursor-pointer relative active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eaaa43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#eaaa43] rounded-full border-2 border-white"></span>
        </div>
        <div className="p-2 cursor-pointer active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </div>
    </div>
  );
}

export default function WhiteboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-[#f8f6f0] text-[#eaaa43] font-black text-sm">カレンダーを準備中...</div>}>
      <WhiteboardContent />
    </Suspense>
  );
}
