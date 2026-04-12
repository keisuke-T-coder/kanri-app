"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- GAS連携情報と選択肢 ---
const GAS_URL = '/api/gas';
const requestContents = ["水漏れ", "作動不良", "開閉不良", "破損", "異音", "詰り関係", "その他"];
const workContents = ["部品交換", "製品交換、取付", "清掃", "点検", "見積", "応急処置", "その他"];

// --- スタッフ設定 ---
const assignees = ["田中", "南", "新田", "徳重", "佐藤"];
const staffStyles: Record<string, { border: string, bg: string, text: string, dot: string, headerBg: string }> = {
  "南": { border: "border-orange-400", bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400", headerBg: "bg-orange-100 text-orange-800" },
  "新田": { border: "border-green-400", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-400", headerBg: "bg-green-100 text-green-800" },
  "徳重": { border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400", headerBg: "bg-purple-100 text-purple-800" },
  "田中": { border: "border-cyan-400", bg: "bg-cyan-50", text: "text-cyan-600", dot: "bg-cyan-400", headerBg: "bg-cyan-100 text-cyan-800" },
  "佐藤": { border: "border-gray-400", bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", headerBg: "bg-gray-200 text-gray-800" },
};

const wbItems = ["DW", "AW", "EW", "KS", "PH", "1D", "1A", "2A", "RS", "MT", "ハウス", "リビング", "ひだまり", "JIO", "LTS", "トータルサービス", "その他"];
const areas = ["市街地エリア", "市内北部エリア", "市内南部エリア", "北薩エリア", "南薩エリア", "鹿屋エリア", "霧島エリア", "トータルサービス", "その他"];
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
  const parts = t.split(':').map(Number);
  if (parts.length < 2) return 0;
  const [h, m] = parts;
  return h * 60 + (m || 0);
};

// --- ヘルパー関数 ---
const processOverlaps = (staffSchedules: any[]) => {
  const parsed = staffSchedules.map(s => ({ ...s, startMins: parseMins(s.start_time), endMins: parseMins(s.end_time) }))
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
  const daySchedules = schedules.filter((s: any) => s.date === targetDateStr);
  
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  const [isPressing, setIsPressing] = useState(false); 
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
    
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    setIsDragging(false);
    setIsActuallyDragging(false);
    setIsPressing(true);
    setDragStartY(clientY);
    setDraggedSchedule(schedule);
    setDragOffsetY(offsetY);
    setDragCurrentTop(rect.top - (e.currentTarget.parentElement?.getBoundingClientRect().top || 0));
    setDragStartTime(schedule.start_time);
    setDragEndTime(schedule.end_time);

    longPressTimerRef.current = setTimeout(() => {
      setIsDragging(true);
      setIsActuallyDragging(true);
      setIsPressing(false);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    }, 1000);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    if (!isDragging && isPressing) {
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
    
    const durationMins = parseMins(draggedSchedule.end_time) - parseMins(draggedSchedule.start_time);
    const endTotalMins = (startHour - START_HOUR) * 60 + startMin + durationMins;
    const endHour = Math.floor(endTotalMins / 60) + START_HOUR;
    const endMin = endTotalMins % 60;

    const newStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const newEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    setDragStartTime(newStart);
    setDragEndTime(newEnd);
  };

  const dragFinishedRef = React.useRef(false);

  const handleMouseUp = async (e: MouseEvent | TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const wasDraggingBefore = isDragging;
    const wasPressingBefore = isPressing;

    if (!isDragging && !isPressing && !draggedSchedule) return;
    
    const hasChanged = isDragging && isActuallyDragging && (dragStartTime !== draggedSchedule.start_time || dragEndTime !== draggedSchedule.end_time);
    
    if (hasChanged) {
      const updatedSchedule = { ...draggedSchedule, start_time: dragStartTime, end_time: dragEndTime };
      setSchedules((prev: any[]) => prev.map(s => s.id === draggedSchedule.id ? updatedSchedule : s));
      
      const saveToGAS = async (payload: any) => {
        try {
          const res = await fetch(GAS_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ ...payload, action: 'update' }) 
          });
          if (!res.ok) throw new Error("保存エラー");
        } catch (error) {
          console.error("サーバー保存エラー", error);
          alert("通信エラーが発生しました。最新の状態を読み込みます。");
          fetchData();
        }
      };
      saveToGAS(updatedSchedule);

      dragFinishedRef.current = true;
      setTimeout(() => dragFinishedRef.current = false, 100);
    }

    if (!wasDraggingBefore && wasPressingBefore && draggedSchedule) {
      openDetail(draggedSchedule, e as any);
    }

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
          const staffSchedules = processOverlaps(daySchedules.filter((s: any) => s.assignee === staff));
          const style = staffStyles[staff];
          return (
            <div key={staff} 
                 className="flex-1 border-r border-gray-50 relative min-w-[50px] hover:bg-gray-50/50 transition-colors"
                 onClick={(e) => {
                   if (isDragging || isActuallyDragging || isPressing || dragFinishedRef.current) return;
                   if (e.target !== e.currentTarget) return;
                   handleCanvasClick(e, staff, targetDateStr);
                 }}> 
              
              {staffSchedules.map((schedule, idx) => {
                const startMins = schedule.startMins - (START_HOUR * 60);
                const endMins = schedule.endMins - (START_HOUR * 60);
                const topPx = (startMins / 60) * dynamicHourHeight;
                let heightPx = ((endMins - startMins) / 60) * dynamicHourHeight;
                heightPx = Math.max(heightPx, dynamicMinBlock); 

                const isCurrentPressing = isPressing && draggedSchedule?.id === schedule.id;

                if (schedule.isAbsence) {
                  return (
                    <div key={schedule.id || idx} onClick={(e) => openDetail(schedule, e)} className="absolute bg-red-500 rounded-[4px] shadow-sm cursor-pointer active:scale-95 transition-transform flex flex-col justify-center items-center overflow-hidden border border-red-600 z-20" 
                         style={{ top: `${Math.max(0, topPx)}px`, height: `${heightPx}px`, left: `${schedule.computedLeft}%`, width: `${schedule.computedWidth}%` }}>
                      <span className={`text-white font-black writing-vertical-rl ${isZoomed ? 'text-[8px]' : 'text-[10px]'}`}>{schedule.absenceType}</span>
                    </div>
                  );
                }
                return (
                  <div key={schedule.id || idx} 
                       onMouseDown={(e) => handleMouseDown(e, schedule)}
                       onTouchStart={(e) => handleMouseDown(e, schedule)}
                       className={`absolute bg-white rounded-[6px] shadow-md border ${style.border} border-l-[4px] cursor-pointer transition-all flex flex-col overflow-hidden ${isZoomed ? 'p-0.5' : 'p-1'} z-20 leading-tight ${(isDragging || isActuallyDragging) && draggedSchedule?.id === schedule.id ? 'opacity-0 scale-95' : ''} ${isCurrentPressing ? 'ring-4 ring-orange-400 ring-opacity-50 animate-pulse bg-orange-50' : ''}`} 
                       style={{ top: `${Math.max(0, topPx)}px`, height: `${heightPx}px`, left: `${schedule.computedLeft}%`, width: `${schedule.computedWidth}%` }}>
                    
                    {isZoomed ? (
                      <div className="flex flex-col gap-0.5 justify-center h-full">
                         <span className="bg-gray-100 text-gray-600 text-[7px] font-bold px-1 rounded truncate self-start">{schedule.wbItem === 'その他' ? schedule.wbItemDetail : schedule.wbItem}</span>
                         <span className="font-bold text-[8px] text-gray-800 truncate">{schedule.locationDetail}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-1">
                          <span className={`font-black text-[9px] ${style.text}`}>{schedule.start_time}</span>
                          <span className="bg-gray-100 text-gray-600 text-[8px] font-bold px-1 rounded truncate min-w-0">{schedule.wbItem === 'その他' ? schedule.wbItemDetail : schedule.wbItem}</span>
                        </div>
                        <div className="font-bold text-[9px] text-gray-800 mt-0.5 line-clamp-2">{schedule.locationDetail}</div>
                      </>
                    )}
                  </div>
                );
              })}

              {isDragging && draggedSchedule && schedules.find((s: any) => s.id === draggedSchedule.id)?.date === targetDateStr && (
                <div className={`absolute bg-[#eaaa43]/80 rounded-[6px] shadow-2xl border-2 border-white border-l-[4px] border-l-[#eaaa43] flex flex-col overflow-hidden ${isZoomed ? 'p-0.5' : 'p-1'} z-50 pointer-events-none transition-none transform scale-105`}
                     style={{ 
                       top: `${dragCurrentTop}px`, 
                       height: `${((parseMins(draggedSchedule.end_time) - parseMins(draggedSchedule.start_time)) / 60) * dynamicHourHeight}px`, 
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
  const router = useRouter();
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
    id: '', date: getTodayString(), start_time: '', end_time: '', assignee: '', destination: '', area: '', client: '', item: '', part_number: '', request_content: '', work_content: '', work_type: '修理', tech_fee: '0', repair_amount: '0', sales_amount: '0', proposal_exists: '無', proposal_content: '', remote_highway_fee: '無', slip_number: '', status: '未完了(予定)', memo: '', locationDetail: '', wbItem: '', wbItemDetail: '', absenceType: '1日休み', report_data_id: ''
  });

  const [newNoticeText, setNewNoticeText] = useState("");
  const [isNoticeFormOpen, setIsNoticeFormOpen] = useState(false);
  const [noticeTargetDate, setNoticeTargetDate] = useState("");

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
      if (data && data.success === false) {
        throw new Error(data.error || "予定データの取得に失敗しました");
      }

      let noticesData = [];
      try { 
        noticesData = await noticesRes.json();
      } catch(e) { console.error("お知らせパースエラー", e); }

      // データ解析の強化: 日報データ（タグなし）でも表示できるように調整
      const parsedSchedules = (Array.isArray(data) ? data : []).map((row: any) => {
        // キーワードがない場合、エリアと訪問先を場所として採用
        let locDetail = row.area && row.destination ? `${row.area} / ${row.destination}` : (row.area || row.destination || "(未入力)"); 
        let wItem = (row.item === '-' || row.item === '(-----)' || !row.item) ? "未定" : (row.item || "未定"); 
        let wItemDet = "";
        let isAbsence = false;
        let absType = "";
        const memo = row.memo || "";
        
        const absenceMatch = memo.match(/【WB休み】種類:(.*?)(?:\n|$)/);
        // 判定強化: 作業区分がお休み、または訪問先/エリアに「休み」が含まれる場合も対象にする
        if (absenceMatch || row.work_type === 'お休み' || (row.destination && row.destination.includes('休み')) || (row.area && row.area.includes('休み'))) {
          isAbsence = true;
          absType = absenceMatch ? absenceMatch[1].trim() : (row.destination || "お休み");
          locDetail = absType;
        }

        const match = memo.match(/【WB予定】場所:(.*?) \/ 品目:(.*?)(?:\n|$)/);
        if (match) {
          locDetail = match[1].trim();
          const parsedItem = match[2].trim();
          if (wbItems.includes(parsedItem)) wItem = parsedItem;
          else { wItem = "その他"; wItemDet = parsedItem; }
        }

        const formatTime = (t: string) => {
          if (!t) return "";
          const s = String(t);
          if (s.includes(' ')) {
            const timePart = s.split(' ')[1];
            return timePart.substring(0, 5);
          }
          if (s.includes('T')) {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
          }
          return s.substring(0, 5);
        };

        // 日付の正規化 (ローカル時刻を尊重して YYYY-MM-DD 形式に揃える)
        const normalizeDateStr = (dStr: any) => {
          if (!dStr) return "";
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return String(dStr);
          // タイムゾーンのずれ（UTC解析による1日戻り）を防ぐため、ローカルの日付を取得
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const normalizedDate = normalizeDateStr(row.date);

        return {
          ...row,
          date: normalizedDate,
          start_time: formatTime(row.start_time),
          end_time: formatTime(row.end_time),
          locationDetail: locDetail, 
          wbItem: wItem, 
          wbItemDetail: wItemDet, 
          isAbsence, 
          absenceType: absType
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
      await fetch(GAS_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
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
      const end = `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
      setFormData({ ...formData, start_time: start, end_time: end });
    } else setFormData({ ...formData, start_time: start });
  };

  const handleAbsenceModeSwitch = (mode: boolean) => {
    setIsAbsenceMode(mode);
    if (mode) {
      const type = formData.absenceType || "1日休み";
      let start = "08:00"; let end = "17:00";
      if (type === "午前休") { end = "12:00"; }
      else if (type === "午後休") { start = "13:00"; }
      setFormData(prev => ({ ...prev, absenceType: type, start_time: start, end_time: end }));
    }
  };

  const handleAbsenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    let start = "08:00"; let end = "17:00";
    if (type === "午前休") { end = "12:00"; }
    else if (type === "午後休") { start = "13:00"; }
    setFormData(prev => ({ ...prev, absenceType: type, start_time: start, end_time: end }));
  };

  const openDetail = (schedule: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  const openNewForm = () => {
    setIsAbsenceMode(false);
    setFormData({
      id: '', date: dateString, assignee: currentUser || assignees[0], start_time: '', end_time: '', destination: '', area: '', client: '', item: '', part_number: '', request_content: '', work_content: '', work_type: '修理', tech_fee: '0', repair_amount: '0', sales_amount: '0', proposal_exists: '無', proposal_content: '', remote_highway_fee: '無', slip_number: '', status: '未完了(予定)', memo: '', locationDetail: '', wbItem: '', wbItemDetail: '', absenceType: '1日休み', report_data_id: ''
    });
    setIsFormOpen(true);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, staff: string, targetDateStr: string) => {
    if (currentUser && currentUser !== staff) {
      alert(`※ 他の担当者（${staff}さん）の予定は作成できません。`);
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
    setFormData({
      id: '', date: targetDateStr, assignee: staff, start_time: startStr, end_time: endStr, destination: '', area: '', client: '', item: '', part_number: '', request_content: '', work_content: '', work_type: '修理', tech_fee: '0', repair_amount: '0', sales_amount: '0', proposal_exists: '無', proposal_content: '', remote_highway_fee: '無', slip_number: '', status: '未完了(予定)', memo: '', locationDetail: '', wbItem: '', wbItemDetail: '', absenceType: '1日休み', report_data_id: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = () => {
    setIsAbsenceMode(selectedSchedule.isAbsence);
    const updatedForm = { ...formData, ...selectedSchedule };
    setFormData(updatedForm);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!confirm("本当に削除しますか？")) return;
    setIsDetailOpen(false);
    setIsLoading(true);
    try {
      const payload = { 
        action: 'delete', 
        id: selectedSchedule.id 
      };

      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success === false) throw new Error(result.error);
      alert("予定を削除しました。");
      fetchData();
    } catch (error) {
      alert("エラーが発生しました: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalMemo = formData.memo || "";
      if (isAbsenceMode) {
        finalMemo = `【WB休み】種類:${formData.absenceType}\n${finalMemo}`;
      } else if (formData.wbItem) {
        const itemLabel = formData.wbItem === 'その他' ? (formData.wbItemDetail || '') : formData.wbItem;
        const locLabel = formData.area && formData.destination 
          ? `${formData.area} / ${formData.destination}` 
          : (formData.area || formData.destination || "");
        finalMemo = `【WB予定】場所:${locLabel} / 品目:${itemLabel}\n${finalMemo}`;
      }

      // 表示用のラベルを エリア / 訪問先 の形式で生成
      const formattedLocation = formData.area && formData.locationDetail 
        ? `${formData.area} / ${formData.locationDetail}` 
        : (formData.area || formData.locationDetail || "");

      const payload = {
        ...formData,
        // スプレッドシートの項目名にマッピング
        area: isAbsenceMode ? "(お休み)" : formData.area,
        destination: isAbsenceMode ? formData.absenceType : formData.destination,
        work_type: isAbsenceMode ? "お休み" : "修理",
        item: isAbsenceMode ? "" : (formData.wbItem === 'その他' ? (formData.wbItemDetail || 'その他') : formData.wbItem),
        action: formData.id ? 'update' : 'create',
        memo: finalMemo,
        locationDetail: isAbsenceMode 
          ? formData.absenceType 
          : ((formData.area && formData.destination) ? `${formData.area} / ${formData.destination}` : (formData.area || formData.destination || "")) 
      };

      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success === false) throw new Error(result.error);

      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      alert("保存エラー: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteNotice = async (id: string) => {
    if (!confirm("お知らせを削除しますか？")) return;
    const updated = notices.filter(n => n.id !== id);
    setNotices(updated);
    await syncNoticesToGAS(updated);
  };

  const toggleNoticeConfirm = async (id: string) => {
    if (!currentUser) {
      alert("担当者を選択してください。");
      return;
    }
    const updated = notices.map(n => {
      if (n.id === id) {
        const confs = Array.isArray(n.confirmedBy) ? [...n.confirmedBy] : [];
        if (confs.includes(currentUser)) {
          return { ...n, confirmedBy: confs.filter(c => c !== currentUser) };
        } else {
          return { ...n, confirmedBy: [...confs, currentUser] };
        }
      }
      return n;
    });
    setNotices(updated);
    await syncNoticesToGAS(updated);
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeText.trim() || !currentUser) return;
    const newN = {
      id: `notice-${Date.now()}`,
      date: noticeTargetDate,
      author: currentUser,
      text: newNoticeText,
      confirmedBy: [],
      isActive: true,
      isUrgent: false
    };
    const updated = [newN, ...notices];
    setNotices(updated);
    setIsNoticeFormOpen(false);
    setNewNoticeText("");
    await syncNoticesToGAS(updated);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* 画面上部 */}
      <div className="w-full max-w-[1200px] bg-white shadow-sm px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-0 z-[60]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1 font-bold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              ホーム
            </Link>
            <div className="w-[1px] h-4 bg-gray-200"></div>
            <Link href="/report" className="text-orange-500 font-bold flex items-center hover:opacity-70 transition-opacity text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
              戻る
            </Link>
          </div>
          <div className="bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2 border border-gray-200">
             <span className="text-[10px] text-gray-400 font-bold">👤</span>
             <select value={currentUser} onChange={handleUserChange} className="bg-transparent text-xs font-bold outline-none cursor-pointer">
               <option value="">未選択</option>
               {assignees.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
          </div>
        </div>

        <div className="flex bg-orange-100/50 p-1 rounded-xl">
           <div className="px-6 py-1.5 rounded-lg text-xs font-black bg-[#eaaa43] text-white shadow-sm">日別 (1日)</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
            <button onClick={() => addDays(-1)} className="text-orange-500 font-black p-1 active:scale-90 transition-transform">◀</button>
            <span className="text-sm font-black mx-4 text-gray-700 min-w-[100px] text-center">{formatDateDisplay(currentDate)}</span>
            <button onClick={() => addDays(1)} className="text-orange-500 font-black p-1 active:scale-90 transition-transform">▶</button>
          </div>
          <button onClick={openNewForm} className="bg-[#eaaa43] text-white px-4 py-1.5 rounded-full text-xs font-black shadow-sm active:scale-95 transition-transform">＋ 新規作成</button>
        </div>
      </div>

      <div className="w-full flex justify-center bg-white border-b border-gray-100 py-1">
         <button onClick={() => setIsZoomed(!isZoomed)} className="text-[10px] font-bold text-gray-400 flex items-center gap-1 active:scale-95 transition-transform">
           {isZoomed ? '🔍 縮小する' : '⤢ スクショ用に1画面に縮小する'}
         </button>
      </div>

      {/* タイムライン表示エリア */}
      <div className="w-full max-w-[1240px] overflow-x-auto bg-white shadow-sm [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-orange-200 [&::-webkit-scrollbar-track]:bg-gray-50">
        <div className="min-w-[800px] flex flex-col">
          {/* スタッフヘッダー */}
          <div className="flex w-full sticky top-0 z-40 bg-white border-b border-gray-100 pt-2">
            <div className="w-[36px] shrink-0"></div>
            {assignees.map(staff => (
              <div key={staff} className={`flex-1 flex justify-center py-2 px-1 border-r border-gray-50 last:border-r-0 ${staffStyles[staff].headerBg} rounded-t-xl mx-0.5 font-black text-xs tracking-widest`}>
                {staff}
              </div>
            ))}
          </div>

          {/* コンテンツ */}
          <div className="flex w-full relative">
            {viewMode === 'daily' && (
              <div className="flex-1 flex flex-col">
                <NoticeBanner 
                  targetDateStr={dateString} 
                  notices={notices} 
                  currentUser={currentUser} 
                  deleteNotice={deleteNotice} 
                  toggleNoticeConfirm={toggleNoticeConfirm} 
                  setNoticeTargetDate={setNoticeTargetDate} 
                  setIsNoticeFormOpen={setIsNoticeFormOpen} 
                />
                <TimelineCanvas 
                  targetDateStr={dateString} 
                  schedules={schedules} 
                  setSchedules={setSchedules} 
                  openDetail={openDetail} 
                  handleCanvasClick={handleCanvasClick} 
                  fetchData={fetchData} 
                  isZoomed={isZoomed} 
                  dynamicHourHeight={dynamicHourHeight} 
                  dynamicMinBlock={dynamicMinBlock} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {isDetailOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsDetailOpen(false)}>
          <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <div className={`p-6 ${selectedSchedule.isAbsence ? 'bg-red-500' : 'bg-[#eaaa43]'} text-white relative`}>
               <button onClick={() => setIsDetailOpen(false)} className="absolute top-4 right-4 text-white hover:opacity-70 transition-opacity">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
               <div className="text-[11px] font-black bg-white/20 inline-block px-2 py-0.5 rounded-full mb-2 uppercase tracking-widest">Details</div>
               <h3 className="text-xl font-black">{selectedSchedule.isAbsence ? selectedSchedule.absenceType : (selectedSchedule.wbItem === 'その他' ? selectedSchedule.wbItemDetail : selectedSchedule.wbItem)}</h3>
               <div className="flex items-center gap-2 mt-2 opacity-90 text-sm font-bold">
                 <span>🕒 {selectedSchedule.start_time} - {selectedSchedule.end_time}</span>
                 <span className="bg-white/30 px-2 py-0.5 rounded-md">👤 {selectedSchedule.assignee}</span>
               </div>
            </div>
            <div className="p-6 space-y-4">
               {!selectedSchedule.isAbsence && (
                 <div>
                   <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-wider">Location / Destination</label>
                   <p className="text-sm font-black text-gray-800 leading-snug">{selectedSchedule.locationDetail}</p>
                 </div>
               )}
               {selectedSchedule.memo && (
                 <div>
                   <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-wider">Memo / Notes</label>
                   <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                     <p className="text-xs text-gray-600 font-bold leading-relaxed whitespace-pre-wrap">{selectedSchedule.memo}</p>
                   </div>
                 </div>
               )}
               <div className="flex gap-3 pt-2">
                 <button onClick={handleDelete} className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-black text-xs border border-red-100 active:scale-95 transition-all">削除する</button>
                 <button onClick={openEditForm} className="flex-1 bg-[#eaaa43] text-white py-3 rounded-xl font-black text-xs shadow-md active:scale-95 transition-all">編集する</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 登録・編集フォームモーダル */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] overflow-y-auto p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl relative">
            <div className={`p-6 rounded-t-[24px] ${isAbsenceMode ? 'bg-red-500' : 'bg-[#eaaa43]'} text-white`}>
              <button onClick={() => setIsFormOpen(false)} className="absolute top-6 right-6 text-white hover:opacity-70 transition-opacity">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <h3 className="text-lg font-black tracking-widest">{formData.id ? '予定の編集' : '新規予定の登録'}</h3>
              <div className="flex gap-2 mt-4 bg-white/20 p-1 rounded-xl">
                 <button type="button" onClick={() => handleAbsenceModeSwitch(false)} className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all ${!isAbsenceMode ? 'bg-white text-gray-800' : 'text-white'}`}>通常予定</button>
                 <button type="button" onClick={() => handleAbsenceModeSwitch(true)} className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all ${isAbsenceMode ? 'bg-white text-red-500' : 'text-white'}`}>お休み・半休</button>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Assignee</label>
                  <select name="assignee" value={formData.assignee} onChange={handleFormChange} required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]">
                    {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleFormChange} required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Start</label>
                  <input type="time" name="start_time" value={formData.start_time} onChange={handleStartTimeChange} required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">End</label>
                  <input type="time" name="end_time" value={formData.end_time} onChange={handleFormChange} required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]" />
                </div>
              </div>

              {!isAbsenceMode ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Work Category</label>
                      <select name="wbItem" value={formData.wbItem} onChange={handleFormChange} required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]">
                        <option value="">選択してください</option>
                        {wbItems.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    {formData.wbItem === 'その他' && (
                      <div className="animate-fade-in">
                        <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Other Detail</label>
                        <input type="text" name="wbItemDetail" value={formData.wbItemDetail} onChange={handleFormChange} placeholder="具体的な項目名" required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Area</label>
                      <input type="text" name="area" value={formData.area} onChange={handleFormChange} placeholder="例: 霧島エリア" required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Location / Destination</label>
                      <input type="text" name="destination" value={formData.destination} onChange={handleFormChange} placeholder="現場名・訪問先" required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#eaaa43]" />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Absence Category</label>
                  <select name="absenceType" value={formData.absenceType} onChange={handleAbsenceTypeChange} required className="w-full bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm font-bold text-red-600 outline-none focus:border-red-400">
                    {absenceTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 ml-1 block uppercase">Memo</label>
                <textarea name="memo" value={formData.memo} onChange={handleFormChange} rows={3} placeholder="特記事項など" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#eaaa43] resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-black text-xs active:scale-95 transition-transform">キャンセル</button>
                <button type="submit" disabled={isSubmitting} className={`flex-1 ${isAbsenceMode ? 'bg-red-500' : 'bg-[#eaaa43]'} text-white py-4 rounded-xl font-black text-xs shadow-md active:scale-95 transition-transform disabled:opacity-50`}>
                  {isSubmitting ? '保存中...' : (formData.id ? '上書き保存する' : '新しく登録する')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* お知らせ登録用ミニモーダル */}
      {isNoticeFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsNoticeFormOpen(false)}>
           <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-[#eaaa43] font-black tracking-widest text-base mb-1">お知らせを追加</h3>
              <p className="text-[10px] text-gray-400 font-bold mb-4">{noticeTargetDate} のホワイトボード上に表示されます</p>
              <form onSubmit={handleNoticeSubmit} className="space-y-4">
                 <textarea 
                    value={newNoticeText} 
                    onChange={e => setNewNoticeText(e.target.value)} 
                    placeholder="スタッフ全員に周知する内容を入力してください..." 
                    required 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#eaaa43] h-28 resize-none"
                 />
                 <div className="flex gap-3">
                    <button type="button" onClick={() => setIsNoticeFormOpen(false)} className="flex-1 text-gray-400 font-black text-xs">キャンセル</button>
                    <button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl py-3 font-black text-xs shadow-md active:scale-95 transition-transform">投稿する</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* ローディングオーバーレイ */}
      {isLoading && schedules.length === 0 && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex justify-center items-center">
           <div className="bg-white px-8 py-5 rounded-[20px] shadow-xl flex items-center gap-4 border border-orange-50">
             <div className="w-5 h-5 border-4 border-[#eaaa43] border-t-transparent rounded-full animate-spin"></div>
             <span className="text-[#eaaa43] font-black text-sm tracking-widest">データを読込中...</span>
           </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WhiteboardContent />
    </Suspense>
  );
}
