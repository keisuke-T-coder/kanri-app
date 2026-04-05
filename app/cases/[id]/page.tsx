"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Loader2, FileText, Plus, Trash2, MapPin, Edit3, Check, X, Wrench } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
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
        body: JSON.stringify({ action: "saveParts", payload: [newPart] })
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
      const res = await fetch("/api/analyze-parts-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText })
      });
      if (!res.ok) throw new Error("テキスト解析に失敗しました");
      const data = await res.json();
      
      const newParts = data.map((p: any) => ({
        ...p,
        id: uuidv4(),
        caseId: params.id,
        orderStatus: "未手配"
      }));
      
      setPreviewParts(newParts);
      setShowBulkInput(false);
      setBulkText("");
    } catch (error: any) {
      alert(error.message);
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
        body: JSON.stringify({ action: "saveParts", payload: previewParts })
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
        body: JSON.stringify({ action: "saveParts", payload: [editingPartData] })
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

  if (loading) return <div className="text-center py-20 text-gray-500 font-medium">読み込み中...</div>;
  if (!caseData) return <div className="text-center py-20 text-gray-500 font-medium">案件が見つかりません。</div>;

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center font-sans pb-24 relative text-slate-800">
      <div className="w-[92%] max-w-md mt-8 mb-6 flex items-center justify-between px-1">
         <Link href="/cases" className="p-2.5 bg-white rounded-xl shadow-sm active:scale-90 border border-gray-100">
            <ArrowLeft size={18} className="text-gray-400" />
         </Link>
         <div className="text-center flex flex-col">
           <h1 className="text-[18px] font-black text-gray-900 tracking-tight">案件詳細</h1>
           <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest leading-none mt-0.5">Case Identifier: {params.id.slice(0,8)}</p>
         </div>
         <div className="w-[42px]" />
      </div>

      <div className="w-[92%] max-w-md bg-white rounded-[24px] p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] mb-6 flex flex-col gap-2 relative border border-gray-50">
         {!editingInfo ? (
            <>
               <span className={`absolute top-6 right-6 text-[10px] px-3 py-1 rounded-full font-black ${caseData.status === "完了" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
                  {caseData.status || "未対応"}
               </span>
               <div className="flex gap-3 items-center mb-1.5">
                  <p className="text-[9px] font-black text-gray-300 bg-gray-50 px-2 py-0.5 rounded tracking-wider uppercase">Receipt: {caseData.receiptNo}</p>
                  <p className="text-[9px] font-black text-[#eaaa43] bg-orange-50/50 px-2 py-0.5 rounded tracking-wider uppercase">REQ: {caseData.requestDate || "TBD"}</p>
               </div>
               <h2 className="text-[1.4rem] font-black text-gray-900 leading-tight mb-1">{caseData.clientName} <span className="text-sm font-bold text-gray-400">様</span></h2>
               <div className="flex items-center gap-2 mb-4 group cursor-pointer" onClick={openInGoogleMaps}>
                  <MapPin size={13} className="text-blue-400" />
                  <p className="text-xs text-gray-500 font-medium group-hover:text-blue-500 transition-colors underline decoration-gray-200 underline-offset-4">{caseData.visitAddress}</p>
               </div>
               <div className="bg-gray-50/50 p-4 rounded-[16px] border border-gray-100 mb-5">
                  <p className="text-[11px] text-gray-600 font-bold mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#eaaa43] rounded-full"></span>
                    商品: {caseData.targetProduct} ({caseData.targetProductCode})
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    内容: {caseData.requestDetails}
                  </p>
               </div>
               <div className="flex gap-2.5">
                  <button 
                    onClick={() => setEditingInfo(true)} 
                    className="flex-1 bg-white border border-[#eaaa43] text-[#eaaa43] py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm hover:bg-orange-50"
                  >
                    <Edit3 size={14} /> 情報を編集
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm(`案件「${caseData.clientName}」を完全に削除してもよろしいですか？\n※この操作は取り消せません。`)) {
                         setSaving(true);
                         try {
                           const res = await fetch("/api/gas-new", {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ action: "deleteCase", sheetName: "Cases", id: params.id })
                           });
                           if (res.ok) {
                             alert("案件を削除しました。");
                             router.push("/cases");
                           }
                         } catch (error) {
                           alert("削除に失敗しました。");
                         } finally {
                           setSaving(false);
                         }
                      }
                    }}
                    className="bg-red-50 text-red-500 p-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-red-100/50"
                  >
                    <Trash2 size={16} /> 削除
                  </button>
               </div>
            </>
         ) : (
            <div className="flex flex-col gap-4">
               <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Editing Case Info</h3>
                  <div className="flex gap-2">
                     <button onClick={() => {setEditingInfo(false); setEditData(caseData);}} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={16}/></button>
                     <button onClick={handleUpdateCase} className="p-1.5 bg-[#eaaa43] text-white rounded-lg"><Check size={16}/></button>
                  </div>
               </div>
               <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold mb-1 ml-1 tracking-widest uppercase">REQ DATE</p>
                    <input type="date" className="w-full text-xs p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#eaaa43] font-bold" value={editData.requestDate || ""} onChange={e => setEditData({...editData, requestDate: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold mb-1 ml-1 tracking-widest uppercase">Receipt NO</p>
                    <input className="w-full text-xs p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#eaaa43] font-bold" value={editData.receiptNo || ""} onChange={e => setEditData({...editData, receiptNo: e.target.value})} />
                  </div>
               </div>
               <input 
                  className="w-full text-xl font-black border-b-2 border-gray-100 focus:border-[#eaaa43] outline-none py-2 transition-colors" 
                  value={editData.clientName} 
                  onChange={e => setEditData({...editData, clientName: e.target.value})} 
                  placeholder="お名前"
               />
               <textarea 
                  className="w-full text-sm border-b-2 border-gray-100 focus:border-[#eaaa43] outline-none resize-none py-2 transition-colors" 
                  value={editData.visitAddress} 
                  onChange={e => setEditData({...editData, visitAddress: e.target.value})} 
                  placeholder="住所"
               />
               <textarea 
                  className="w-full text-sm border-b-2 border-gray-100 focus:border-[#eaaa43] outline-none resize-none py-2 transition-colors min-h-[80px]" 
                  value={editData.requestDetails} 
                  onChange={e => setEditData({...editData, requestDetails: e.target.value})} 
                  placeholder="依頼内容"
               />
            </div>
         )}
      </div>

      <div className="w-[92%] max-w-md mb-6 bg-white p-7 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50">
         <h2 className="text-[17px] font-black text-gray-900 mb-5 flex items-center gap-2.5">
            <div className="p-1.5 bg-orange-50 rounded-lg text-[#eaaa43]">
              <Wrench size={16} />
            </div>
            訪問履歴・作業記録
         </h2>
         
         <div className="flex flex-col gap-5 mb-8">
            {visits.length === 0 ? (
               <p className="text-center text-[10px] text-gray-300 py-6 border border-dashed border-gray-100 rounded-2xl font-bold uppercase tracking-widest">No Logs Yet</p>
            ) : (
               visits.map((v, i) => (
                  <div key={i} className="flex gap-4 items-start relative group">
                     <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 bg-[#eaaa43] rounded-full ring-4 ring-orange-50" />
                        {i !== visits.length - 1 && <div className="w-[1px] h-full bg-gray-100 absolute top-2 left-1 -z-10" />}
                     </div>
                     <div className="flex flex-col gap-0.5 pt-0">
                        <p className="text-[9px] font-black text-gray-300 tracking-wider uppercase">{v.visitDate}</p>
                        <p className="text-[11px] text-gray-700 font-medium leading-relaxed">{v.details}</p>
                     </div>
                  </div>
               ))
            )}
         </div>

         <div className="bg-[#fcfbf9]/80 p-5 rounded-[20px] border border-gray-100/50 shadow-inner">
            <p className="text-[9px] font-black text-gray-400 mb-3 px-1 tracking-widest uppercase">Add Work Log</p>
            <div className="flex flex-col gap-3 mb-4 text-slate-800">
               <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full text-xs p-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#eaaa43] transition-colors font-bold shadow-sm" />
               <textarea value={visitDetails} onChange={e => setVisitDetails(e.target.value)} placeholder="実施した作業の内容を入力..." className="w-full text-xs p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#eaaa43] transition-colors font-medium shadow-sm h-20 resize-none" />
            </div>
            <button onClick={handleAddVisit} disabled={saving || !visitDetails.trim()} className="w-full bg-[#eaaa43] text-white py-4 rounded-xl text-xs font-black shadow-lg shadow-orange-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
               {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 記録を保存
            </button>
         </div>
      </div>

      <div className="w-[92%] max-w-md flex items-center justify-between mb-4 px-1">
         <h2 className="text-[18px] font-black text-gray-900 tracking-tight">修理部品リスト</h2>
         <div className="flex gap-2">
            <button 
                onClick={() => setShowBulkInput(!showBulkInput)}
                className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-black shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform hover:bg-gray-50"
            >
                <Plus size={12} strokeWidth={3} /> 一括追加
            </button>
            <label className="bg-[#eaaa43] text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-orange-100 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={3} />}
                <span>画像解析</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={saving} />
            </label>
         </div>
      </div>

      {showBulkInput && (
          <div className="w-[92%] max-w-md bg-white p-5 rounded-[24px] shadow-xl mb-6 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-[#eaaa43] rounded-full animate-pulse" />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bulk Import Tool</p>
              </div>
              <textarea 
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="部品A / 型番1 / 2個..."
                  className="w-full h-32 p-4 bg-gray-50 rounded-xl text-xs font-medium border-none focus:ring-2 focus:ring-orange-100 mb-4 outline-none resize-none transition-all"
              />
              <div className="flex gap-2.5">
                  <button onClick={() => setShowBulkInput(false)} className="flex-1 py-3 text-xs font-black text-gray-400 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">キャンセル</button>
                  <button 
                    onClick={handleBulkParse} 
                    disabled={saving || !bulkText.trim()}
                    className="flex-2 py-3 text-xs font-black text-white bg-gray-900 rounded-xl flex items-center justify-center gap-2 disabled:bg-gray-200 transition-all shadow-lg"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    解析実行
                  </button>
              </div>
          </div>
      )}

      {previewParts.length > 0 && (
          <div className="w-[92%] max-w-md bg-white p-6 rounded-[24px] shadow-2xl mb-6 border-2 border-orange-100 animate-in zoom-in-95 duration-300">
              <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-1 bg-[#eaaa43] text-white rounded">
                    <Check size={14} />
                  </div>
                  読み取り結果（{previewParts.length}件）
              </h3>
              <div className="flex flex-col gap-2.5 mb-5 max-h-60 overflow-y-auto pr-1">
                  {previewParts.map((p, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-xl text-[10px] border border-gray-100 flex justify-between items-center group shadow-sm">
                          <div>
                             <p className="font-black text-gray-800">{p.partName}</p>
                             <p className="text-gray-400 font-medium">品番: {p.partCode} / {p.quantity}個 / ¥{Number(p.price).toLocaleString()}</p>
                          </div>
                          <button onClick={() => removePreviewPart(idx)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                             <Trash2 size={13} />
                          </button>
                      </div>
                  ))}
              </div>
              <div className="flex gap-2.5">
                  <button onClick={() => setPreviewParts([])} className="flex-1 py-3 text-xs font-black text-gray-400 bg-gray-50 rounded-xl">破棄</button>
                  <button 
                    onClick={saveBulkParts} 
                    disabled={saving}
                    className="flex-2 py-3 text-xs font-black text-white bg-[#eaaa43] rounded-xl shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    一括保存する
                  </button>
              </div>
          </div>
      )}

      <div className="w-[92%] max-w-md flex flex-col gap-3 mb-12">
        {parts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-[10px] text-gray-300 font-bold border border-dashed border-gray-100 uppercase tracking-widest">No Parts Selected</div>
        ) : (
          parts.map(p => (
            <div key={p.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-4 border border-transparent hover:border-[#eaaa43]/30 transition-all group">
               {editingPartId === p.id ? (
                 <div className="flex flex-col gap-3">
                   <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Editing Part</p>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingPartId(null)} className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-colors"><X size={14}/></button>
                        <button onClick={handleUpdatePart} className="p-1.5 bg-[#eaaa43] text-white rounded-lg hover:brightness-105 transition-all"><Check size={14}/></button>
                      </div>
                   </div>
                   <input className="w-full bg-gray-50 p-4 rounded-2xl text-base font-black outline-none border-2 border-transparent focus:border-[#eaaa43] transition-all" value={editingPartData.partName} onChange={e => setEditingPartData({...editingPartData, partName: e.target.value})} placeholder="部品名" />
                   
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">型番 / Model Number</p>
                        <input className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold outline-none border border-gray-100 focus:border-[#eaaa43] transition-all" value={editingPartData.partCode} onChange={e => setEditingPartData({...editingPartData, partCode: e.target.value})} placeholder="型番を入力" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">数量 / Qty</p>
                          <input 
                            type="number" 
                            min="1"
                            step="1"
                            className="w-full bg-white p-4 rounded-2xl text-lg font-black outline-none border-2 border-gray-100 focus:border-[#eaaa43] transition-all" 
                            value={editingPartData.quantity ?? ""} 
                            onChange={e => {
                               const val = e.target.value === "" ? "" : Number(e.target.value);
                               setEditingPartData({...editingPartData, quantity: val});
                            }} 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">単価 / Price (¥)</p>
                          <input 
                            type="number" 
                            className="w-full bg-white p-4 rounded-2xl text-lg font-black outline-none text-right border-2 border-gray-100 focus:border-[#eaaa43] transition-all" 
                            value={editingPartData.price ?? ""} 
                            onChange={e => {
                               const val = e.target.value === "" ? "" : Number(e.target.value);
                               setEditingPartData({...editingPartData, price: val});
                            }} 
                          />
                        </div>
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-orange-50 transition-colors">
                         <Wrench size={16} className="text-gray-400 group-hover:text-[#eaaa43]" />
                       </div>
                       <div>
                         <p className="text-sm font-black text-gray-800">{p.partName || "部品名未定"}</p>
                         <p className="text-[10px] text-gray-400 font-medium">品番: {p.partCode} / {p.quantity}個 / ¥{Number(p.price).toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => {setEditingPartId(p.id); setEditingPartData(p);}} className="p-2.5 text-gray-300 hover:text-[#eaaa43] hover:bg-orange-50 rounded-xl transition-all active:scale-90">
                         <Edit3 size={15} />
                       </button>
                       <button onClick={() => deletePart(p.id)} className="p-2.5 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                         <Trash2 size={15} />
                       </button>
                    </div>
                 </div>
               )}
            </div>
          ))
        )}
      </div>

      <div className="w-[92%] max-w-md mb-4 px-1">
         <h2 className="text-[18px] font-black text-gray-900 tracking-tight">作成済み見積書</h2>
      </div>

      <div className="w-[92%] max-w-md flex flex-col gap-3 mb-12">
        {quotes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-[10px] text-gray-300 font-bold border border-dashed border-gray-100 uppercase tracking-widest">No Quotes Issued</div>
        ) : (
          quotes.map(q => (
            <div key={q.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex justify-between items-center border border-transparent hover:border-[#eaaa43]/30 transition-all group overflow-hidden relative">
               <Link href={`/cases/${params.id}/quote?quoteId=${q.id}`} className="flex-1 z-10">
                  <div className="flex items-center gap-2 mb-1">
                     <div className="w-1.5 h-1.5 bg-[#eaaa43] rounded-full" />
                     <p className="text-[9px] font-black text-gray-300 uppercase tracking-wider">{q.createdAt || "---"}</p>
                  </div>
                  <p className="text-[15px] font-black text-gray-900 tracking-tight">合計: ¥{Number(q.totalAmount).toLocaleString()}</p>
               </Link>
               <div className="flex items-center gap-3 z-10">
                  <button onClick={() => deleteQuote(q.id)} className="p-2.5 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                     <Trash2 size={16} />
                  </button>
                  <Link href={`/cases/${params.id}/quote?quoteId=${q.id}`} className="px-5 py-2.5 bg-orange-50 text-[#eaaa43] rounded-xl text-[10px] font-black active:scale-95 transition-all hover:bg-[#eaaa43] hover:text-white shadow-sm border border-orange-100/50">
                     開く
                  </Link>
               </div>
               <div className="absolute top-0 right-0 p-1 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                  <FileText size={80} />
               </div>
            </div>
          ))
        )}
      </div>

      {/* New Quote Button */}
      <div className="w-[92%] max-w-md sticky bottom-6 mt-auto">
        <Link href={`/cases/${params.id}/quote`} className="bg-white border-2 border-gray-900 text-gray-900 w-full py-4 rounded-[20px] font-black shadow-xl flex justify-center items-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-widest hover:bg-gray-900 hover:text-white group">
          <FileText size={18} className="text-gray-400 group-hover:text-white transition-colors" /> 新規見積書を作成
        </Link>
      </div>
    </div>
  );
}
