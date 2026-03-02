"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

// --- 画面Aと共通の選択肢データ ---
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';
const areas = ["市内南部エリア", "市街地エリア", "市内北部エリア", "日置エリア", "北薩エリア", "南薩エリア", "大隅エリア", "鹿屋エリア", "姶良エリア", "霧島エリア", "その他"];
const clients = ["リビング", "ハウス", "ひだまり", "タカギ", "トータルサービス", "LTS"];
const items = ["トイレ", "キッチン", "洗面", "浴室", "ドア", "窓サッシ", "水栓", "エクステリア", "照明換気設備", "内装設備", "外装設備"];
const requestContents = ["水漏れ", "作動不良", "開閉不良", "破損", "異音", "詰り関係", "その他"];
const workContents = ["部品交換", "製品交換、取付", "清掃", "点検", "見積", "応急処置", "その他"];
const statuses = ["完了", "再訪予定", "部品手配", "見積", "保留"];

// --- ホワイトボード専用のスタッフとカラー設定 ---
const assignees = ["南", "新田", "德重", "田中", "佐藤"]; // 指定の並び順
const staffStyles: Record<string, { border: string, bg: string, text: string, dot: string, headerBg: string }> = {
  "南": { border: "border-orange-400", bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400", headerBg: "bg-orange-100 text-orange-800" },
  "新田": { border: "border-green-400", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-400", headerBg: "bg-green-100 text-green-800" },
  "德重": { border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400", headerBg: "bg-purple-100 text-purple-800" },
  "田中": { border: "border-cyan-400", bg: "bg-cyan-50", text: "text-cyan-600", dot: "bg-cyan-400", headerBg: "bg-cyan-100 text-cyan-800" },
  "佐藤": { border: "border-gray-400", bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", headerBg: "bg-gray-200 text-gray-800" },
};

// --- ホワイトボード専用の品目 ---
const wbItems = ["DW", "AW", "EW", "KS", "PH", "1D", "1A", "2A", "ハウス", "リビング", "ひだまり", "JIO", "LTS", "トータルサービス", "その他"];

// --- ダミーデータ（本来はGASから取得する想定） ---
const initialSchedules = [
  { id: 1, 日付: "2026-03-03", 担当者: "南", 開始時間: "09:00", 終了時間: "10:00", locationDetail: "中山", wbItem: "DW", wbItemDetail: "", 作業内容: "点検", 依頼内容: "水漏れ", メモ: "" },
  { id: 2, 日付: "2026-03-03", 担当者: "新田", 開始時間: "10:00", 終了時間: "11:00", locationDetail: "谷山", wbItem: "ハウス", wbItemDetail: "", 作業内容: "清掃", 依頼内容: "詰り関係", メモ: "" },
  { id: 3, 日付: "2026-03-03", 担当者: "德重", 開始時間: "09:30", 終了時間: "10:30", locationDetail: "宇宿", wbItem: "1D", wbItemDetail: "", 作業内容: "部品交換", 依頼内容: "作動不良", メモ: "" },
  { id: 4, 日付: "2026-03-03", 担当者: "田中", 開始時間: "09:00", 終了時間: "10:00", locationDetail: "鴨池", wbItem: "その他", wbItemDetail: "特殊ポンプ", 作業内容: "応急処置", 依頼内容: "異音", メモ: "" },
];

function WhiteboardContent() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date('2026-03-03')); // 初期値を3月3日に設定
  const [currentUser, setCurrentUser] = useState("");
  const [schedules, setSchedules] = useState(initialSchedules);
  
  // モーダル制御
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 日報完全互換＋WB専用項目のフォームステート
  const [formData, setFormData] = useState({
    id: 0,
    日付: '2026-03-03',
    開始時間: '',
    終了時間: '',
    担当者: '',
    訪問先: '', // 画面A用
    エリア: '',
    クライアント: '',
    品目: '', // 画面A用
    品番: '',
    依頼内容: '',
    作業内容: '',
    作業区分: '修理', // 以下、Aのデフォルト値
    技術料: '0',
    修理金額: '0',
    販売金額: '0',
    提案有無: '無',
    提案内容: '',
    遠隔高速利用: '無',
    伝票番号: '',
    状況: '未完了(予定)', // 予定段階の目印
    メモ: '',
    成約有無: '無',
    // --- ホワイトボード専用項目 ---
    locationDetail: '', 
    wbItem: '',
    wbItemDetail: ''
  });

  // 初回読み込み（localStorageから担当者復元）
  useEffect(() => {
    setMounted(true);
    const savedWorker = localStorage.getItem('savedWorker');
    if (savedWorker && assignees.includes(savedWorker)) {
      setCurrentUser(savedWorker);
    }
  }, []);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = e.target.value;
    setCurrentUser(user);
    if (user) localStorage.setItem('savedWorker', user);
    else localStorage.removeItem('savedWorker');
  };

  // 日付の操作
  const addDays = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };
  const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const displayDateString = `${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
  const dayString = ['日', '月', '火', '水', '木', '金', '土'][currentDate.getDay()];

  // 時間の自動計算（開始を入れると1時間後をセット）
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    if (start) {
      const [hours, minutes] = start.split(':').map(Number);
      const endHours = (hours + 1) % 24;
      const end = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setFormData({ ...formData, 開始時間: start, 終了時間: end });
    } else {
      setFormData({ ...formData, 開始時間: start });
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // モーダル開閉
  const openDetail = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsDetailOpen(true);
  };

  const openNewForm = () => {
    setFormData(prev => ({
      ...prev, id: 0, 日付: dateString, 担当者: currentUser || assignees[0],
      開始時間: '', 終了時間: '', locationDetail: '', wbItem: '', wbItemDetail: '',
      エリア: '', 訪問先: '', 依頼内容: '', 作業内容: '', メモ: ''
    }));
    setIsFormOpen(true);
  };

  // ★重要：GASへ「事前登録」として直接POST送信する処理
  const handleSaveToGAS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // ホワイトボード専用項目をメモに「合体」させる
    const finalItem = formData.wbItem === 'その他' ? formData.wbItemDetail : formData.wbItem;
    const wbMarker = `【WB予定】場所:${formData.locationDetail} / 品目:${finalItem}`;
    const combinedMemo = formData.メモ ? `${wbMarker}\n${formData.メモ}` : wbMarker;

    // 画面A（日報）と全く同じデータ構造を作成
    const payload = {
      日付: formData.日付,
      開始時間: formData.開始時間,
      終了時間: formData.終了時間,
      担当者: formData.担当者,
      訪問先: formData.訪問先, // 本来はここに顧客名等を入れる想定
      エリア: formData.エリア,
      クライアント: formData.クライアント,
      品目: formData.品目,
      品番: formData.品番,
      依頼内容: formData.依頼内容,
      作業内容: formData.作業内容,
      作業区分: formData.作業区分,
      技術料: Number(formData.技術料) || 0,
      修理金額: Number(formData.修理金額) || 0,
      販売金額: Number(formData.販売金額) || 0,
      提案有無: formData.提案有無,
      提案内容: formData.提案内容,
      遠隔高速利用: formData.遠隔高速利用,
      伝票番号: formData.伝票番号,
      状況: formData.状況, // 「未完了(予定)」として送る
      メモ: combinedMemo // ★ここにWBデータが隠れている
    };

    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));

      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      });

      // 画面上の予定リスト（擬似UI）にも追加
      const newSchedule = { 
        ...formData, 
        id: formData.id || Date.now(),
        wbItemDetail: formData.wbItem === 'その他' ? formData.wbItemDetail : ''
      };

      if (formData.id === 0) {
        setSchedules([...schedules, newSchedule]);
      } else {
        setSchedules(schedules.map(s => s.id === formData.id ? newSchedule : s));
      }

      alert("日報データベースへの事前登録が完了しました！\n夕方、日報編集画面から実績を入力してください。");
      setIsFormOpen(false);

    } catch (error) {
      alert("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#f8f6f0]" />;

  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#eaaa43] transition-all appearance-none";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";

  // 現在表示中の日付のスケジュールのみを抽出
  const currentSchedules = schedules.filter(s => s.日付 === dateString);

  return (
    <div className="min-h-screen bg-[#f8f6f0] font-sans text-slate-800 pb-32">
      
      {/* 1. ヘッダーエリア */}
      <div className="sticky top-0 z-30 bg-[#f8f6f0] pt-6 pb-2 px-4 shadow-sm">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <div className="bg-gradient-to-r from-[#eaaa43] to-[#d4952b] rounded-[14px] py-4 px-4 shadow-sm flex items-center justify-between">
            <h1 className="text-white font-black tracking-widest text-lg">ホワイトボード</h1>
            <div className="flex items-center bg-white/20 px-2 py-1 rounded-full border border-white/30 text-white shadow-inner">
              <span className="text-xs mr-1">👤</span>
              <select value={currentUser} onChange={handleUserChange} className="bg-transparent text-sm font-bold text-white outline-none appearance-none">
                <option value="" className="text-gray-800">未選択</option>
                {assignees.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-[14px] shadow-sm border border-gray-100">
              <button onClick={() => addDays(-1)} className="text-[#eaaa43] font-black p-1">◀</button>
              <span className="font-black text-[15px] tracking-widest w-24 text-center">{displayDateString} ({dayString})</span>
              <button onClick={() => addDays(1)} className="text-[#eaaa43] font-black p-1">▶</button>
            </div>
            <button onClick={openNewForm} className="bg-white text-[#eaaa43] border-2 border-[#eaaa43] font-black text-sm py-2 px-3 rounded-[14px] shadow-sm">
              ＋ 新規作成
            </button>
          </div>
        </div>
      </div>

      {/* 2. マトリクス表示エリア（4名が1画面にピタッと収まる設計） */}
      <div className="mt-4 px-2">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-4 no-scrollbar items-start">
          {assignees.map(assignee => {
            const personSchedules = currentSchedules.filter(s => s.担当者 === assignee).sort((a, b) => a.開始時間.localeCompare(b.開始時間));
            const style = staffStyles[assignee];

            return (
              <div key={assignee} className="w-[23%] min-w-[80px] flex-shrink-0 snap-start flex flex-col">
                <div className={`${style.headerBg} rounded-t-xl py-2 text-center shadow-sm mb-2 sticky top-[135px] z-20 border-b-2 ${style.border}`}>
                  <span className="font-black text-sm tracking-widest">{assignee}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  {personSchedules.length > 0 ? (
                    personSchedules.map(schedule => (
                      <div key={schedule.id} onClick={() => openDetail(schedule)} className={`bg-white rounded-xl p-2 shadow-sm border ${style.border} border-l-4 cursor-pointer active:scale-95 transition-transform flex flex-col gap-1`}>
                        <div className={`flex items-center gap-1 ${style.text} font-black text-[10px]`}>
                          <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                          {schedule.開始時間}
                        </div>
                        <div className="font-bold text-[12px] leading-tight break-words text-gray-800">
                          {schedule.locationDetail || "(場所未定)"}
                        </div>
                        <div className="bg-gray-50 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-100 truncate">
                          {schedule.wbItem === 'その他' ? schedule.wbItemDetail : schedule.wbItem}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-300 font-bold text-[10px]">予定なし</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 詳細モーダル（確認用） */}
      {isDetailOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#f8f6f0] w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden">
            <div className={`px-6 py-4 flex justify-between items-center text-white ${staffStyles[selectedSchedule.担当者].dot}`}>
              <h2 className="font-black tracking-widest">予定の詳細</h2>
              <button onClick={() => setIsDetailOpen(false)} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 bg-white space-y-3">
              <p className="text-sm"><strong>担当:</strong> {selectedSchedule.担当者}</p>
              <p className="text-sm"><strong>時間:</strong> {selectedSchedule.開始時間} 〜 {selectedSchedule.終了時間}</p>
              <p className="text-sm"><strong>場所:</strong> {selectedSchedule.locationDetail}</p>
              <p className="text-sm"><strong>品目:</strong> {selectedSchedule.wbItem === 'その他' ? selectedSchedule.wbItemDetail : selectedSchedule.wbItem}</p>
              <p className="text-sm text-gray-500">※日報データは既に送信（事前登録）されています。夕方に日報画面から実績を更新してください。</p>
            </div>
            <div className="p-4 bg-gray-50">
              <button onClick={() => setIsDetailOpen(false)} className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 入力フォーム（事前登録用） */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#f8f6f0] rounded-[24px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center z-10">
              <h2 className="font-black text-[#eaaa43]">予定の作成（日報へ事前登録）</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSaveToGAS} className="p-6 space-y-5">
              
              {/* 基本情報 */}
              <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={selectWrapperClass}>
                    <label className="block text-xs font-bold text-gray-600 mb-1">担当者</label>
                    <select name="担当者" value={formData.担当者} onChange={handleFormChange} required className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">日付</label>
                    <input type="date" name="日付" value={formData.日付} onChange={handleFormChange} required className={inputBaseClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">開始時間</label>
                    <input type="time" name="開始時間" value={formData.開始時間} onChange={handleStartTimeChange} required className={inputBaseClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">終了時間</label>
                    <input type="time" name="終了時間" value={formData.終了時間} onChange={handleFormChange} required className={inputBaseClass} />
                  </div>
                </div>
              </div>

              {/* 場所（WB用 ＋ 日報用） */}
              <div className="bg-white p-5 rounded-xl shadow-sm space-y-4 border-l-4 border-blue-400">
                <p className="text-[10px] font-bold text-blue-500 mb-2">▼ 日報にも登録される項目</p>
                <div className={selectWrapperClass}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">エリア (日報用)</label>
                  <select name="エリア" value={formData.エリア} onChange={handleFormChange} required className={inputBaseClass}>
                    <option value="">(選択)</option>
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">場所の詳細 <span className="text-[10px] text-gray-400">(WB表示用)</span></label>
                  <input type="text" name="locationDetail" value={formData.locationDetail} onChange={handleFormChange} placeholder="例: 中山" required className={inputBaseClass} />
                </div>
              </div>

              {/* 作業内容（WB専用 ＋ 日報用） */}
              <div className="bg-white p-5 rounded-xl shadow-sm space-y-4 border-l-4 border-[#eaaa43]">
                <p className="text-[10px] font-bold text-[#eaaa43] mb-2">▼ ホワイトボード専用項目</p>
                <div className={selectWrapperClass}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">品目 (WB用)</label>
                  <select name="wbItem" value={formData.wbItem} onChange={handleFormChange} required className={inputBaseClass}>
                    <option value="">(選択)</option>
                    {wbItems.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                {/* 「その他」を選んだ時だけ出現するテキストボックス */}
                {formData.wbItem === 'その他' && (
                  <div className="animate-fade-in bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <label className="block text-xs font-bold text-orange-600 mb-1">品目の詳細を入力</label>
                    <input type="text" name="wbItemDetail" value={formData.wbItemDetail} onChange={handleFormChange} placeholder="テキストで入力" required className={inputBaseClass} />
                  </div>
                )}
                
                <hr className="border-gray-100 my-4" />
                
                <p className="text-[10px] font-bold text-blue-500 mb-2">▼ 日報にも登録される項目</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className={selectWrapperClass}>
                    <label className="block text-xs font-bold text-gray-600 mb-1">依頼内容</label>
                    <select name="依頼内容" value={formData.依頼内容} onChange={handleFormChange} required className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {requestContents.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className={selectWrapperClass}>
                    <label className="block text-xs font-bold text-gray-600 mb-1">作業内容</label>
                    <select name="作業内容" value={formData.作業内容} onChange={handleFormChange} required className={inputBaseClass}>
                      <option value="">(選択)</option>
                      {workContents.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 送信ボタン */}
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#eaaa43] text-white py-4 rounded-xl font-black tracking-widest active:scale-95 transition-transform shadow-md mt-4 disabled:bg-gray-400">
                {isSubmitting ? '送信中...' : '予定を登録する（日報へ事前送信）'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 画面下のタブバー（画面Aと共通） */}
      <div className="fixed bottom-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto z-40">
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
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-gray-500 font-bold">読み込み中...</div>}>
      <WhiteboardContent />
    </Suspense>
  );
}
