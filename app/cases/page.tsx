"use client";
import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, FileText, Wrench, MapPin, ArrowLeft, Edit3, Clock, Check, X, Loader2, RotateCcw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    // 1. 初回マウント時にキャッシュを読み込んで即座に表示を許可する
    const cachedCases = localStorage.getItem("cases_cache");
    const cachedVisits = localStorage.getItem("visits_cache");
    
    if (cachedCases) {
      setCases(JSON.parse(cachedCases));
      // キャッシュがあれば初期表示の「読み込み中...」をスキップする
      setLoading(false);
    }
    if (cachedVisits) setVisits(JSON.parse(cachedVisits));
    
    // 2. 最新データをフェッチ（バックグラウンドで開始）
    fetchCases();
  }, []);

  const fetchCases = async (manual = false) => {
    const hasCache = !!localStorage.getItem("cases_cache");
    
    if (manual) setRefreshing(true);
    // キャッシュが全くない初動の時だけ全画面ローディングを出す
    else if (!hasCache) setLoading(true);

    try {
      // 案件一覧の取得（高速）
      const casesRes = await fetch("/api/gas-new?action=getCases");
      let casesArray = [];
      if (casesRes.ok) {
        const data = await casesRes.json();
        casesArray = Array.isArray(data) ? data : (data.cases || []);
        setCases(casesArray);
        localStorage.setItem("cases_cache", JSON.stringify(casesArray));
        // 案件リストが揃った時点で一度ローディングを解除しても良い（ユーザーを待たせない）
        setLoading(false);
      }

      // 訪問履歴の取得（低速）
      // 案件リストの表示を妨げないよう、ここでの失敗は許容しつつ順次更新する
      let visitsArray = [];
      try {
        const visitsRes = await fetch("/api/gas-new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getData", sheetName: "Visits" })
        });
        
        if (visitsRes.ok) {
          const vData = await visitsRes.json();
          const temp = Array.isArray(vData) ? vData : (vData.data || vData.visits || []);
          if (temp.length > 0 && !temp[0].receiptNo) {
            visitsArray = temp;
          }
        }
      } catch (e) {
        console.error("Primary visits fetch failed, fallback will follow");
      }

      // 取得できなかった場合のフォールバック（複数のGETを試行）
      if (visitsArray.length === 0) {
        const getVariations = [
          "/api/gas-new?action=getVisits",
          "/api/gas-new?action=getData&sheetName=Visits"
        ];
        
        for (const url of getVariations) {
          const res = await fetch(url).catch(() => null);
          if (res && res.ok) {
            const vData = await res.json();
            const temp = Array.isArray(vData) ? vData : (vData.data || vData.visits || []);
            if (temp.length > 0 && !temp[0].receiptNo && (temp[0].caseId || temp[0].visitDate)) {
              visitsArray = temp;
              break;
            }
          }
        }
      }

      if (visitsArray.length > 0) {
        setVisits(visitsArray);
        localStorage.setItem("visits_cache", JSON.stringify(visitsArray));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        body: JSON.stringify({ action: "saveCase", sheetName: "Cases", payload: updatedCase })
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

  const filteredCases = cases
    .filter(c => {
      if (activeTab === "未完了") return c.status === "未完了" || !c.status || c.status === "未対応";
      return c.status === activeTab;
    })
    .sort((a, b) => {
      // 1. 次回訪問日が入っているものを優先（昇順：近い日程が上）
      if (a.nextVisitDate && b.nextVisitDate) {
        return a.nextVisitDate.localeCompare(b.nextVisitDate);
      }
      if (a.nextVisitDate) return -1;
      if (b.nextVisitDate) return 1;

      // 2. 次回訪問日がないものは、受付日（receiptDate）の降順（新しい順が上）
      const dateA = a.receiptDate || "";
      const dateB = b.receiptDate || "";
      return dateB.localeCompare(dateA);
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
          <div className="flex items-center gap-2">
             <button 
               onClick={() => fetchCases(true)}
               disabled={refreshing}
               className={`p-3 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95 ${refreshing ? 'opacity-50' : 'hover:bg-gray-50'}`}
             >
                <RotateCcw size={18} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
             </button>
             <Link href="/cases/new" className="bg-white border-2 border-gray-900 text-gray-900 px-5 py-2.5 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 active:scale-95 transition-all hover:bg-gray-900 hover:text-white">
                <Plus size={16} strokeWidth={3} /> 新規登録
             </Link>
          </div>
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

                <div className="bg-gray-50/50 p-5 rounded-[22px] flex flex-col gap-3 relative z-10 border border-gray-100/50 group-hover:bg-orange-50/20 transition-colors" onClick={() => router.push(`/cases/${c.id}`)}>
                   <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{c.targetProduct || "製品情報なし"}</p>
                      <div className="flex items-center gap-1.5">
                         <Clock size={10} className="text-orange-300" />
                         <span className="text-[9px] font-bold text-orange-400">訪問履歴</span>
                      </div>
                   </div>
                   
                   <div className="space-y-2.5">
                      {visits && visits.filter(v => (v.caseId || v.caseid || v.CASEID) === c.id)
                        .sort((a, b) => new Date(b.visitDate || b.visitdate || 0).getTime() - new Date(a.visitDate || a.visitdate || 0).getTime())
                        .slice(0, 3)
                        .map((v, idx) => {
                           const vDate = v.visitDate || v.visitdate || "";
                           const vDetails = v.details || v.description || "";
                           return (
                             <div key={idx} className="flex gap-2.5 items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <span className="text-[9px] font-black text-[#eaaa43] bg-orange-50 px-2 py-1 rounded-lg leading-none mt-0.5 whitespace-nowrap">
                                  {vDate ? vDate.split('T')[0].slice(5).replace('-', '/') : '--/--'}
                                </span>
                                <p className="text-[11px] text-gray-700 font-bold leading-tight line-clamp-2">{vDetails}</p>
                             </div>
                           );
                        })
                      }
                      {(!visits || visits.filter(v => (v.caseId || v.caseid || v.CASEID) === c.id).length === 0) && (
                         <div className="py-2 px-1">
                           <p className="text-[10px] text-gray-400 font-bold leading-relaxed italic line-clamp-2">
                             {c.requestDetails || "詳細な依頼内容はありません。"}
                           </p>
                         </div>
                      )}
                   </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2.5 mt-6 relative z-10">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       router.push(`/cases/${c.id}`);
                     }}
                     className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black shadow-lg shadow-gray-200 active:scale-95 transition-all"
                   >
                     詳細を見る <ChevronRight size={14} strokeWidth={3} />
                   </button>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (!c.visitAddress) return;
                       window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.visitAddress)}`, "_blank");
                     }}
                     className="flex-1 bg-white border-2 border-gray-900 text-gray-900 py-3 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black active:scale-95 transition-all hover:bg-gray-50"
                   >
                     <MapPin size={12} strokeWidth={3} /> マップ
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      <div className="w-[92%] max-w-md mt-12 mb-10">
        <Link href="/" className="group flex items-center justify-center gap-3 py-5 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#eaaa43] hover:text-[#eaaa43] transition-all">
           <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
           <span className="text-xs font-black tracking-widest">ホーム画面へ戻る</span>
        </Link>
      </div>
    </div>
  );
}
