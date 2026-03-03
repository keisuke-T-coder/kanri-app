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

const wbItems = ["DW", "AW", "EW", "KS", "PH", "1D", "1A", "2A", "ハウス", "リビング", "ひだまり", "JIO", "LTS", "トータルサービス", "その他"];

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function WhiteboardContent() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ★ 編集(上書き)用に「タイムスタンプ」を追加
  const [formData, setFormData] = useState({
    タイムスタンプ: '', 日付: getTodayString(), 開始時間: '', 終了時間: '', 担当者: '', 訪問先: '', エリア: '', クライアント: '', 品目: '', 品番: '', 依頼内容: '', 作業内容: '', 作業区分: '修理', 技術料: '0', 修理金額: '0', 販売金額: '0', 提案有無: '無', 提案内容: '', 遠隔高速利用: '無', 伝票番号: '', 状況: '未完了(予定)', メモ: '', 成約有無: '無', locationDetail: '', wbItem: '', wbItemDetail: ''
  });

  // 初回データ取得
  useEffect(() => {
    setMounted(true);
    const savedWorker = localStorage.getItem('savedWorker');
    if (savedWorker && assignees.includes(savedWorker)) {
      setCurrentUser(savedWorker);
    }
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(GAS_URL + "?type=whiteboard");
      const data = await res.json();
      
      const parsedData = data.map((row: any) => {
        let locDetail = "";
        let wItem = "";
        let wItemDet = "";
        const memo = row.メモ || "";
        
        // メモ欄からの抽出
        const match = memo.match(/【WB予定】場所:(.*?) \/ 品目:(.*?)(?:\n|$)/);
        if (match) {
          locDetail = match[1].trim();
          const parsedItem = match[2].trim();
          if (wbItems.includes(parsedItem)) wItem = parsedItem;
          else { wItem = "その他"; wItemDet = parsedItem; }
        }

        // 時間の整形
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
          タイムスタンプ: row.タイムスタンプ || "", // ★編集用のID
          日付: row.日付 || "", 担当者: row.担当者 || "", 開始時間: startTimeStr, 終了時間: endTimeStr, 訪問先: row.訪問先 || "", 依頼内容: row.依頼内容 || "", 作業内容: row.作業内容 || "", メモ: row.メモ || "", locationDetail: locDetail, wbItem: wItem, wbItemDetail: wItemDet
        };
      });
      setSchedules(parsedData);
    } catch (error) {
      console.error("データ取得エラー", error);
    } finally {
      setIsLoading(false);
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
  
  const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const displayDateString = `${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    if (start) {
      const [hours, minutes] = start.split(':').map(Number);
      const end = `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setFormData({ ...formData, 開始時間: start, 終了時間: end });
    } else setFormData({ ...formData, 開始時間: start });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openDetail = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  // ★ 新規作成フォームを開く
  const openNewForm = () => {
    setFormData(prev => ({
      ...prev, タイムスタンプ: '', 日付: dateString, 担当者: currentUser || assignees[0], 開始時間: '', 終了時間: '', 訪問先: '', locationDetail: '', wbItem: '', wbItemDetail: '', エリア: '', 依頼内容: '', 作業内容: '', メモ: ''
    }));
    setIsFormOpen(true);
  };

  // ★ 編集フォームを開く（詳細画面から）
  const openEditForm = () => {
    setFormData({
      ...formData, ...selectedSchedule
    });
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  // ★ GASへPOST送信（新規作成 ＆ 上書き更新 の両対応）
  const handleSaveToGAS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalItem = formData.wbItem === 'その他' ? formData.wbItemDetail : formData.wbItem;
    const wbMarker = `【WB予定】場所:${formData.locationDetail} / 品目:${finalItem}`;
    // ※更新時は既存のメモから古いWBマーカーを消して付け直す処理が必要ですが、簡易的に上書きします
    const baseMemo = formData.メモ.replace(/【WB予定】.*?(?:\n|$)/g, '').trim();
    const combinedMemo = baseMemo ? `${wbMarker}\n${baseMemo}` : wbMarker;

    const payload = {
      action: formData.タイムスタンプ ? 'update' : 'create', // ★ここが重要！
      タイムスタンプ: formData.タイムスタンプ,
      日付: formData.日付, 開始時間: formData.開始時間, 終了時間: formData.終了時間, 担当者: formData.担当者, 訪問先: formData.訪問先, エリア: formData.エリア, クライアント: formData.クライアント, 品目: formData.品目, 品番: formData.品番, 依頼内容: formData.依頼内容, 作業内容: formData.作業内容, 作業区分: formData.作業区分, 技術料: 0, 修理金額: 0, 販売金額: 0, 提案有無: formData.提案有無, 提案内容: formData.提案内容, 遠隔高速利用: formData.遠隔高速利用, 伝票番号: formData.伝票番号, 状況: formData.状況, メモ: combinedMemo
    };

    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));

      await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
      alert(formData.タイムスタンプ ? "予定を更新しました！" : "予定を新規登録しました！");
      setIsFormOpen(false);
      fetchSchedules(); // 送信後に最新データをリロード
    } catch (error) {
      alert("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#f8f6f0]" />;

  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-[10px] px-3 py-2.5 text-[16px] text-gray-800 focus:outline-none focus:border-[#eaaa43] transition-all appearance-none";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-3 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";

  const currentSchedules = schedules.filter(s => s.日付 === dateString);

  return (
    // ★ 全体を固定レイアウト（h-screen）に変更し、内側だけスクロールさせる設計
    <div className="h-screen bg-[#f8f6f0] font-sans text-slate-800 flex flex-col overflow-hidden">
      
      {/* 1. トップナビゲーション（絶対に動かないエリア） */}
      <div className="flex-none pt-4 pb-2 px-2 bg-[#f8f6f0] shadow-sm z-40 border-b border-gray-200 relative">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <div className="bg-gradient-to-r from-[#eaaa43] to-[#d4952b] rounded-xl py-2 px-4 shadow-sm flex items-center justify-between">
            <h1 className="text-white font-black tracking-widest text-sm">ホワイトボード</h1>
            <div className="flex items-center bg-white/20 px-2 py-1 rounded-full border border-white/30 text-white shadow-inner">
              <span className="text-[10px] mr-1">👤</span>
              <select value={currentUser} onChange={handleUserChange} className="bg-transparent text-xs font-bold text-white outline-none appearance-none">
                <option value="" className="text-gray-800">未選択</option>
                {assignees.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-gray-100">
              <button onClick={() => addDays(-1)} className="text-[#eaaa43] font-black px-2 active:scale-90">◀</button>
              <span className="font-black text-xs tracking-widest w-16 text-center">{displayDateString}</span>
              <button onClick={() => addDays(1)} className="text-[#eaaa43] font-black px-2 active:scale-90">▶</button>
            </div>
            {isLoading ? (
              <span className="text-[10px] text-gray-400 font-bold animate-pulse pr-2">読込中...</span>
            ) : (
              <button onClick={openNewForm} className="bg-white text-[#eaaa43] border border-[#eaaa43] font-black text-[11px] py-1.5 px-3 rounded-xl shadow-sm active:scale-95">
                ＋ 新規作成
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. マトリクス表示エリア（この中だけが上下左右にスクロールする） */}
      <div className="flex-1 overflow-auto no-scrollbar relative bg-[#f8f6f0] pb-[80px] px-1">
        <div className="flex flex-row gap-1 min-w-max pt-2">
          {assignees.map(assignee => {
            const personSchedules = currentSchedules.filter(s => s.担当者 === assignee).sort((a, b) => a.開始時間.localeCompare(b.開始時間));
            const style = staffStyles[assignee];

            return (
              <div key={assignee} className="w-[23vw] min-w-[80px] max-w-[95px] flex flex-col">
                
                {/* ★スタッフ名の完全固定ヘッダー（スクロールエリア内でsticky） */}
                <div className={`sticky top-0 z-30 ${style.headerBg} rounded py-1 text-center shadow-sm mb-1.5 border-b-2 ${style.border}`}>
                  <span className="font-black text-[11px] tracking-widest">{assignee}</span>
                </div>
                
                {/* ★予定カード（2行に合体させて極限まで短く！） */}
                <div className="flex flex-col gap-1.5 px-0.5">
                  {personSchedules.length > 0 ? (
                    personSchedules.map(schedule => (
                      <div key={schedule.タイムスタンプ || schedule.id} onClick={() => openDetail(schedule)} className={`bg-white rounded-[4px] p-1 shadow-sm border ${style.border} border-l-[3px] cursor-pointer active:scale-90 transition-transform flex flex-col gap-[2px] leading-none`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-black text-[10px] ${style.text}`}>{schedule.開始時間}</span>
                          <span className="bg-gray-100 text-gray-500 text-[8px] font-bold px-1 py-0.5 rounded truncate max-w-[40px]">
                            {schedule.wbItem === 'その他' ? schedule.wbItemDetail : schedule.wbItem}
                          </span>
                        </div>
                        <div className="font-bold text-[10px] text-gray-800 truncate mt-0.5">
                          {schedule.locationDetail || "(未定)"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-gray-300 font-bold text-[9px]">予定なし</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 詳細モーダル（編集ボタン追加） */}
      {isDetailOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#f8f6f0] w-full max-w-sm rounded-[20px] shadow-2xl overflow-hidden">
            <div className={`px-5 py-3 flex justify-between items-center text-white ${staffStyles[selectedSchedule.担当者].dot}`}>
              <h2 className="font-black text-sm tracking-widest">予定の詳細</h2>
              <button onClick={() => setIsDetailOpen(false)} className="text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 bg-white space-y-2">
              <p className="text-xs"><strong>担当:</strong> {selectedSchedule.担当者}</p>
              <p className="text-xs"><strong>時間:</strong> {selectedSchedule.開始時間} 〜 {selectedSchedule.終了時間}</p>
              <p className="text-xs"><strong>訪問先:</strong> {selectedSchedule.訪問先 || "未入力"}</p>
              <p className="text-xs"><strong>場所:</strong> {selectedSchedule.locationDetail}</p>
              <p className="text-xs"><strong>品目:</strong> {selectedSchedule.wbItem === 'その他' ? selectedSchedule.wbItemDetail : selectedSchedule.wbItem}</p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-2">
              <button onClick={() => setIsDetailOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-bold">
                閉じる
              </button>
              {/* ★編集ボタン */}
              <button onClick={openEditForm} className="flex-1 bg-[#eaaa43] text-white py-2.5 rounded-xl text-sm font-black tracking-widest">
                編集する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 入力フォーム（新規・編集 兼用） */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-3">
          <div className="bg-[#f8f6f0] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white px-5 py-3 border-b flex justify-between items-center z-10">
              <h2 className="font-black text-[#eaaa43] text-sm">{formData.タイムスタンプ ? '予定の編集' : '予定を登録'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 text-xl">&times;</button>
            </div>

            <form onSubmit={handleSaveToGAS} className="p-4 space-y-4">
              <div className="bg-white p-3 rounded-xl shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className={selectWrapperClass}>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">担当者</label>
                    <select name="担当者" value={formData.担当者} onChange={handleFormChange} required className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">日付</label>
                    <input type="date" name="日付" value={formData.日付} onChange={handleFormChange} required className={inputBaseClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">開始時間</label>
                    <input type="time" name="開始時間" value={formData.開始時間} onChange={handleStartTimeChange} required className={inputBaseClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">終了時間</label>
                    <input type="time" name="終了時間" value={formData.終了時間} onChange={handleFormChange} required className={inputBaseClass} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-sm space-y-3 border-l-4 border-blue-400">
                <p className="text-[9px] font-bold text-blue-500 mb-1">▼ 日報にも登録される項目</p>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">訪問先名（顧客名など）</label>
                  <input type="text" name="訪問先" value={formData.訪問先} onChange={handleFormChange} placeholder="例: 山田様邸" required className={inputBaseClass} />
                </div>
                <div className={selectWrapperClass}>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">エリア</label>
                  <select name="エリア" value={formData.エリア} onChange={handleFormChange} required className={inputBaseClass}>
                    <option value="">(選択)</option>
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">場所の詳細 <span className="text-[9px] text-gray-400">(WB表示用)</span></label>
                  <input type="text" name="locationDetail" value={formData.locationDetail} onChange={handleFormChange} placeholder="例: 中山" required className={inputBaseClass} />
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
                  <div className="bg-orange-50 p-2 rounded border border-orange-100">
                    <label className="block text-[10px] font-bold text-orange-600 mb-0.5">品目の詳細</label>
                    <input type="text" name="wbItemDetail" value={formData.wbItemDetail} onChange={handleFormChange} placeholder="テキストで入力" required className={inputBaseClass} />
                  </div>
                )}
                
                <hr className="border-gray-100 my-2" />
                
                <p className="text-[9px] font-bold text-blue-500 mb-1">▼ 日報にも登録される項目</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={selectWrapperClass}>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">依頼内容</label>
                    <select name="依頼内容" value={formData.依頼内容} onChange={handleFormChange} required className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {requestContents.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className={selectWrapperClass}>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">作業内容</label>
                    <select name="作業内容" value={formData.作業内容} onChange={handleFormChange} required className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {workContents.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-[#eaaa43] text-white py-3 rounded-xl text-sm font-black tracking-widest active:scale-95 transition-transform shadow-md disabled:bg-gray-400">
                {isSubmitting ? '送信中...' : (formData.タイムスタンプ ? '更新して保存する' : '予定を登録する')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. フッターナビ（固定） */}
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
