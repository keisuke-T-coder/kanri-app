"use client";
import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, FileText, Wrench, MapPin, ArrowLeft, Edit3, Clock, Check, X, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("未完了");

  // Quick Action States
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [quickStatus, setQuickStatus] = useState("");
  const [quickNextVisit, setQuickNextVisit] = useState("");
  const [quickLog, setQuickLog] = useState("");
  const [savingQuick, setSavingQuick] = useState(false);

  const tabs = ["未完了", "部品待ち", "見積り待ち", "問い合わせ待ち", "完了"];

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/gas-new?action=getCases");
      if (res.ok) {
        const data = await res.json();
        setCases(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuickModal = (c: any) => {
    setSelectedCase(c);
    setQuickStatus(c.status || "未完了");
    setQuickNextVisit(c.nextVisitDate || "");
    setQuickLog("");
    setIsQuickModalOpen(true);
  };

  const handleSaveQuickAction = async () => {
    setSavingQuick(true);
    try {
      // 1. Update Case (Status & Next Visit)
      const updatedCase = { ...selectedCase, status: quickStatus, nextVisitDate: quickNextVisit };
      await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCase", payload: updatedCase })
      });

      // 2. Add Work Log (if text exists)
      if (quickLog.trim()) {
        const newVisit = {
          id: uuidv4(),
          caseId: selectedCase.id,
          visitDate: new Date().toISOString().split('T')[0],
          details: quickLog
        };
        await fetch("/api/gas-new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "saveVisit", sheetName: "Visits", payload: newVisit })
        });
      }

      await fetchCases(); // Refresh list
      setIsQuickModalOpen(false);
    } catch (error) {
       alert("保存に失敗しました。");
    } finally {
       setSavingQuick(false);
    }
  };

  const filteredCases = cases.filter(c => {
    if (activeTab === "未完了") return c.status === "未完了" || !c.status || c.status === "未対応";
    return c.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-32 relative overflow-hidden text-slate-800">
      <div className="w-[92%] max-w-md mt-8 mb-4 flex justify-between items-center px-1">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-[#eaaa43] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
              <Wrench size={22} className="text-white" />
           </div>
           <div>
             <h1 className="text-[20px] font-black text-gray-900 tracking-tight leading-none">案件管理</h1>
             <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">LTS Maintenance Hub</p>
           </div>
         </div>
         <Link href="/cases/new" className="bg-white border-2 border-gray-900 text-gray-900 px-5 py-2.5 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 active:scale-95 transition-all hover:bg-gray-900 hover:text-white">
            <Plus size={16} strokeWidth={3} /> 新規登録
         </Link>
      </div>

      <div className="w-[92%] max-w-md mb-6 sticky top-4 z-40">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 flex gap-1 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-none px-5 py-2.5 rounded-xl text-[11px] font-black tracking-wider transition-all duration-300 whitespace-nowrap ${
                activeTab === tab
                  ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                  : "bg-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="w-[92%] max-w-md flex flex-col gap-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <div className="w-10 h-10 border-4 border-orange-100 border-t-[#eaaa43] rounded-full animate-spin" />
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fetching Cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-[32px] border border-dashed border-gray-200 text-gray-400 flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
              <FileText size={24} className="text-gray-200" />
            </div>
            <p className="text-xs font-bold">案件がありません</p>
          </div>
        ) : (
          filteredCases.map((c) => (
            <div key={c.id} className={`bg-white rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.02)] border-2 p-0 flex flex-col active:scale-[0.98] transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.04)] group overflow-hidden ${
              c.clientName ? "border-orange-100/50" : "border-gray-50"
            }`}>
              <div className="p-7 flex flex-col relative text-slate-800">
                {c.clientName && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#eaaa43] opacity-30" />
                )}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/30 rounded-bl-[100px] -z-0 pointer-events-none group-hover:bg-orange-50/50 transition-colors" />
                
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 tracking-widest bg-gray-50 px-2 py-0.5 rounded uppercase self-start">No: {c.receiptNo || "---"}</span>
                    {c.nextVisitDate && (
                      <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100 animate-pulse-subtle">
                        <Wrench size={14} strokeWidth={3} className="text-orange-200" />
                        <span className="text-[10px] font-black tracking-wider">次回: {c.nextVisitDate.replace('T', ' ')}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] px-4 py-1.5 rounded-full font-black shadow-sm ${
                    c.status === "完了" ? "bg-emerald-50 text-emerald-600" : 
                    c.status === "部品待ち" ? "bg-purple-50 text-purple-600" :
                    c.status === "見積り待ち" ? "bg-amber-50 text-amber-600" :
                    c.status === "問い合わせ待ち" ? "bg-blue-50 text-blue-600" :
                    "bg-orange-50 text-orange-600"
                  }`}>
                    {c.status || "未完了"}
                  </span>
                </div>

                <div className="relative z-10" onClick={() => router.push(`/cases/${c.id}`)}>
                  <h2 className="text-[1.3rem] font-black text-gray-900 leading-tight mb-2">
                    {c.visitName || c.clientName || "名称未設定"}
                    <span className="text-sm font-bold text-gray-400 ml-1">様</span>
                  </h2>
                  <div className="flex items-center gap-1.5 mb-5 opacity-60">
                    <MapPin size={12} className="text-gray-400" />
                    <p className="text-[11px] text-gray-500 font-bold truncate max-w-[200px]">{c.visitAddress || "住所未登録"}</p>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-2xl flex flex-col gap-2 relative z-10 border border-gray-100/50" onClick={() => router.push(`/cases/${c.id}`)}>
                  <p className="text-[11px] text-gray-600 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#eaaa43] rounded-full" />
                    {c.targetProduct || "未設定"}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold leading-relaxed line-clamp-2">
                    {c.requestDetails || "詳細な依頼内容はありません。"}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 mt-6 relative z-10 border-t border-gray-50 pt-5">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       router.push(`/cases/${c.id}`);
                     }}
                     className="bg-gray-900 text-white w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black shadow-lg shadow-gray-200 active:scale-95 transition-all"
                   >
                     詳細を見る <ChevronRight size={14} strokeWidth={3} />
                   </button>
                   <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!c.visitAddress) return;
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.visitAddress)}`, "_blank");
                        }}
                        className="bg-white border-2 border-gray-900 text-gray-900 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black active:scale-95 transition-all hover:bg-gray-50"
                      >
                        <MapPin size={12} strokeWidth={3} /> マップ
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQuickModal(c);
                        }}
                        className="bg-[#eaaa43] text-white py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black shadow-lg shadow-orange-100 active:scale-95 transition-all"
                      >
                        <Edit3 size={12} strokeWidth={3} /> クイック入力
                      </button>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Action Modal Overlay */}
      {isQuickModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setIsQuickModalOpen(false)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all"><X size={20}/></button>
               </div>

               <div className="flex flex-col gap-6">
                  <div className="mb-2">
                     <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">{selectedCase?.receiptNo || selectedCase?.id?.slice(0,8)}</p>
                     <h3 className="text-xl font-black text-gray-900 leading-tight">{selectedCase?.visitName || "クイック入力"}様</h3>
                  </div>

                  {/* Status Select */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">状況の更新</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                       {["未完了", "部品待ち", "見積り待ち", "完了"].map(s => (
                          <button
                             key={s}
                             onClick={() => setQuickStatus(s)}
                             className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                                quickStatus === s
                                  ? (
                                    s === "完了" ? "bg-emerald-500 text-white" :
                                    s === "部品待ち" ? "bg-purple-500 text-white" :
                                    s === "見積り待ち" ? "bg-amber-500 text-white" :
                                    "bg-orange-500 text-white"
                                  )
                                  : "bg-gray-50 text-gray-400"
                             }`}
                          >
                             {s}
                          </button>
                       ))}
                    </div>
                  </div>

                  {/* Next Visit Picker */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase flex items-center gap-1">
                      <Clock size={10} /> 次回予定
                    </label>
                    <input 
                      type="datetime-local" 
                      step="1800"
                      value={quickNextVisit}
                      onChange={(e) => setQuickNextVisit(e.target.value)}
                      className="w-full mt-2 p-4 bg-gray-50 rounded-2xl text-xs font-black outline-none border border-transparent focus:border-[#eaaa43]"
                    />
                  </div>

                  {/* Work Log Quick Presets */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase mb-2 block">作業記録を追加</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                       {["訪問", "部品交換", "連絡", "SMS連絡"].map(p => (
                          <button
                             key={p}
                             onClick={() => setQuickLog(p)}
                             className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${
                                quickLog === p ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-400 border border-gray-100"
                             }`}
                          >
                             {p}
                          </button>
                       ))}
                    </div>
                    <textarea 
                      placeholder="詳細な記録を残す..."
                      value={quickLog}
                      onChange={(e) => setQuickLog(e.target.value)}
                      className="w-full h-24 bg-gray-50 rounded-2xl p-4 text-xs font-medium outline-none resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleSaveQuickAction}
                    disabled={savingQuick}
                    className="w-full bg-[#eaaa43] text-white py-5 rounded-[22px] font-black shadow-xl shadow-orange-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {savingQuick ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} strokeWidth={3} /> この内容で保存する</>}
                  </button>
               </div>
            </div>
         </div>
      )}

      <div className="w-[92%] max-w-md mt-12 mb-10">
        <Link href="/" className="group flex items-center justify-center gap-3 py-5 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#eaaa43] hover:text-[#eaaa43] transition-all">
           <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
           <span className="text-xs font-black tracking-widest">ホーム画面へ戻る</span>
        </Link>
      </div>
    </div>
  );
}
