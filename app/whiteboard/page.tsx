"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- 画面Aから引き継いだ選択肢データ ---
const assignees = ["佐藤", "田中", "南", "新田", "德重"];
const areas = ["市内南部エリア", "市街地エリア", "市内北部エリア", "日置エリア", "北薩エリア", "南薩エリア", "大隅エリア", "鹿屋エリア", "姶良エリア", "霧島エリア", "その他"];
const requestContents = ["水漏れ", "作動不良", "開閉不良", "破損", "異音", "詰り関係", "その他"];
const workContents = ["部品交換", "製品交換、取付", "清掃", "点検", "見積", "応急処置", "その他"];

// --- ホワイトボード専用の選択肢 ---
const wbItems = ["ポンプ交換", "配管補修", "現調", "水栓修理", "トイレ詰まり", "その他"];

// --- ダミーデータ（初期表示用） ---
const initialSchedules = [
  { id: 1, assignee: "佐藤", startTime: "09:00", endTime: "11:30", area: "市内南部エリア", locationDetail: "中山", item: "ポンプ交換", workContent: "点検", requestContent: "異音", memo: "急ぎ" },
  { id: 2, assignee: "佐藤", startTime: "13:00", endTime: "14:30", area: "市内北部エリア", locationDetail: "吉野", item: "トイレ詰まり", workContent: "清掃", requestContent: "詰り関係", memo: "" },
  { id: 3, assignee: "田中", startTime: "10:00", endTime: "12:00", area: "市街地エリア", locationDetail: "鴨池", item: "水栓修理", workContent: "部品交換", requestContent: "水漏れ", memo: "" },
  { id: 4, assignee: "南", startTime: "09:30", endTime: "10:30", area: "南薩エリア", locationDetail: "谷山中央", item: "配管補修", workContent: "応急処置", requestContent: "水漏れ", memo: "" },
];

function WhiteboardContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-02')); // 初期値を設定
  const [currentUser, setCurrentUser] = useState("");
  const [schedules, setSchedules] = useState(initialSchedules);
  
  // モーダル制御ステート
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // フォームステート
  const [formData, setFormData] = useState({
    id: 0,
    assignee: "",
    startTime: "",
    endTime: "",
    area: "",
    locationDetail: "",
    item: "",
    workContent: "",
    requestContent: "",
    memo: ""
  });

  // 初回マウント時：localStorageから担当者を読み込む
  useEffect(() => {
    setMounted(true);
    const savedWorker = localStorage.getItem('savedWorker');
    if (savedWorker && assignees.includes(savedWorker)) {
      setCurrentUser(savedWorker);
    }
  }, []);

  // 担当者変更時：localStorageに保存する
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = e.target.value;
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('savedWorker', user);
    } else {
      localStorage.removeItem('savedWorker');
    }
  };

  // 日付操作
  const addDays = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };
  const dateString = `${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
  const dayString = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()];

  // 作業時間の自動計算ロジック
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "---";
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // 日をまたぐ場合
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours > 0 ? `${hours}時間` : ''}${mins > 0 ? `${mins}分` : (hours > 0 ? '' : '0分')}`;
  };

  // フォーム入力ハンドラー
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 詳細モーダルを開く
  const openDetail = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  // 新規作成フォームを開く
  const openNewForm = () => {
    setFormData({
      id: 0, assignee: currentUser || assignees[0], startTime: "09:00", endTime: "10:00",
      area: "", locationDetail: "", item: "", workContent: "", requestContent: "", memo: ""
    });
    setIsFormOpen(true);
  };

  // 編集フォームを開く（詳細モーダルから）
  const openEditForm = () => {
    if (selectedSchedule.assignee !== currentUser) {
      if (!window.confirm(`現在 ${selectedSchedule.assignee} さんの予定を編集しようとしています。よろしいですか？`)) {
        return;
      }
    }
    setFormData({ ...selectedSchedule });
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  // 保存処理（実際はAPI等に送信）
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id === 0) {
      // 新規追加
      const newSchedule = { ...formData, id: Date.now() };
      setSchedules([...schedules, newSchedule]);
    } else {
      // 更新
      setSchedules(schedules.map(s => s.id === formData.id ? formData : s));
    }
    setIsFormOpen(false);
  };

  // 日報画面へデータ転送
  const handleSendToReport = async () => {
    if (!selectedSchedule) return;
    
    // 【ここにGASへの送信処理（fetch）を追加可能】
    // 例: await fetch(GAS_URL, { method: 'POST', body: ... });

    // 画面AへURLパラメータで引き継ぎデータを渡す
    const params = new URLSearchParams({
      worker: selectedSchedule.assignee,
      area: selectedSchedule.area,
      workContent: selectedSchedule.workContent,
      requestContent: selectedSchedule.requestContent
    });
    
    setIsDetailOpen(false);
    // ※画面Aのパスを "/report" と仮定しています
    router.push(`/report/new?${params.toString()}`); 
  };

  if (!mounted) return <div className="min-h-screen bg-[#f8f6f0]" />;

  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all appearance-none";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 ml-1";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";

  return (
    <div className="min-h-screen bg-[#f8f6f0] font-sans text-slate-800 pb-32">
      
      {/* 1. ヘッダーエリア（固定） */}
      <div className="sticky top-0 z-30 bg-[#f8f6f0] pt-6 pb-2 shadow-sm">
        <div className="px-4 max-w-5xl mx-auto flex flex-col gap-4">
          
          {/* 上段：タイトルと担当者選択 */}
          <div className="bg-gradient-to-r from-[#eaaa43] to-[#d4952b] rounded-[14px] py-4 px-4 shadow-sm flex items-center justify-between">
            <h1 className="text-white font-black tracking-widest text-lg flex-1">ホワイトボード</h1>
            <div className="w-auto flex items-center bg-white/20 px-2 py-1 rounded-full border border-white/30 text-white shadow-inner">
              <span className="text-xs font-bold mr-1">👤</span>
              <select 
                value={currentUser} 
                onChange={handleUserChange}
                className="bg-transparent text-sm font-bold text-white outline-none appearance-none cursor-pointer text-right"
              >
                <option value="" className="text-gray-800">未選択</option>
                {assignees.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
              </select>
            </div>
          </div>

          {/* 下段：日付ナビゲーションと新規ボタン */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-[14px] shadow-sm border border-gray-100">
              <button onClick={() => addDays(-1)} className="text-[#eaaa43] font-black p-1 active:scale-95 transition-transform">◀</button>
              <span className="font-black text-[15px] tracking-widest w-24 text-center">{dateString} ({dayString})</span>
              <button onClick={() => addDays(1)} className="text-[#eaaa43] font-black p-1 active:scale-95 transition-transform">▶</button>
            </div>
            <button onClick={openNewForm} className="bg-white text-[#eaaa43] border-2 border-[#eaaa43] font-black text-sm py-2.5 px-4 rounded-[14px] shadow-sm active:scale-95 transition-transform flex items-center gap-1">
              <span>＋</span>新規作成
            </button>
          </div>
        </div>
      </div>

      {/* 2. メインエリア（横スワイプ対応のマトリクス） */}
      <div className="px-4 mt-4 max-w-5xl mx-auto">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar">
          {assignees.map(assignee => {
            // その人の予定を時間順にソート
            const personSchedules = schedules
              .filter(s => s.assignee === assignee)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div key={assignee} className="min-w-[160px] max-w-[200px] flex-1 snap-start flex flex-col">
                {/* 列ヘッダー（スタッフ名） */}
                <div className="bg-white rounded-t-[14px] py-3 text-center border-b-2 border-[#eaaa43] shadow-sm mb-3 sticky top-[140px] z-20">
                  <span className="font-black text-[15px] text-slate-800 tracking-widest">{assignee}</span>
                </div>

                {/* 予定カードのリスト（縦スクロール領域） */}
                <div className="flex flex-col gap-3">
                  {personSchedules.length > 0 ? (
                    personSchedules.map(schedule => (
                      <div 
                        key={schedule.id} 
                        onClick={() => openDetail(schedule)}
                        className="bg-white rounded-[14px] p-3 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform flex flex-col gap-1.5 relative overflow-hidden"
                      >
                        {/* 側面カラーバー装飾 */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#eaaa43]"></div>
                        
                        <div className="flex items-center gap-1.5 text-[#eaaa43] font-black text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>{schedule.startTime}</span>
                        </div>
                        <div className="font-bold text-[14px] leading-snug break-words">
                          {schedule.locationDetail || "(場所未定)"}
                        </div>
                        <div className="bg-gray-50 text-gray-500 text-[11px] font-bold px-2 py-1 rounded inline-block w-max max-w-full truncate border border-gray-100">
                          {schedule.item || "(品目未定)"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-300 font-bold text-xs">予定なし</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 詳細モーダル */}
      {isDetailOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-[#f8f6f0] w-full sm:max-w-md rounded-t-[30px] sm:rounded-[30px] shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-[#eaaa43] px-6 py-4 flex justify-between items-center text-white">
              <h2 className="font-black tracking-widest text-lg">予定の詳細</h2>
              <button onClick={() => setIsDetailOpen(false)} className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-90 transition-transform">×</button>
            </div>
            
            <div className="p-6 bg-white space-y-4">
              <div className="grid grid-cols-3 border-b border-gray-100 pb-3">
                <span className="text-gray-400 font-bold text-xs flex items-center">担当 / 時間</span>
                <span className="col-span-2 text-right font-bold text-sm">
                  {selectedSchedule.assignee} / {selectedSchedule.startTime}〜{selectedSchedule.endTime} 
                  <span className="text-gray-400 text-xs ml-1">({calculateDuration(selectedSchedule.startTime, selectedSchedule.endTime)})</span>
                </span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-100 pb-3">
                <span className="text-gray-400 font-bold text-xs flex items-center">場所</span>
                <span className="col-span-2 text-right">
                  <span className="text-xs text-gray-500 block mb-0.5">{selectedSchedule.area}</span>
                  <span className="font-black text-base">{selectedSchedule.locationDetail}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-100 pb-3">
                <span className="text-gray-400 font-bold text-xs flex items-center">品目</span>
                <span className="col-span-2 text-right font-bold text-sm">{selectedSchedule.item}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-100 pb-3">
                <span className="text-gray-400 font-bold text-xs flex items-center">内容</span>
                <span className="col-span-2 text-right font-bold text-sm text-gray-600">
                  {selectedSchedule.requestContent} / {selectedSchedule.workContent}
                </span>
              </div>
            </div>

            <div className="p-6 pt-0 bg-white flex gap-3">
              <button onClick={openEditForm} className="flex-1 bg-white border-2 border-gray-200 text-gray-600 py-3.5 rounded-xl font-black active:scale-95 transition-transform shadow-sm">
                編集する
              </button>
              <button onClick={handleSendToReport} className="flex-1 bg-gradient-to-r from-[#eaaa43] to-[#d4952b] text-white py-3.5 rounded-xl font-black tracking-widest active:scale-95 transition-transform shadow-md">
                日報を作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 入力・編集フォームモーダル */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#f8f6f0] rounded-[24px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10 shadow-sm">
              <h2 className="font-black tracking-widest text-[#eaaa43] text-lg">{formData.id === 0 ? "予定の新規作成" : "予定の編集"}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 text-2xl leading-none active:scale-90 transition-transform">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              {/* 時間と担当者 */}
              <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                <div className={selectWrapperClass}>
                  <label className={labelClass}>担当者</label>
                  <select name="assignee" value={formData.assignee} onChange={handleFormChange} required className={inputBaseClass}>
                    {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>開始時間</label>
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleFormChange} required className={inputBaseClass} />
                  </div>
                  <div>
                    <label className={labelClass}>終了時間</label>
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleFormChange} required className={inputBaseClass} />
                  </div>
                </div>
                <div className="text-right text-xs font-bold text-gray-400">
                  作業予定時間: <span className="text-[#eaaa43]">{calculateDuration(formData.startTime, formData.endTime)}</span>
                </div>
              </div>

              {/* 場所（日報連携＋ホワイトボード表示） */}
              <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                <div className={selectWrapperClass}>
                  <label className={labelClass}>エリア <span className="text-[10px] text-[#6495ED] font-normal ml-1">(日報連携)</span></label>
                  <select name="area" value={formData.area} onChange={handleFormChange} required className={inputBaseClass}>
                    <option value="">(選択)</option>
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {formData.area && (
                  <div className="animate-fade-in bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <label className={`${labelClass} text-gray-700`}>場所の詳細 <span className="text-[10px] font-normal text-gray-400 ml-1">(WBに表示)</span></label>
                    <input type="text" name="locationDetail" value={formData.locationDetail} onChange={handleFormChange} placeholder="例: 中山" required className={`${inputBaseClass} bg-white`} />
                  </div>
                )}
              </div>

              {/* 作業内容（ホワイトボード用＋日報連携） */}
              <div className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                <div className={selectWrapperClass}>
                  <label className={labelClass}>品目 <span className="text-[10px] font-normal text-gray-400 ml-1">(WB専用)</span></label>
                  <select name="item" value={formData.item} onChange={handleFormChange} required className={inputBaseClass}>
                    <option value="">(選択)</option>
                    {wbItems.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>依頼内容 <span className="text-[10px] text-[#6495ED] font-normal">(日報)</span></label>
                    <select name="requestContent" value={formData.requestContent} onChange={handleFormChange} className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {requestContents.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>作業内容 <span className="text-[10px] text-[#6495ED] font-normal">(日報)</span></label>
                    <select name="workContent" value={formData.workContent} onChange={handleFormChange} className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {workContents.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 保存ボタン */}
              <button type="submit" className="w-full bg-[#eaaa43] text-white py-4 rounded-xl font-black tracking-widest active:scale-95 transition-transform shadow-md mt-4">
                予定を保存する
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 画面下のタブバー（画面Aと完全一致） */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto pb-2 z-40">
        <Link href="/report" className="p-2 cursor-pointer relative active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Link>
        <div className="p-2 cursor-pointer relative active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <div className="p-2 cursor-pointer relative active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eaaa43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#eaaa43] rounded-full border-2 border-white"></span>
        </div>
        <div className="p-2 cursor-pointer relative active:scale-90 transition-transform">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </div>

    </div>
  );
}

export default function WhiteboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-gray-500 font-bold">読み込み中...</div>}>
      <WhiteboardContent />
    </Suspense>
  );
}
