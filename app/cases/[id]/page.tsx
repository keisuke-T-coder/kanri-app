"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadCloud, Loader2, FileText, Plus, Trash2, MapPin, Edit3, Check, X, Wrench, Activity, Trophy, Clock, Calendar, ArrowRight, Share2, RotateCcw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingPartData, setEditingPartData] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [previewParts, setPreviewParts] = useState<any[]>([]);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitDetails, setVisitDetails] = useState("");
  const [editingNextVisit, setEditingNextVisit] = useState(false);

  useEffect(() => {
    // 1. 初動でローカルキャッシュ（一覧データ）から基本情報を探して即時表示する
    const cachedStr = localStorage.getItem("cases_cache");
    if (cachedStr) {
        try {
            const cachedList = JSON.parse(cachedStr);
            const found = cachedList.find((c: any) => c.id === params.id);
            if (found) {
                setCaseData(found);
                setEditData(found);
                setLoading(false);
            }
        } catch (e) {
            console.error("Cache parse error", e);
        }
    }
    fetchData();
  }, [params.id]);

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`/api/gas-new?action=getCase&caseId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCaseData(data.case);
        setEditData(data.case);
        setParts(data.parts || []);
        setQuotes(data.quotes || []);
        setVisits(data.visits || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateCase = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCase", sheetName: "Cases", payload: editData })
      });
      if (res.ok) {
        setCaseData(editData);
        setEditingInfo(false);
      }
    } catch (error) {
       alert("更新に失敗しました。");
    } finally {
       setSaving(false);
    }
  };

  const handleAddVisit = async () => {
    if (!visitDetails.trim()) return;
    setSaving(true);
    try {
      const newVisit = {
        id: uuidv4(),
        caseId: params.id,
        visitDate,
        details: visitDetails
      };
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveVisit", sheetName: "Visits", payload: newVisit })
      });
      if (res.ok) {
        setVisits([...visits, newVisit]);
        setVisitDetails("");
      }
    } catch (error) {
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm("この見積書を削除しますか？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", sheetName: "Quotes", id })
      });
      if (res.ok) {
        setQuotes(quotes.filter(q => q.id !== id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setSaving(true);
    try {
      const data = new FormData();
      data.append("image", file);
      data.append("type", "part");

      const res = await fetch("/api/analyze-image", { method: "POST", body: data });
      if (!res.ok) throw new Error("画像解析に失敗しました");
      const analyzedData = await res.json();
      
      const newPart = {
        id: uuidv4(),
        caseId: params.id,
        partName: analyzedData.partName || "",
        partCode: analyzedData.partCode || "",
        quantity: analyzedData.quantity || 1,
        price: analyzedData.price || 0,
        orderStatus: "未手配"
      };

      const saveRes = await fetch("/api/gas-new", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveParts", sheetName: "Parts", payload: [newPart] })
      });
      if (!saveRes.ok) throw new Error("部品の保存に失敗しました");

      setParts([...parts, newPart]);
      alert("部品を追加しました。");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkParse = async () => {
    if (!bulkText.trim()) return;
    setSaving(true);
    try {
      const lines = bulkText.split('\n').filter(line => line.trim());
      const newParts = lines.map(line => {
        const [partName, partCode, quantity, price] = line.split('/').map(s => s.trim());
        const cleanQty = quantity ? parseInt(quantity.replace(/,/g, ''), 10) : 1;
        const cleanPrice = price ? parseInt(price.replace(/,/g, ''), 10) : 0;
        
        return {
          id: uuidv4(),
          caseId: params.id,
          partName: partName || "名称不明",
          partCode: partCode || "---",
          quantity: isNaN(cleanQty) ? 1 : cleanQty,
          price: isNaN(cleanPrice) ? 0 : cleanPrice,
          orderStatus: "未手配"
        };
      });
      
      setPreviewParts(newParts);
      setShowBulkInput(false);
      setBulkText("");
    } catch (error: any) {
      alert("解析に失敗しました。形式を確認してください。");
    } finally {
      setSaving(false);
    }
  };

  const removePreviewPart = (index: number) => {
    setPreviewParts(previewParts.filter((_, i) => i !== index));
  };

  const saveBulkParts = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveParts", sheetName: "Parts", payload: previewParts })
      });
      if (!res.ok) throw new Error("一括保存に失敗しました");
      
      setParts([...parts, ...previewParts]);
      setPreviewParts([]);
      alert(`${previewParts.length}件の部品を一括登録しました。`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePart = async (id: string) => {
    if (!confirm("この部品を削除しますか？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deletePart", id })
      });
      if (res.ok) {
        setParts(parts.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePart = async () => {
    if (!editingPartData) return;
    if (!confirm("部品情報をこの内容で更新しますか？")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveParts", sheetName: "Parts", payload: [editingPartData] })
      });
      if (res.ok) {
        setParts(parts.map(p => p.id === editingPartId ? editingPartData : p));
        setEditingPartId(null);
        setEditingPartData(null);
      }
    } catch (error) {
      alert("更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const openInGoogleMaps = () => {
    if (!caseData?.visitAddress) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(caseData.visitAddress)}`;
    window.open(url, "_blank");
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="text-blue-500 animate-spin" size={32} /></div>;
  if (!caseData) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">案件が見つかりません。</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center font-sans pb-32 text-slate-900 overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-md mt-6 mb-4 flex justify-between items-center px-6 z-30">
         <div className="flex items-center gap-4">
            <button 
                onClick={() => router.back()}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 active:scale-90 transition-all"
            >
              <ArrowLeft size={20} className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">案件の詳細情報</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Report Details</p>
            </div>
         </div>
         <button onClick={() => fetchData(true)} disabled={refreshing} className={`p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 ${refreshing ? 'opacity-50' : 'hover:bg-slate-50'}`}>
            <RotateCcw size={18} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Quick Status Bar */}
      <div className="w-[92%] max-w-md bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex justify-between gap-1 overflow-x-auto scrollbar-hide z-30">
         {["未完了", "部品待ち", "見積り待ち", "完了"].map(s => (
            <button
               key={s}
               onClick={async () => {
                  if (caseData.status === s) return;
                  const updated = { ...caseData, status: s };
                  if (s === "完了") {
                    updated.nextVisitDate = "";
                    updated.completionDate = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-');
                  }
                  setCaseData(updated);
                  setSaving(true);
                  try {
                    await fetch("/api/gas-new", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "saveCase", sheetName: "Cases", payload: updated })
                    });
                  } catch (e) { alert("ステータスの更新に失敗しました。"); } finally { setSaving(false); }
               }}
               className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  caseData.status === s 
                    ? (
                      s === "完了" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" :
                      s === "部品待ち" ? "bg-purple-600 text-white shadow-md shadow-purple-100" :
                      s === "見積り待ち" ? "bg-amber-600 text-white shadow-md shadow-amber-100" :
                      "bg-blue-600 text-white shadow-md shadow-blue-100"
                    )
                    : "text-slate-400 hover:bg-slate-50"
               }`}
            >
               {s}
            </button>
         ))}
      </div>

      {/* Main Info Card */}
      <div className="w-[94%] max-w-md relative z-20 mb-8">
         <div className={`bg-white rounded-3xl border border-slate-200 shadow-md p-6 ${editingInfo ? 'ring-2 ring-blue-100' : ''}`}>
               {!editingInfo ? (
                 <>
                   {/* Top Level Badges */}
                   <div className="flex justify-between items-start mb-6">
                     <div className="flex flex-col gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                          caseData.status === "完了" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                          caseData.status === "部品待ち" ? "bg-purple-50 text-purple-700 border-purple-100" :
                          caseData.status === "見積り待ち" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                           <Activity size={14} />
                           <span>状況: {caseData.status || "未完了"}</span>
                        </div>
                        
                        {/* Visit Schedule Badge */}
                        <div className="relative">
                           {!editingNextVisit ? (
                              <button onClick={() => setEditingNextVisit(true)} className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm group/date">
                                 <Calendar size={14} className="text-white/70" />
                                 <span className="text-[11px] font-bold">
                                   {caseData.nextVisitDate ? `次回訪問: ${caseData.nextVisitDate.replace('T', ' ')}` : "訪問予定を登録する"}
                                 </span>
                                 <Edit3 size={11} className="opacity-50" />
                              </button>
                           ) : (
                              <div className="flex items-center gap-2 bg-white border border-blue-200 p-1 rounded-lg shadow-xl animate-in zoom-in-95">
                                 <input 
                                   type="datetime-local" 
                                   value={caseData.nextVisitDate || ""} 
                                   step="1800"
                                   onChange={async (e) => {
                                      const newDate = e.target.value;
                                      const updated = { ...caseData, nextVisitDate: newDate };
                                      setCaseData(updated);
                                      setSaving(true);
                                      try {
                                         await fetch("/api/gas-new", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ action: "saveCase", payload: updated })
                                         });
                                         setEditingNextVisit(false);
                                      } catch (err) { alert("保存に失敗しました。"); } finally { setSaving(false); }
                                   }}
                                   className="text-[11px] font-bold p-1.5 outline-none bg-slate-50 rounded"
                                 />
                                 <button onClick={() => setEditingNextVisit(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">NO: {caseData.receiptNo || "---"}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                           依頼日: {caseData.receiptDate || "不明"}
                        </p>
                     </div>
                   </div>

                   {/* Visit Target Name */}
                   <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                        {caseData.visitName?.endsWith("様") ? caseData.visitName : `${caseData.visitName}様`}
                      </h2>
                      <div onClick={openInGoogleMaps} className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                         <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <MapPin size={16} />
                         </div>
                         <p className="text-sm font-medium text-slate-500 underline underline-offset-4 decoration-slate-200">{caseData.visitAddress}</p>
                      </div>
                   </div>

                   {/* Detail Grid */}
                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                         <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mb-1">連絡先 / 受付名</p>
                         <p className="text-[13px] text-slate-900 font-bold">{caseData.contactName || "記載なし"}</p>
                         <p className="text-[11px] text-slate-500 font-medium mt-1">{caseData.visitTel || caseData.contactTel || "TELなし"}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                         <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mb-1">対象製品の情報</p>
                         <p className="text-[13px] text-slate-900 font-bold truncate">{caseData.targetProduct || "未設定"}</p>
                         <p className="text-[10px] text-slate-500 font-medium mt-1">{caseData.serialNo || "S/N: ---"}</p>
                      </div>
                   </div>

                   {/* Request Details Box */}
                   <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 mb-6">
                      <p className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                        <Activity size={13} /> 依頼の目的と詳細
                      </p>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">
                         {caseData.requestDetails || "詳細な依頼内容はありません。"}
                      </p>
                   </div>

                   {/* Client Source Section */}
                   <div className="bg-slate-50 p-4 rounded-xl mb-6">
                      <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mb-2">依頼元情報</p>
                      <div className="flex justify-between items-center">
                         <p className="text-sm font-bold text-slate-700">{caseData.clientName || "直依頼"}</p>
                         <p className="text-[11px] font-medium text-slate-500">TEL: {caseData.clientTel || "---"}</p>
                      </div>
                   </div>

                   {/* Main Actions */}
                   <div className="flex gap-3">
                      <button onClick={() => setEditingInfo(true)} className="flex-1 bg-white border border-slate-900 text-slate-900 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                         <Edit3 size={16} /> 基本情報を編集する
                      </button>
                      <button onClick={async () => {
                          if (confirm(`この案件を完全に削除しますか？`)) {
                             setSaving(true);
                             try {
                               const res = await fetch("/api/gas-new", {
                                 method: "POST", headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({ action: "deleteCase", sheetName: "Cases", id: params.id })
                               }); if (res.ok) router.push("/cases");
                             } catch (error) { alert("削除に失敗しました。"); } finally { setSaving(false); }
                          }
                        }} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl border border-red-100 flex items-center justify-center active:scale-90 transition-all">
                         <Trash2 size={20} />
                      </button>
                   </div>
                 </>
               ) : (
                 /* --- Edit Mode --- */
                 <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-2 px-1 border-b border-slate-100 pb-4">
                       <h3 className="text-sm font-bold text-slate-900">情報を書き換える</h3>
                       <button onClick={() => {setEditingInfo(false); setEditData(caseData);}} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>

                    <div className="space-y-5 text-slate-800">
                      <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ステータスの変更</label>
                         <div className="flex flex-wrap gap-2 mt-2">
                           {["未完了", "部品待ち", "見積り待ち", "完了"].map(s => (
                             <button key={s} onClick={() => setEditData({...editData, status: s})} className={`px-4 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                                 editData.status === s ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-slate-50 text-slate-400 border-slate-200"
                               }`}> {s} </button>
                           ))}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 px-1">受付日</span>
                            <input type="date" className="w-full text-sm p-3.5 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 font-bold" value={editData.receiptDate || ""} onChange={e => setEditData({...editData, receiptDate: e.target.value})} />
                         </div>
                         <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 px-1">受付No</span>
                            <input className="w-full text-sm p-3.5 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 font-bold" value={editData.receiptNo || ""} onChange={e => setEditData({...editData, receiptNo: e.target.value})} />
                         </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 px-1">訪問先氏名</span>
                        <input className="w-full text-xl font-bold bg-white p-3 border-b-2 border-slate-100 focus:border-blue-500 outline-none transition-all" value={editData.visitName || ""} onChange={e => setEditData({...editData, visitName: e.target.value})} />
                      </div>

                      <div className="flex flex-col gap-1.5">
                         <span className="text-[10px] font-bold text-slate-400 px-1">住所</span>
                         <textarea className="w-full text-sm p-4 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-blue-500 font-medium h-20 resize-none" value={editData.visitAddress || ""} onChange={e => setEditData({...editData, visitAddress: e.target.value})} />
                      </div>

                      <div className="flex flex-col gap-2 pt-4">
                         <button onClick={handleUpdateCase} disabled={saving} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                            {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />} データーベースを更新
                         </button>
                         <button onClick={() => setEditingInfo(false)} className="w-full bg-slate-50 text-slate-500 py-3 rounded-xl font-bold text-xs uppercase transition-all">変更を破棄する</button>
                      </div>
                    </div>
                 </div>
               )}
         </div>
      </div>

      {/* Visit History Section */}
      <div className="w-[94%] max-w-md mb-8 relative z-10">
         <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm">
            <h2 className="text-[17px] font-bold text-slate-900 mb-8 flex items-center gap-3">
               <div className="p-2 bg-slate-100 rounded-xl text-slate-600"> <Clock size={18} /> </div>
               対応履歴の一覧
            </h2>
            
            <div className="flex flex-col gap-8 mb-10 relative">
               {visits.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl text-slate-300 font-bold text-[13px]">履歴はまだ登録されていません</div>
               ) : (
                  visits.map((v, i) => (
                     <div key={i} className="flex gap-4 items-start relative group">
                        <div className="flex flex-col items-center pt-1.5">
                           <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border-4 border-white shadow-sm ring-1 ring-slate-100" />
                           {i !== visits.length - 1 && <div className="w-[1.5px] h-full absolute top-4 left-[5px] -z-10 bg-slate-100" />}
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.visitDate || "記録日不明"}</p>
                           <p className="text-sm text-slate-700 font-medium leading-relaxed">{v.details || v.description}</p>
                        </div>
                     </div>
                  ))
               )}
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">新しいログを記録</p>
               <div className="flex flex-col gap-4 text-slate-800">
                  <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full text-sm p-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl outline-none focus:border-blue-500 transition-all font-bold shadow-sm" />
                  
                  <div className="flex flex-wrap gap-2">
                     {["訪問完了", "部品交換", "発注済み", "連絡済"].map((label) => (
                        <button key={label} onClick={() => setVisitDetails(prev => prev ? prev + "、" + label : label)} className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200 active:scale-90 transition-all shadow-sm"> {label} </button>
                     ))}
                  </div>

                  <textarea value={visitDetails} onChange={e => setVisitDetails(e.target.value)} placeholder="実施内容を入力..." className="w-full text-sm p-4 bg-white border border-slate-200 text-slate-900 rounded-2xl outline-none focus:border-blue-500 transition-all font-medium h-28 resize-none shadow-sm" />
                  
                  <button onClick={handleAddVisit} disabled={saving || !visitDetails.trim()} className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                     {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 作業記録を保存する
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* Parts List Section */}
      <div className="w-[94%] max-w-md mb-4 flex items-center justify-between px-2">
         <div>
           <h2 className="text-[17px] font-bold text-slate-900">使用部品・機材管理</h2>
           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Maintenance Equip</p>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setShowBulkInput(!showBulkInput)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 shadow-sm active:scale-90"><Plus size={18} /></button>
            <label className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 cursor-pointer active:scale-90 transition-all hover:bg-blue-700">
                {saving ? <Loader2 size={20} className="animate-spin text-white" /> : <UploadCloud size={20} className="text-white" />}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={saving} />
            </label>
         </div>
      </div>

      {showBulkInput && (
          <div className="w-[94%] max-w-md bg-white p-6 rounded-[28px] border border-slate-200 shadow-xl mb-8 animate-in slide-in-from-top-4 z-30">
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="部件名 / 型番 / 数量..." className="w-full h-32 p-4 bg-slate-50 text-slate-900 rounded-2xl text-[13px] font-medium border border-slate-200 focus:border-blue-500 mb-4 outline-none resize-none shadow-inner" />
              <div className="flex gap-3">
                  <button onClick={() => setShowBulkInput(false)} className="flex-1 py-4 text-[11px] font-bold text-slate-400 uppercase">閉じる</button>
                  <button onClick={handleBulkParse} disabled={saving || !bulkText.trim()} className="flex-2 py-4 text-[11px] font-bold text-white bg-slate-900 rounded-xl shadow-lg shadow-slate-200">解析を実行</button>
              </div>
          </div>
      )}

      {previewParts.length > 0 && (
          <div className="w-[94%] max-w-md bg-white p-6 rounded-[28px] border-2 border-emerald-100 shadow-xl mb-8 z-30">
              <h3 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2"> <Check size={18} /> 解析結果 ({previewParts.length}件) </h3>
              <div className="flex flex-col gap-3 mb-6 max-h-60 overflow-y-auto pr-2">
                  {previewParts.map((p, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center group">
                          <div>
                             <p className="text-[13px] font-bold text-slate-800">{p.partName}</p>
                             <p className="text-[9px] text-slate-400 font-bold mt-1">PN: {p.partCode} / {p.quantity}個 / ¥{Number(p.price).toLocaleString()}</p>
                          </div>
                          <button onClick={() => removePreviewPart(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setPreviewParts([])} className="flex-1 py-4 text-[11px] font-bold text-slate-400">破棄</button>
                  <button onClick={saveBulkParts} disabled={saving} className="flex-2 bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-md shadow-emerald-100">一括保存</button>
              </div>
          </div>
      )}

      <div className="w-[94%] max-w-md flex flex-col gap-4 mb-16 relative z-10">
        {parts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-widest">使用部品なし</div>
        ) : (
          parts.map(p => (
            <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative group/part">
                  {editingPartId === p.id ? (
                    <div className="flex flex-col gap-4 text-slate-800">
                      <div className="flex justify-between items-center">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">部品情報を編集</h4>
                         <div className="flex gap-2">
                           <button onClick={() => setEditingPartId(null)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center active:scale-90"><X size={16}/></button>
                           <button onClick={handleUpdatePart} className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center active:scale-90 shadow-md"><Check size={16} strokeWidth={3}/></button>
                         </div>
                      </div>
                      <input className="w-full bg-slate-50 p-3.5 rounded-xl text-sm font-bold text-slate-900 border border-slate-200 focus:border-blue-500 outline-none" value={editingPartData.partName} onChange={e => setEditingPartData({...editingPartData, partName: e.target.value})} />
                      <div className="grid grid-cols-2 gap-3">
                         <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-bold text-slate-400 px-1 uppercase leading-none">型番</span>
                            <input className="bg-white p-3 rounded-lg text-xs font-bold border border-slate-200 focus:border-blue-500 outline-none" value={editingPartData.partCode} onChange={e => setEditingPartData({...editingPartData, partCode: e.target.value})} />
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                               <span className="text-[8px] font-bold text-slate-400 px-1 uppercase leading-none">数量</span>
                               <input type="number" className="bg-white p-3 rounded-lg text-xs font-bold border border-slate-200 focus:border-blue-500 outline-none" value={editingPartData.quantity ?? 1} onChange={e => setEditingPartData({...editingPartData, quantity: Number(e.target.value)})} />
                            </div>
                            <div className="flex flex-col gap-1">
                               <span className="text-[8px] font-bold text-slate-400 px-1 uppercase leading-none">単価</span>
                               <input type="number" className="bg-white p-3 rounded-lg text-xs font-bold border border-slate-200 focus:border-blue-500 outline-none text-right" value={editingPartData.price ?? 0} onChange={e => setEditingPartData({...editingPartData, price: Number(e.target.value)})} />
                            </div>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                       <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-inner"> <Wrench size={18} /> </div>
                          <div>
                             <p className="text-sm font-bold text-slate-800 tracking-tight">{p.partName || "部品名なし"}</p>
                             <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">品番: {p.partCode || "---"} / {p.quantity}個 / ¥{Number(p.price).toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="flex gap-1.5 opacity-0 group-hover/part:opacity-100 transition-opacity">
                          <button onClick={() => {setEditingPartId(p.id); setEditingPartData(p);}} className="text-slate-400 hover:text-blue-500 p-2"><Edit3 size={16}/></button>
                          <button onClick={() => deletePart(p.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                       </div>
                    </div>
                  )}
            </div>
          ))
        )}
      </div>

      {/* Quote List Section */}
      <div className="w-[94%] max-w-md mb-8 relative z-20">
         <div className="flex justify-between items-center px-2 mb-4">
            <h2 className="text-[17px] font-bold text-slate-900">発行済みの見積書</h2>
            <Link href={`/cases/${params.id}/quote`} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-500 hover:text-slate-900 transition-all">
               <Plus size={20} />
            </Link>
         </div>

         <div className="flex flex-col gap-4 px-1">
           {quotes.length === 0 ? (
             <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">発行済みの見積書はありません</div>
           ) : (
             quotes.map(q => (
               <div key={q.id} className="relative group/quote bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all active:scale-[0.98]">
                     <Link href={`/cases/${params.id}/quote?quoteId=${q.id}`} className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-sm" />
                           <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">発行日: {q.createdAt || "不明"}</p>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">合計: ¥{Number(q.totalAmount).toLocaleString()}</h3>
                     </Link>
                     <div className="flex items-center gap-4">
                        <button onClick={() => deleteQuote(q.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={20} /></button>
                        <Link href={`/cases/${params.id}/quote?quoteId=${q.id}`} className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 hover:bg-blue-100 transition-all">
                           <ArrowRight size={22} />
                        </Link>
                     </div>
               </div>
             ))
           )}
         </div>
      </div>

      {/* Footer Nav Action */}
      <div className="w-[92%] max-w-md mt-6 relative z-10">
         <Link href={`/cases/${params.id}/quote`} className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
            <Plus size={22} strokeWidth={3} />
            <span className="text-lg tracking-wider">新規見積書を作成する</span>
         </Link>
      </div>
    </div>
  );
}
