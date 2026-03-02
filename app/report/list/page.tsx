"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';

// --- 各種選択肢（編集画面用） ---
const assignees = ["佐藤", "田中", "南", "新田", "德重"];
const areas = ["市内南部エリア", "市街地エリア", "市内北部エリア", "日置エリア", "北薩エリア", "南薩エリア", "大隅エリア", "鹿屋エリア", "姶良エリア", "霧島エリア", "その他"];
const clients = ["リビング", "ハウス", "ひだまり", "タカギ", "トータルサービス", "LTS"];
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

// 入力フォーム用の時間抽出関数（HH:mm形式）
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

// 入力フォーム用の日付抽出関数（YYYY-MM-DD形式）
const extractDateForInput = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr;
};

function ReportList() {
  const searchParams = useSearchParams();
  const initialWorker = searchParams.get('worker') || ""; 

  const [currentWorker, setCurrentWorker] = useState(initialWorker);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // --- 編集モード用のステート ---
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // ★ 追加: 削除確認モーダル用のステート
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // データ取得処理
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setExpandedIndex(null);
      const res = await fetch(`${GAS_URL}?type=today&worker=${encodeURIComponent(currentWorker)}`);
      if (!res.ok) throw new Error("通信エラー");
      const json = await res.json();
      
      const sortedData = json.sort((a: any, b: any) => {
        if (!a.開始時間 || !b.開始時間) return 0;
        return a.開始時間 > b.開始時間 ? 1 : -1;
      });
      
      setData(sortedData);
    } catch (err) {
      setError("データの取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      action: 'update', // GASに「上書き」を指示
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

  // ★ 追加: 削除を実行するハンドラー
  const handleDeleteSubmit = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    const payload = {
      タイムスタンプ: itemToDelete.タイムスタンプ,
      action: 'delete' // GASに「削除」を指示
    };

    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));

      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      });

      // 削除成功後、モーダルを閉じてデータを再取得
      setItemToDelete(null);
      await fetchData();
    } catch (error) {
      alert("削除中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsDeleting(false);
    }
  };

  // サマリー計算
  const totalCount = data.length;
  const totalTech = data.reduce((sum, item) => sum + (Number(item.技術料) || 0), 0);
  const totalRepair = data.reduce((sum, item) => sum + (Number(item.修理金額) || 0), 0);
  const totalSales = data.reduce((sum, item) => sum + (Number(item.販売金額) || 0), 0);
  const todayStr = new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });

  // 編集フォームの共通クラス
  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all appearance-none";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 ml-1";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";

  return (
    <div className="flex flex-col items-center w-full relative">
      
      {/* 画面上部エリア */}
      <div className="w-[92%] max-w-md mt-6 mb-4">
        <div className="bg-[#eaaa43] rounded-[14px] py-3 px-4 shadow-sm flex items-center justify-between">
          <Link href="/report" className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-sm tracking-wider">戻る</span>
          </Link>
          <h1 className="text-white font-bold tracking-widest text-lg flex-1 text-center">当日一覧</h1>
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
      </div>

      {/* サマリーカード */}
      <div className="w-[92%] max-w-md bg-white rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-4 mb-4">
        <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
          <div className="text-gray-500 font-bold text-sm">📅 {todayStr} の実績</div>
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

      {/* タイムライン（リスト） */}
      <div className="w-[92%] max-w-md flex flex-col gap-3">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 font-bold text-sm animate-pulse">データを読み込んでいます...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-400 font-bold text-sm">{error}</div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[16px] shadow-sm border border-dashed border-gray-200">
            <span className="text-4xl mb-3 block opacity-50">📭</span>
            <p className="text-gray-400 font-bold text-sm">日報はまだありません</p>
          </div>
        ) : (
          data.map((item, index) => {
            const isContracted = item.メモ && item.メモ.includes('成約');
            const isHighway = item.遠隔高速利用 === '有';
            const isExpanded = expandedIndex === index;

            return (
              <div 
                key={index} 
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className={`rounded-[14px] shadow-sm relative cursor-pointer transition-all duration-300 ${isContracted ? 'p-[3px] bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400' : 'p-0 bg-transparent'}`}
              >
                <div className={`rounded-[11px] p-3.5 w-full relative overflow-hidden flex flex-col gap-1.5 ${isHighway ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'} ${isContracted && !isHighway ? 'border-none' : 'border'}`}>
                  
                  {isHighway && (
                    <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center transform -rotate-12 opacity-40 text-blue-400">
                      <svg width="110" height="110" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                      </svg>
                    </div>
                  )}

                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${isHighway ? 'bg-white/60 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {formatTimeForDisplay(item.開始時間)} - {formatTimeForDisplay(item.終了時間)}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className="text-[13px] font-black text-gray-800 truncate">
                      {item.クライアント && item.クライアント !== '(-----)' ? <span className="text-[10px] text-gray-500 mr-1 bg-gray-100 px-1.5 py-0.5 rounded">{item.クライアント}</span> : ''}
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
                      {isHighway && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm border border-blue-400">遠隔・高速利用: {item.伝票番号}</span>}
                    </div>
                    <div className="flex gap-2.5 text-[11px] font-black">
                      <span className="text-gray-600">技:¥{Number(item.技術料).toLocaleString()}</span>
                      {item.作業区分 === '修理' && <span className={isHighway ? 'text-blue-700' : 'text-[#547b97]'}>修:¥{Number(item.修理金額).toLocaleString()}</span>}
                      {item.作業区分 === '販売' && <span className={isHighway ? 'text-pink-600' : 'text-[#d98c77]'}>販:¥{Number(item.販売金額).toLocaleString()}</span>}
                    </div>
                  </div>

                  {isExpanded && (
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

                      {/* ★ 変更: 下部ボタンエリア（削除ボタン ＆ 編集ボタン） */}
                      <div className="pt-2 flex justify-between items-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg font-bold text-xs text-red-500 hover:bg-red-50 active:scale-95 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          削除
                        </button>

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
          })
        )}
      </div>

      {/* =========================================
          ★ 追加: 削除確認モーダル（ストッパー）
      ========================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 animate-fade-in" onClick={() => setItemToDelete(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>

            <h3 className="text-lg font-black text-gray-800 mb-2">この案件を削除しますか？</h3>
            <p className="text-xs text-gray-500 font-medium mb-2 bg-gray-50 p-3 rounded-xl w-full border border-gray-100">
              {itemToDelete.訪問先}<br/>
              {itemToDelete.品目} / {itemToDelete.依頼内容}
            </p>
            <p className="text-[10px] text-red-500 font-bold mb-6">※この操作は取り消せません。スプレッドシートからも完全に削除されます。</p>

            <div className="w-full flex gap-3">
              <button 
                onClick={() => setItemToDelete(null)} 
                className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold active:scale-95 transition-transform"
              >
                キャンセル
              </button>
              <button 
                onClick={handleDeleteSubmit} 
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold tracking-widest active:scale-95 transition-transform shadow-md disabled:bg-gray-300"
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* =========================================
          フルスクリーン エディット（編集）モーダル 
      ========================================= */}
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
            {/* 01 基本情報 */}
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

            {/* 02 業務詳細 */}
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

            {/* 03 金額 */}
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

            {/* 04 提案 */}
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

            {/* 05 ステータス */}
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

            {/* 上書き保存ボタン */}
            <button type="submit" disabled={isSubmitting} className="w-full bg-[#eaaa43] text-white rounded-[14px] py-4 shadow-sm active:scale-95 transition-transform font-black text-base mt-2 tracking-widest disabled:bg-gray-400">
              {isSubmitting ? '保存中...' : '内容を上書き保存する'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

// --- メインページ（Suspenseラップ） ---
export default function ReportListPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f0] font-sans text-slate-800 pb-32">
      <Suspense fallback={<div className="flex justify-center items-center h-screen text-gray-500 font-bold">画面を読み込んでいます...</div>}>
        <ReportList />
      </Suspense>

      {/* 画面下のタブバー */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto pb-2 z-40">
        <Link href="/report" className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Link>
        <div className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <div className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eaaa43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#eaaa43] rounded-full border-2 border-white"></span>
        </div>
        <div className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </div>
    </div>
  );
}
