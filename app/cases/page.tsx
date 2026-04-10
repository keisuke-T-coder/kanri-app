"use client";
import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Wrench, MapPin, ArrowLeft, Clock, Check, Calendar, RotateCcw, ArrowRight, Activity, Trophy } from "lucide-react";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Hierarchical Tabs: Global (Active/Completed) and Sub (Operational Phases)
  const [globalTab, setGlobalTab] = useState<"active" | "completed">("active");
  const [activeSubTab, setActiveSubTab] = useState("訪問待ち");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");

  const subTabs = ["訪問待ち", "部品待ち", "連絡待ち", "問い合わせ待ち", "見積り待ち"];
  const statusOptions = ["未完了", "部品待ち", "連絡待ち", "問い合わせ待ち", "見積り待ち", "完了"];

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2).toString().padStart(2, '0');
    const minutes = (i % 2 === 0 ? '00' : '30');
    return `${hours}:${minutes}`;
  });

  useEffect(() => {
    const cachedCases = localStorage.getItem("cases_cache");
    const cachedVisits = localStorage.getItem("visits_cache");
    if (cachedCases) {
      setCases(JSON.parse(cachedCases));
      setLoading(false);
    }
    if (cachedVisits) setVisits(JSON.parse(cachedVisits));
    fetchCases();
  }, []);

  const fetchCases = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const casesRes = await fetch("/api/gas-new?action=getCases");
      if (casesRes.ok) {
        const data = await casesRes.json();
        const casesArray = Array.isArray(data) ? data : (data.cases || []);
        setCases(casesArray);
        localStorage.setItem("cases_cache", JSON.stringify(casesArray));
      }

      const visitsRes = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getData", sheetName: "Visits" })
      });
      if (visitsRes.ok) {
        const vData = await visitsRes.json();
        const visitsArray = Array.isArray(vData) ? vData : (vData.data || []);
        setVisits(visitsArray);
        localStorage.setItem("visits_cache", JSON.stringify(visitsArray));
      }
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateNextVisit = async (caseData: any, newDate: string) => {
    const updatedCase = { ...caseData, nextVisitDate: newDate };
    try {
      await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCase", sheetName: "Cases", payload: updatedCase })
      });
      setCases(prev => prev.map(c => c.id === caseData.id ? updatedCase : c));
      localStorage.setItem("cases_cache", JSON.stringify(cases.map(c => c.id === caseData.id ? updatedCase : c)));
      setEditingScheduleId(null);
    } catch (e) {
      alert("更新に失敗しました。");
    }
  };

  const updateCaseStatus = async (caseData: any, newStatus: string) => {
    let updatedCase = { ...caseData, status: newStatus };
    if (newStatus === "完了") {
      updatedCase.nextVisitDate = "";
      updatedCase.completionDate = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-');
    }

    try {
      await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCase", sheetName: "Cases", payload: updatedCase })
      });
      setCases(prev => prev.map(c => c.id === caseData.id ? updatedCase : c));
      localStorage.setItem("cases_cache", JSON.stringify(cases.map(c => c.id === caseData.id ? updatedCase : c)));
    } catch (e) {
      alert("更新に失敗しました。");
    }
  };

  // Helper to normalize date/time string for sorting (e.g., "9:30" -> "09:30")
  const normalizeDateTime = (dt: string) => {
    if (!dt) return "9999";
    return dt.replace(/ (\d):/, " 0$1:");
  };

  const filteredCases = cases
    .filter(c => {
      const isCompleted = c.status === "完了";
      const hasVisitDate = c.nextVisitDate && c.nextVisitDate !== "未定" && c.nextVisitDate !== "";

      // Global Tab Logic
      if (globalTab === "completed") return isCompleted;
      if (isCompleted) return false;
      
      // Sub Tab Logic (within Active missions)
      if (activeSubTab === "訪問待ち") return hasVisitDate;
      
      // Fallback: If no sub-tab specifically matches or it's "未完了", show based on status
      if (hasVisitDate) return false;
      
      return c.status === activeSubTab || (activeSubTab === "未完了" && (!c.status || !subTabs.includes(c.status)));
    })
    .sort((a, b) => {
      if (globalTab === "active" && activeSubTab === "訪問待ち") {
        // Chronological sort fix: Normalize "9:30" to "09:30"
        return normalizeDateTime(a.nextVisitDate).localeCompare(normalizeDateTime(b.nextVisitDate));
      }
      if (globalTab === "completed") {
        const dateA = a.completionDate || a.receiptDate || "";
        const dateB = b.completionDate || b.receiptDate || "";
        return dateB.localeCompare(dateA);
      }
      // Oldest receipt first for pending tasks
      const dateA = a.receiptDate || "9999";
      const dateB = b.receiptDate || "9999";
      return dateA.localeCompare(dateB);
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center font-sans pb-32 text-slate-900 overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-md mt-6 mb-6 flex justify-between items-center px-6">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Wrench size={20} className="text-white" />
           </div>
           <div>
             <h1 className="text-xl font-bold tracking-tight text-slate-900">案件一覧管理</h1>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">LTS Maintenance Services</p>
           </div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => fetchCases(true)} disabled={refreshing} className={`p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 ${refreshing ? 'opacity-50' : 'hover:bg-slate-50'}`}>
               <RotateCcw size={18} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/cases/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all">
               <Plus size={16} strokeWidth={3} /> 新規作成
            </Link>
         </div>
      </div>

      {/* --- Global Mission Toggles (2 Level UI) --- */}
      <div className="w-[92%] max-w-md mb-6 grid grid-cols-2 gap-4">
        <button 
          onClick={() => setGlobalTab("active")}
          className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 ${
            globalTab === "active" 
              ? "bg-white border-blue-500 shadow-md ring-4 ring-blue-50" 
              : "bg-slate-100/50 border-slate-200 text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Activity size={20} className={globalTab === "active" ? "text-blue-600" : "text-slate-400"} />
          <span className={`text-sm font-bold ${globalTab === "active" ? "text-slate-900" : "text-slate-400"}`}>進行中の案件</span>
        </button>

        <button 
          onClick={() => setGlobalTab("completed")}
          className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 ${
            globalTab === "completed" 
              ? "bg-white border-emerald-500 shadow-md ring-4 ring-emerald-50" 
              : "bg-slate-100/50 border-slate-200 text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Trophy size={20} className={globalTab === "completed" ? "text-emerald-600" : "text-slate-400"} />
          <span className={`text-sm font-bold ${globalTab === "completed" ? "text-slate-900" : "text-slate-400"}`}>完了済みの案件</span>
        </button>
      </div>

      {/* --- Sub-Filter Grid (Operational Phases) --- */}
      {globalTab === "active" && (
        <div className="w-[92%] max-w-md mb-8 grid grid-cols-3 gap-2 px-1">
           {subTabs.map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveSubTab(tab)}
               className={`py-2 rounded-lg text-[11px] font-bold transition-all border ${
                 activeSubTab === tab 
                   ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                   : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
               }`}
             >
               {tab}
             </button>
           ))}
           <button
               onClick={() => setActiveSubTab("all_pending")}
               className={`py-2 rounded-lg text-[11px] font-bold transition-all border ${
                 activeSubTab === "all_pending" 
                   ? "bg-slate-800 border-slate-800 text-white shadow-md" 
                   : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
               }`}
             >
               全て表示
           </button>
        </div>
      )}

      {/* Mission List content */}
      <div className="w-[94%] max-w-md flex flex-col gap-4 mb-20">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-200 shadow-sm"></div>)
        ) : (
          (() => {
            const list = globalTab === "completed" 
              ? cases.filter(c => c.status === "完了").sort((a,b) => (b.completionDate || "").localeCompare(a.completionDate || ""))
              : activeSubTab === "all_pending"
                ? cases.filter(c => c.status !== "完了").sort((a,b) => (a.receiptDate || "").localeCompare(b.receiptDate || ""))
                : filteredCases;

            if (list.length === 0) {
              return (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold text-sm">該当する案件はありません</p>
                </div>
              );
            }

            return list.map((c) => {
              const isCompleted = c.status === "完了";
              const isExpanded = expandedId === c.id;
              const isEditing = editingScheduleId === c.id;
              const latestVisit = visits && visits.find(v => (v.caseId || v.caseid || v.CASEID) === c.id);
              const progress = isCompleted ? 100 : (c.receiptNo ? parseInt(c.receiptNo.slice(-2)) % 100 : 30);

              return (
                <div key={c.id} className={`transition-all duration-200 ${isExpanded ? 'mb-4 shadow-xl' : 'mb-0'}`}>
                  {/* Parent Card */}
                  <div onClick={() => { setExpandedId(isExpanded ? null : c.id); setEditingScheduleId(null); }} 
                       className={`relative cursor-pointer transition-all bg-white rounded-2xl border ${isExpanded ? 'border-blue-200 ring-2 ring-blue-50 shadow-lg' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}>
                    
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                           <div className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">
                              依頼: {c.receiptDate || "--/--"}
                           </div>
                           {isCompleted ? (
                              <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                 <Check size={10} strokeWidth={3} /> 完了: {c.completionDate || "記録なし"}
                              </div>
                           ) : (
                              <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${c.nextVisitDate ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                                 <Calendar size={10} /> {c.nextVisitDate ? `次回: ${c.nextVisitDate.replace('T', ' ')}` : "訪問日未定"}
                              </div>
                           )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">NO: {c.receiptNo || "---"}</span>
                      </div>

                      <h2 className="text-xl font-bold text-slate-900 leading-tight pr-10">
                        {c.visitName?.endsWith("様") ? c.visitName : `${c.visitName}様`}
                      </h2>

                      <div className="flex justify-between items-end gap-3">
                         <div className="flex-1 overflow-hidden opacity-90 text-sm text-slate-500 font-medium truncate">
                           <div className="flex items-center gap-1.5 mb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">現場住所</div>
                           {c.visitAddress || "住所未登録"}
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); if (c.visitAddress) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.visitAddress)}`, "_blank"); }} 
                                 className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all">
                           <MapPin size={22} />
                         </button>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Accordion */}
                  {isExpanded && (
                    <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl p-5 flex flex-col gap-5 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Activity size={14} strokeWidth={3} />
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">依頼内容</span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl">{c.requestDetails || "詳細な依頼内容はありません。"}</p>
                      </div>

                      {latestVisit && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <span className="text-blue-600 font-bold text-[10px] block mb-1">直近の対応履歴 ({latestVisit.visitDate?.split('T')[0]})</span>
                          <p className="text-[12px] text-slate-500 font-medium">{latestVisit.details || latestVisit.description}</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-4">
                         {/* Scheduler */}
                         {isEditing ? (
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-3 text-slate-800">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-400 ml-1">訪問日</label>
                                  <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-lg font-bold text-sm focus:border-blue-400 outline-none" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-400 ml-1">時間</label>
                                  <select value={tempTime} onChange={(e) => setTempTime(e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-lg font-bold text-sm focus:border-blue-400 outline-none">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <button onClick={() => updateNextVisit(c, `${tempDate} ${tempTime}`)} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-xs shadow-md shadow-blue-100">期間を保存</button>
                                <button onClick={() => setEditingScheduleId(null)} className="flex-1 bg-white border border-slate-200 text-slate-500 py-3 rounded-lg font-bold text-xs">キャンセル</button>
                              </div>
                           </div>
                         ) : (
                           <div className="flex flex-col gap-4">
                             <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setEditingScheduleId(c.id); setTempDate(c.nextVisitDate ? c.nextVisitDate.split(' ')[0] : new Date().toISOString().split('T')[0]); setTempTime(normalizeDateTime(c.nextVisitDate).includes(' ') ? normalizeDateTime(c.nextVisitDate).split(' ')[1] : "09:00"); }} 
                                        className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all">
                                  <Calendar size={14} className="text-blue-500" /> 日程を変更
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); if (confirm("未定に戻しますか？")) updateNextVisit(c, ""); }} className="px-4 bg-slate-50 text-slate-400 py-3 rounded-xl text-xs font-bold transition-all">未定にする</button>
                             </div>
                             <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">現在のステータス</span>
                                <select value={c.status || "未完了"} onChange={(e) => { updateCaseStatus(c, e.target.value); if (e.target.value === "完了") setExpandedId(null); }} 
                                        className="bg-white text-slate-900 text-xs font-bold py-2 px-4 rounded-lg border border-slate-200 outline-none shadow-sm focus:border-blue-400">
                                   {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                             </div>
                           </div>
                         )}

                         {/* Action Button */}
                         <button onClick={(e) => { e.stopPropagation(); router.push(`/cases/${c.id}`); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                            詳細レポートを確認 <ArrowRight size={18} />
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      <div className="w-[92%] max-w-md mt-10">
        <Link href="/" className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-slate-200 bg-white text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
          <ArrowLeft size={16} /> ホーム画面へ戻る
        </Link>
      </div>
    </div>
  );
}
