"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';

const assignees = ["佐藤", "田中", "南", "新田", "德重"];
const areas = ["市内南部エリア", "市街地エリア", "市内北部エリア", "日置エリア", "北薩エリア", "南薩エリア", "大隅エリア", "鹿屋エリア", "姶良エリア", "霧島エリア", "その他"];
const clients = ["リビング", "ハウス", "ひだまり", "タカギ", "トータルサービス", "崎山不動産", "LTS"];
const items = ["トイレ", "キッチン", "洗面", "浴室", "ドア", "窓サッシ", "水栓", "エクステリア", "照明換気設備", "内装設備", "外装設備"];
const requestContents = ["水漏れ", "作動不良", "開閉不良", "破損", "異音", "詰り関係", "その他"];
const workContents = ["部品交換", "製品交換、取付", "清掃", "点検", "見積", "応急処置", "その他"];
const proposalContents = ["サティス", "プレアス", "アメージュ", "パッソ", "KA", "KB", "水栓", "その他"];
const statuses = ["完了", "再訪予定", "部品手配", "見積", "保留"];

// 時間整形関数
const formatTimeForDisplay = (timeStr: string) => {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  return timeStr;
};

// 入力フォーム用の時間・日付抽出関数
const extractTimeForInput = (timeStr: string) => {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  if (/^\d{1,2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  return timeStr;
};

const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

// リスト表示用の短い日付文字列作成関数 (例: 3/1(日))
const getShortDateString = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
};

function HistoryList() {
  const searchParams = useSearchParams();
  const initialWorker = searchParams.get('worker') || ""; 

  // ★ A-2同様、右上で担当者を切り替え可能
  const [currentWorker, setCurrentWorker] = useState(initialWorker);
  
  // ★ 月選択のステート（初期値は今月）
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // ★ 過去24ヶ月分 + 全期間の選択肢を生成
  const monthOptions = React.useMemo(() => {
    const options = [{ value: "all", label: "全期間 (過去すべて)" }];
    const current = new Date();
    for (let i = 0; i < 24; i++) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月`;
        options.push({ value: val, label: label });
    }
    return options;
  }, []);

  // ★ 案件検索用のステート
  const [searchKeyword, setSearchKeyword] = useState("");

  // ★ 日付検索用のステート
  const [searchDate, setSearchDate] = useState("");

  const [allData, setAllData] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // ★ 2段階アコーディオン用のステート
  const [expandedDate, setExpandedDate] = useState<string | null>(null); 
  const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null); 

  // 編集モード用のステート
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setExpandedDate(null);
      setExpandedItemKey(null);
      // 担当者の全履歴を取得
      const res = await fetch(`${GAS_URL}?worker=${encodeURIComponent(currentWorker)}`);
      if (!res.ok) throw new Error("通信エラー");
      const json = await res.json();
      setAllData(json);
    } catch (err) {
      setError("データの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ★ データ加工ロジック：フィルタリングとグループ化
  const groupedData: Record<string, any[]> = {};
  
  allData.forEach(item => {
    if (!item.日付) return;
    const cleanDate = extractDateForInput(item.日付);
    if (!cleanDate) return;
    
    const itemMonth = cleanDate.substring(0, 7);
    const keyword = searchKeyword.trim().toLowerCase();

    // 検索・フィルタリング条件の判定
    let matchesKeyword = true;
    if (keyword !== "") {
      const targetStr = `${item.訪問先 || ""} ${item.クライアント || ""} ${item.依頼内容 || ""} ${item.作業内容 || ""} ${item.メモ || ""}`.toLowerCase();
      matchesKeyword = targetStr.includes(keyword);
    }

    const matchesMonth = (selectedMonth === "all" || itemMonth === selectedMonth);
    const matchesDate = (!searchDate || cleanDate === searchDate);

    // キーワード検索または日付検索が入力されている場合は、月選択の制約を無視して検索結果を表示する
    const isSearching = keyword !== "" || searchDate !== "";
    
    if (isSearching) {
      if (!matchesKeyword || !matchesDate) return;
    } else {
      if (!matchesMonth || !matchesKeyword || !matchesDate) return;
    }

    if (!groupedData[cleanDate]) groupedData[cleanDate] = [];
    groupedData[cleanDate].push(item);
  });

  // 日付の降順（新しい日が上）にソートした配列を作成
  const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // 日付内のデータは時間順（朝から）にソート
  sortedDates.forEach(date => {
    groupedData[date].sort((a, b) => {
      if (!a.開始時間 || !b.開始時間) return 0;
      return a.開始時間 > b.開始時間 ? 1 : -1;
    });
  });

  // サマリー計算
  let totalCount = 0;
  let totalTech = 0;
  let totalRepair = 0;
  let totalSales = 0;

  Object.values(groupedData).forEach(dayItems => {
    totalCount += dayItems.length;
    dayItems.forEach(item => {
      totalTech += (Number(item.技術料) || 0);
      totalRepair += (Number(item.修理金額) || 0);
      totalSales += (Number(item.販売金額) || 0);
    });
  });

  const selectedMonthDisplay = selectedMonth.replace('-', '年') + '月';

  // --- 編集用ハンドラー ---
  const openEditModal = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    let isOtherProposal = false;
    let proposalDetail = "";
    if (item.提案有無 === '有' && item.提案内容 && !proposalContents.includes(item.提案内容)) {
      isOtherProposal = true;
      proposalDetail = item.提案内容;
    }

    setEditingItem({
      ...item,
      日付: extractDateForInput(item.日付),
      開始時間: extractTimeForInput(item.開始時間),
      終了時間: extractTimeForInput(item.終了時間),
      提案内容: isOtherProposal ? 'その他' : (item.提案内容 || ''),
      提案内容詳細: proposalDetail
    });
    setSubmitMessage("");
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingItem({ ...editingItem, [name]: value });
  };

  const handleEditToggle = (name: string, value: string) => {
    setEditingItem({ ...editingItem, [name]: value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    const techFee = Number(editingItem.技術料) || 0;
    const repairAmt = editingItem.作業区分 === '修理' ? (Number(editingItem.修理金額) || 0) : 0;
    const salesAmt = editingItem.作業区分 === '販売' ? (Number(editingItem.販売金額) || 0) : 0;
    const finalProposal = editingItem.提案内容 === 'その他' ? editingItem.提案内容詳細 : editingItem.提案内容;

    const payload = {
      ...editingItem,
      action: 'update',
      技術料: techFee,
      修理金額: repairAmt,
      販売金額: salesAmt,
      提案内容: finalProposal,
    };

    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      });
      setEditingItem(null);
      await fetchData();
    } catch (error) {
      setSubmitMessage("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all appearance-none";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 ml-1";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";

  return (
    <div className="flex flex-col items-center w-full relative">
      
      <div className="w-[92%] max-w-md mt-6 mb-4">
        <div className="bg-[#eaaa43] rounded-[14px] py-3 px-4 shadow-sm flex items-center justify-between mb-3">
          <Link href="/report" className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-sm tracking-wider">戻る</span>
          </Link>
          <h1 className="text-white font-bold tracking-widest text-lg flex-1 text-center">過去履歴</h1>
          <div className="w-20 flex justify-end">
            <div className="bg-white/20 pl-2 pr-5 py-1.5 rounded-full border border-white/30 shadow-inner relative flex items-center w-full">
              <select 
                value={currentWorker}
                onChange={(e) => setCurrentWorker(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none appearance-none cursor-pointer w-full text-center relative z-10"
              >
                <option value="" className="text-gray-800">全員</option>
                {assignees.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
              </select>
              <span className="text-[9px] text-white absolute right-2 pointer-events-none z-0">▼</span>
            </div>
          </div>
        </div>

        {/* 検索・絞り込みエリア */}
        <div className="bg-white rounded-[14px] p-3 shadow-sm flex flex-col gap-3 border border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 ml-1">表示月を選択</span>
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-bold text-gray-800 outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all appearance-none cursor-pointer"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <svg className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          
          <div className="h-px bg-gray-100 w-full"></div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 ml-1">フリーワード検索</span>
            <div className="relative">
              <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                placeholder="場所、内容、メモ..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold text-gray-800 outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all w-[150px]"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 ml-1">日付で検索</span>
            <div className="relative">
              <input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800 outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all w-[150px]"
              />
              {searchDate && (
                <button 
                  onClick={() => setSearchDate("")}
                  className="absolute right-[-24px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center -ml-2 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="w-[92%] max-w-md bg-white rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-4 mb-4">
        <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
          <div className="text-gray-500 font-bold text-sm">📅 {selectedMonth === "all" ? "全期間" : selectedMonthDisplay} の実績</div>
          <div className="text-[#eaaa43] font-black text-lg">{totalCount}<span className="text-xs ml-1 font-bold text-gray-400">件</span></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg py-2">
            <div className="text-[10px] text-gray-400 font-bold mb-0.5">技術料</div>
            <div className="text-xs font-black text-gray-800">¥{totalTech.toLocaleString()}</div>
          </div>
          <div className="bg-[#547b97]/5 rounded-lg py-2">
            <div className="text-[10px] text-[#547b97] font-bold mb-0.5">修理合計</div>
            <div className="text-xs font-black text-[#547b97]">¥{totalRepair.toLocaleString()}</div>
          </div>
          <div className="bg-[#d98c77]/5 rounded-lg py-2">
            <div className="text-[10px] text-[#d98c77] font-bold mb-0.5">販売合計</div>
            <div className="text-xs font-black text-[#d98c77]">¥{totalSales.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* リストエリア */}
      <div className="w-[92%] max-w-md flex flex-col gap-3">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 font-bold text-sm animate-pulse">データを読み込んでいます...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-400 font-bold text-sm">{error}</div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[16px] shadow-sm border border-dashed border-gray-200">
            <span className="text-4xl mb-3 block opacity-50">📭</span>
            <p className="text-gray-400 font-bold text-sm">{selectedMonth === "all" ? "データ" : selectedMonthDisplay + " の日報"} はありません</p>
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const dayItems = groupedData[dateStr];
            const isDateExpanded = expandedDate === dateStr;
            
            const dayTech = dayItems.reduce((s, i) => s + (Number(i.技術料) || 0), 0);
            const dayRepair = dayItems.reduce((s, i) => s + (Number(i.修理金額) || 0), 0);
            const daySales = dayItems.reduce((s, i) => s + (Number(i.販売金額) || 0), 0);

            return (
              <div key={dateStr} className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                
                <div 
                  className={`p-4 cursor-pointer flex justify-between items-center transition-colors ${isDateExpanded ? 'bg-orange-50/50 border-b border-gray-100' : 'bg-white'}`}
                  onClick={() => setExpandedDate(isDateExpanded ? null : dateStr)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-black text-gray-800 text-[15px] tracking-wide">{getShortDateString(dateStr)}</span>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{dayItems.length}件</span>
                    </div>
                    <div className="flex gap-3 text-[11px] font-bold">
                      <span className="text-gray-500">技:¥{dayTech.toLocaleString()}</span>
                      {dayRepair > 0 && <span className="text-[#547b97]">修:¥{dayRepair.toLocaleString()}</span>}
                      {daySales > 0 && <span className="text-[#d98c77]">販:¥{daySales.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="text-gray-400 ml-2">
                    {isDateExpanded ? (
                      <svg className="w-5 h-5 text-[#eaaa43]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    )}
                  </div>
                </div>

                {isDateExpanded && (
                  <div className="p-3 bg-gray-50/50 flex flex-col gap-2.5 animate-fade-in">
                    {dayItems.map((item, index) => {
                      const itemKey = `${dateStr}-${index}`;
                      const isItemExpanded = expandedItemKey === itemKey;
                      const isContracted = item.メモ && item.メモ.includes('成約');
                      const isHighway = item.遠隔高速利用 === '有';
                      const isProposal = item.提案有無 === '有';

                      // グラデーションの出し分け
                      let wrapperClass = "p-0 bg-transparent";
                      if (isContracted && isProposal) {
                        wrapperClass = "p-[2.5px] bg-gradient-to-br from-red-400 via-yellow-300 via-green-400 via-blue-400 to-purple-500 shadow-[0_0_15px_rgba(234,170,67,0.4)]";
                      } else if (isContracted) {
                        wrapperClass = "p-[2px] bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400";
                      } else if (isProposal) {
                        wrapperClass = "p-[2px] bg-gradient-to-br from-yellow-200 via-[#eaaa43] to-orange-400 shadow-sm";
                      }

                      return (
                        <div 
                          key={itemKey} 
                          onClick={(e) => { e.stopPropagation(); setExpandedItemKey(isItemExpanded ? null : itemKey); }}
                          className={`rounded-[12px] shadow-sm relative cursor-pointer transition-all duration-300 ${wrapperClass}`}
                        >
                          <div className={`rounded-[10px] p-3 w-full relative overflow-hidden flex flex-col gap-1.5 ${isHighway ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'} ${(isContracted || isProposal) && !isHighway ? 'border-none' : 'border'}`}>
                            
                            {isHighway && (
                              <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center transform -rotate-12 opacity-40 text-blue-400">
                                <svg width="90" height="90" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                </svg>
                              </div>
                            )}

                            <div className="flex justify-between items-center relative z-10">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${isHighway ? 'bg-white/60 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                {formatTimeForDisplay(item.開始時間)} - {formatTimeForDisplay(item.終了時間)}
                              </span>
                              <div className="text-gray-400">
                                {isItemExpanded ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                )}
                              </div>
                            </div>

                            <div className="relative z-10">
                              <div className="text-[13px] font-black text-gray-800 truncate flex items-center gap-1.5">
                                {item.クライアント && item.クライアント !== '(-----)' && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                    ["リビング", "ハウス"].includes(item.クライアント) ? "bg-green-100 text-green-700 border-green-200" :
                                    ["トータルサービス", "タカギ"].includes(item.クライアント) ? "bg-blue-100 text-blue-700 border-blue-200" :
                                    ["崎山不動産", "ひだまり"].includes(item.クライアント) ? "bg-purple-100 text-purple-700 border-purple-200" :
                                    item.クライアント === "LTS" ? "bg-orange-100 text-orange-700 border-orange-200" :
                                    "bg-gray-100 text-gray-500 border-gray-200"
                                  }`}>
                                    {item.クライアント}
                                  </span>
                                )}
                                {item.訪問先}
                                {currentWorker === "" && <span className="ml-2 text-[10px] text-[#eaaa43] border border-[#eaaa43] px-1 rounded-sm">担: {item.担当者}</span>}
                              </div>
                              <div className={`text-[10px] truncate font-bold mt-0.5 ${isHighway ? 'text-blue-600/80' : 'text-gray-400'}`}>
                                {item.エリア} / {item.品目} / {item.作業内容}
                              </div>
                            </div>

                            <div className="flex justify-between items-end mt-1 relative z-10">
                              <div className="flex gap-1.5 flex-wrap">
                                {isContracted && <span className="bg-gradient-to-r from-red-500 to-purple-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">成約</span>}
                                {isProposal && <span className="bg-[#eaaa43] text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm border border-[#d4932d]">提案あり</span>}
                                {isProposal && item.提案内容 && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm border border-orange-200">提案品: {item.提案内容}</span>}
                                {isHighway && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm border border-blue-400">高速: {item.伝票番号}</span>}
                              </div>
                              <div className="flex gap-2.5 text-[11px] font-black">
                                <span className="text-gray-600">技:¥{Number(item.技術料).toLocaleString()}</span>
                                {item.作業区分 === '修理' && <span className={isHighway ? 'text-blue-700' : 'text-[#547b97]'}>修:¥{Number(item.修理金額).toLocaleString()}</span>}
                                {item.作業区分 === '販売' && <span className={isHighway ? 'text-pink-600' : 'text-[#d98c77]'}>販:¥{Number(item.販売金額).toLocaleString()}</span>}
                              </div>
                            </div>

                            {isItemExpanded && (
                              <div className={`mt-3 pt-3 border-t ${isHighway ? 'border-blue-200' : 'border-gray-100'} text-[11px] space-y-2 animate-fade-in relative z-10 cursor-default`} onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 font-bold">依頼内容</span>
                                  <span className="font-black text-gray-700">{item.依頼内容}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 font-bold">状況</span>
                                  <span className={`font-black px-2 py-0.5 rounded ${item.状況 === '完了' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{item.状況}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 font-bold">提案</span>
                                  <span className="font-black text-gray-700">{item.提案有無} {item.提案内容 ? `(${item.提案内容})` : ''}</span>
                                </div>
                                {item.メモ && (
                                  <div>
                                    <span className="text-gray-500 font-bold block mb-1">メモ</span>
                                    <div className={`p-2.5 rounded-lg ${isHighway ? 'bg-white/60' : 'bg-gray-50'} text-gray-700 font-medium whitespace-pre-wrap leading-relaxed`}>
                                      {item.メモ}
                                    </div>
                                  </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                  <button 
                                    onClick={(e) => openEditModal(e, item)}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-transform ${isHighway ? 'bg-blue-600 text-white border-none' : 'bg-white border border-gray-200 text-gray-600'}`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    内容を編集する
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-[#f8f6f0] z-[100] overflow-y-auto pb-32 flex flex-col items-center">
          <div className="w-[92%] max-w-md mt-6 mb-4 sticky top-6 z-20">
            <div className="bg-[#eaaa43] rounded-[14px] py-4 px-4 shadow-sm flex items-center justify-between">
              <button type="button" onClick={() => setEditingItem(null)} className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                <span className="text-sm tracking-wider">取消</span>
              </button>
              <h1 className="text-white font-bold tracking-widest text-lg flex-1 text-center">内容の編集</h1>
              <div className="w-16 flex justify-end"></div>
            </div>
          </div>

          {submitMessage && (
            <div className={`w-[92%] max-w-md mb-4 p-4 rounded-xl text-center text-sm font-bold shadow-sm ${submitMessage.includes('エラー') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-[#eaaa43] border border-[#eaaa43]'}`}>
              {submitMessage}
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="w-[92%] max-w-md flex flex-col gap-5">
            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">基本情報</h2>
                <span className="text-gray-300 font-black text-xl leading-none">01</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>日付</label>
                    <input type="date" name="日付" value={editingItem.日付} onChange={handleEditChange} required className={inputBaseClass} />
                  </div>
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>担当者</label>
                    <select name="担当者" value={editingItem.担当者} onChange={handleEditChange} required className={inputBaseClass}>
                      {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>開始時間</label>
                    <input type="time" name="開始時間" value={editingItem.開始時間} onChange={handleEditChange} required className={inputBaseClass} />
                  </div>
                  <div>
                    <label className={labelClass}>終了時間</label>
                    <input type="time" name="終了時間" value={editingItem.終了時間} onChange={handleEditChange} required className={inputBaseClass} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">業務詳細</h2>
                <span className="text-gray-300 font-black text-xl leading-none">02</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>訪問先名</label>
                    <input type="text" name="訪問先" value={editingItem.訪問先} onChange={handleEditChange} required className={inputBaseClass} />
                  </div>
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>クライアント</label>
                    <select name="クライアント" value={editingItem.クライアント} onChange={handleEditChange} className={inputBaseClass}>
                      <option value="">(-----)</option>
                      {clients.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>エリア</label>
                    <select name="エリア" value={editingItem.エリア} onChange={handleEditChange} required className={inputBaseClass}>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>品目</label>
                    <select name="品目" value={editingItem.品目} onChange={handleEditChange} required className={inputBaseClass}>
                      {items.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>依頼内容</label>
                    <select name="依頼内容" value={editingItem.依頼内容} onChange={handleEditChange} required className={inputBaseClass}>
                      {requestContents.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>作業内容</label>
                    <select name="作業内容" value={editingItem.作業内容} onChange={handleEditChange} required className={inputBaseClass}>
                      {workContents.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">金額</h2>
                <span className="text-gray-300 font-black text-xl leading-none">03</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>作業区分</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button type="button" onClick={() => handleEditToggle('作業区分', '修理')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${editingItem.作業区分 === '修理' ? 'bg-white text-[#547b97] shadow-sm' : 'text-gray-400'}`}>修理</button>
                    <button type="button" onClick={() => handleEditToggle('作業区分', '販売')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${editingItem.作業区分 === '販売' ? 'bg-white text-[#d98c77] shadow-sm' : 'text-gray-400'}`}>販売</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>技術料</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                      <input type="number" name="技術料" value={editingItem.技術料} onChange={handleEditChange} required className={`${inputBaseClass} pl-8`} />
                    </div>
                  </div>
                  {editingItem.作業区分 === '修理' ? (
                    <div>
                      <label className={`${labelClass} text-[#547b97]`}>修理金額</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#547b97] font-bold">¥</span>
                        <input type="number" name="修理金額" value={editingItem.修理金額} onChange={handleEditChange} required className={`${inputBaseClass} pl-8 border-[#547b97]/30 text-[#547b97] bg-[#547b97]/5`} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={`${labelClass} text-[#d98c77]`}>販売金額</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d98c77] font-bold">¥</span>
                        <input type="number" name="販売金額" value={editingItem.販売金額} onChange={handleEditChange} required className={`${inputBaseClass} pl-8 border-[#d98c77]/30 text-[#d98c77] bg-[#d98c77]/5`} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">提案</h2>
                <span className="text-gray-300 font-black text-xl leading-none">04</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>提案有無</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button type="button" onClick={() => { handleEditToggle('提案有無', '無'); setEditingItem(p => ({...p, 提案内容: '', 提案内容詳細: ''})) }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${editingItem.提案有無 === '無' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>無</button>
                      <button type="button" onClick={() => handleEditToggle('提案有無', '有')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${editingItem.提案有無 === '有' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>有</button>
                    </div>
                  </div>
                  {editingItem.提案有無 === '有' && (
                    <div className={selectWrapperClass}>
                      <label className={labelClass}>提案内容</label>
                      <select name="提案内容" value={editingItem.提案内容} onChange={handleEditChange} required className={inputBaseClass}>
                        <option value="">選択してください</option>
                        {proposalContents.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {editingItem.提案有無 === '有' && editingItem.提案内容 === 'その他' && (
                  <div>
                    <label className={labelClass}>提案内容（詳細）</label>
                    <input type="text" name="提案内容詳細" value={editingItem.提案内容詳細} onChange={handleEditChange} required className={inputBaseClass} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">ステータス</h2>
                <span className="text-gray-300 font-black text-xl leading-none">05</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={selectWrapperClass}>
                    <label className={labelClass}>状況</label>
                    <select name="状況" value={editingItem.状況} onChange={handleEditChange} required className={inputBaseClass}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>遠隔・高速利用</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button type="button" onClick={() => { handleEditToggle('遠隔高速利用', '無'); setEditingItem(p => ({...p, 伝票番号: ''})) }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${editingItem.遠隔高速利用 === '無' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>無</button>
                      <button type="button" onClick={() => handleEditToggle('遠隔高速利用', '有')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${editingItem.遠隔高速利用 === '有' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400'}`}>有</button>
                    </div>
                  </div>
                </div>
                {editingItem.遠隔高速利用 === '有' && (
                  <div>
                    <label className={labelClass}>伝票番号</label>
                    <input type="text" name="伝票番号" value={editingItem.伝票番号} onChange={handleEditChange} required className={inputBaseClass} />
                  </div>
                )}
                <div>
                  <label className={labelClass}>メモ</label>
                  <textarea name="メモ" value={editingItem.メモ} onChange={handleEditChange} rows={3} className={`${inputBaseClass} resize-none`}></textarea>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-[#eaaa43] text-white rounded-[14px] py-4 shadow-sm active:scale-95 transition-transform font-black text-base mt-2 tracking-widest disabled:bg-gray-400">
              {isSubmitting ? '保存中...' : '内容を上書き保存する'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

export default function Page(props: any) {
  return (
    <div className="min-h-screen bg-[#f8f6f0] font-sans text-slate-800 pb-32">
      <Suspense fallback={<div className="flex justify-center items-center h-screen text-gray-500 font-bold">画面を読み込んでいます...</div>}>
        <HistoryList />
      </Suspense>

      {/* --- ホームへ戻る専用ボタン --- */}
      <div className="fixed bottom-0 left-0 right-0 w-full p-6 flex justify-center z-40 mb-2 pointer-events-none">
        <Link href="/" className="pointer-events-auto bg-white/90 backdrop-blur-lg border border-orange-100/50 px-10 py-3.5 rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex items-center gap-3 group active:scale-95 transition-all text-[#eaaa43]">
          <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center group-hover:bg-[#eaaa43] group-hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          </div>
          <span className="font-black text-[15px] tracking-[0.2em] pt-0.5">ホームに戻る</span>
        </Link>
      </div>
    </div>
  );
}
