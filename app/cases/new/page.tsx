"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Loader2, FileText, MapPin, Wrench, X, Check, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState("");
  const [bulkData, setBulkData] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    id: uuidv4(),
    status: "未完了",
    requestDate: new Date().toISOString().split('T')[0],
    receiptNo: "",
    receiptDate: new Date().toISOString().split('T')[0],
    contactName: "",
    visitName: "",
    visitAddress: "",
    visitTel: "",
    contactTel: "",
    targetProduct: "",
    targetProductCode: "",
    usageStartDate: "",
    serialNo: "",
    requestDetails: "",
    clientName: "",
    clientTel: "",
    clientFax: "",
    clientMessage: "",
    nextVisitDate: ""
  });

  const handleTextImport = () => {
    try {
      const parsed = JSON.parse(importText);
      
      const mapping: any = {
        requestDate: ["requestDate", "依頼日"],
        receiptNo: ["receiptNo", "受付番号"],
        receiptDate: ["receiptDate", "受付日"],
        contactName: ["contactName", "連絡先名"],
        visitName: ["visitName", "訪問先名"],
        visitAddress: ["visitAddress", "訪問先住所"],
        visitTel: ["visitTel", "訪問先電話番号", "訪問先TEL"],
        contactTel: ["contactTel", "連絡先電話番号", "連絡先TEL"],
        targetProduct: ["targetProduct", "品目", "製品名"],
        targetProductCode: ["targetProductCode", "品番", "型番"],
        usageStartDate: ["usageStartDate", "使用開始年月"],
        serialNo: ["serialNo", "製造番号"],
        requestDetails: ["requestDetails", "依頼内容"],
        clientName: ["clientName", "依頼元名", "依頼元"],
        clientTel: ["clientTel", "依頼元電話番号", "依頼元TEL"],
        clientFax: ["clientFax", "依頼元FAX番号", "依頼元FAX"],
        clientMessage: ["clientMessage", "依頼元メッセージ"],
        status: ["status", "ステータス"],
        nextVisitDate: ["nextVisitDate", "次回訪問日", "次回予定"]
      };

      const normalize = (data: any) => {
        const item: any = { id: uuidv4(), status: "未完了" };
        Object.keys(mapping).forEach(key => {
          const variations = mapping[key];
          for (const v of variations) {
            const foundKey = Object.keys(data).find(pk => pk.toLowerCase() === v.toLowerCase());
            if (foundKey && data[foundKey]) {
              item[key] = data[foundKey];
              break;
            }
          }
        });
        // 強制的に未完了にする（マッピングによる上書きを防ぐ）
        item.status = "未完了";
        return item;
      };

      if (Array.isArray(parsed)) {
        const normalizedList = parsed.map(p => normalize(p));
        setBulkData(normalizedList);
        setShowImportArea(false);
        setImportText("");
        alert(`${normalizedList.length}件のデータを読み込みました。確認して保存してください。`);
      } else {
        const normalized = normalize(parsed);
        setFormData({ ...formData, ...normalized });
        setShowImportArea(false);
        setImportText("");
        alert("データを読み込みました。");
      }
    } catch (e) {
      alert("JSONの形式が正しくありません。正しい形式で貼り付けてください。");
    }
  };

  const handleBulkSubmit = async () => {
    if (!confirm(`${bulkData.length}件の案件を一括で登録します。よろしいですか？`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCases", sheetName: "Cases", payload: bulkData })
      });
      if (!res.ok) throw new Error("一括保存に失敗しました");
      
      alert(`${bulkData.length}件の登録が完了しました。一覧へ戻ります。`);
      router.push("/cases");
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setLoading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      data.append("type", "case");

      const res = await fetch("/api/analyze-image", { method: "POST", body: data });
      if (!res.ok) throw new Error("画像解析に失敗しました");
      const analyzedData = await res.json();
      const finalData = { ...analyzedData, status: "未完了" };
      setFormData((prev: any) => ({ ...prev, ...finalData }));
      alert("画像の解析が完了しました。内容を確認・修正してください。");
    } catch (error: any) {
      alert(error.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalPayload = { ...formData, status: "未完了" };
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCase", sheetName: "Cases", payload: finalPayload })
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      router.push(`/cases/${formData.id}`);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  const Section = ({ title, children, icon: Icon }: any) => (
    <div className="w-full bg-white rounded-[32px] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.02)] border border-gray-50 mb-6 transition-all hover:shadow-[0_12px_50px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-[#eaaa43]">
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-black text-gray-900 tracking-widest uppercase">{title}</h3>
      </div>
      <div className="flex flex-col gap-5">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-24 relative text-slate-800">
      <div className="w-[92%] max-w-md mt-10 mb-8 flex items-center justify-between px-2">
         <Link href="/cases" className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-90 transition-transform">
            <ArrowLeft size={20} className="text-gray-400" />
         </Link>
         <div className="text-center">
           <h1 className="text-xl font-black text-gray-900 tracking-[0.1em]">新規案件登録</h1>
           <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Register New Maintenance Case</p>
         </div>
         <div className="w-[44px]" />
      </div>

      <div className="w-[92%] max-w-md flex flex-col gap-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowImportArea(!showImportArea)}
            className={`flex flex-col items-center justify-center p-6 rounded-[28px] border-2 transition-all active:scale-95 ${
              showImportArea ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-transparent text-gray-900 shadow-sm"
            }`}
          >
            <FileText size={24} className={showImportArea ? "text-orange-300" : "text-gray-300"} />
            <span className="text-[11px] font-black mt-2 tracking-widest">テキスト読込</span>
          </button>
          
          <label className="bg-white rounded-[28px] p-6 shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-orange-50/0 group-active:bg-orange-50/100 transition-colors" />
            <UploadCloud size={24} className="text-gray-300 relative z-10" />
            <span className="text-[11px] font-black mt-2 tracking-widest relative z-10">画像解析</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={loading} />
          </label>
        </div>

        {showImportArea && (
          <div className="bg-gray-900 rounded-[32px] p-7 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 mt-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-orange-200 tracking-widest uppercase">External AI JSON Import</span>
              <button onClick={() => setShowImportArea(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16}/></button>
            </div>
            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="外部AIの出力を貼り付けてください..."
              className="w-full h-32 bg-white/5 border-none rounded-2xl p-4 text-[13px] font-mono text-white outline-none focus:ring-1 focus:ring-orange-300 transition-all mb-4"
            />
            <button 
              onClick={handleTextImport}
              disabled={!importText.trim()}
              className="w-full bg-[#eaaa43] text-white py-4 rounded-2xl text-xs font-black shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              解析して反映する
            </button>
          </div>
        )}
      </div>

      {bulkData.length > 0 && (
        <div className="w-[92%] max-w-md bg-white p-7 rounded-[32px] shadow-xl mb-8 border-2 border-orange-100 flex flex-col gap-4 animate-in zoom-in-95 duration-300">
           <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <div className="p-1 bg-[#eaaa43] text-white rounded">
                  <Check size={14} />
                </div>
                一括インポート確認 ({bulkData.length}件)
              </h3>
              <button onClick={() => setBulkData([])} className="text-[10px] font-black text-red-400 uppercase tracking-widest active:opacity-70 transition-opacity">Clear</button>
           </div>
           
           <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-orange-100">
              {bulkData.map((d, index) => (
                <div key={index} className="p-4 bg-orange-50/20 rounded-[22px] border border-orange-100/50 flex justify-between items-center text-[10px] text-gray-600 group hover:border-[#eaaa43]/30 transition-all">
                   <div className="flex flex-col gap-1 max-w-[70%]">
                      <p className="font-black text-gray-900 truncate text-[11px]">No.{index+1}: {d.visitName || "名称不明"}</p>
                      <p className="opacity-60 truncate font-medium">{d.visitAddress || "住所なし"}</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-white rounded-full text-orange-400 font-black shadow-sm text-[9px] tracking-wider border border-orange-50">READY</div>
                      <button 
                        onClick={() => {
                          const newList = [...bulkData];
                          newList.splice(index, 1);
                          setBulkData(newList);
                        }}
                        className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                         <Trash2 size={14} />
                      </button>
                   </div>
                </div>
              ))}
           </div>

           <button 
             onClick={handleBulkSubmit}
             disabled={loading}
             className="w-full bg-[#eaaa43] text-white py-5 rounded-[22px] font-black shadow-xl shadow-orange-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
           >
             {loading ? <Loader2 size={18} className="animate-spin" /> : <><UploadCloud size={18} strokeWidth={3} /> この{bulkData.length}件を一括で登録する</>}
           </button>
        </div>
      )}

      {bulkData.length === 0 && (
        <form onSubmit={handleSubmit} className="w-[92%] max-w-md flex flex-col">
          <Section title="Basic Info / 基本情報" icon={FileText}>
             <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Request / 依頼日</label>
                 <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange} className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Receipt / 受付番号</label>
                 <input type="text" name="receiptNo" value={formData.receiptNo} onChange={handleChange} placeholder="番号を入力" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
             </div>
             <div className="flex flex-col gap-1.5">
             <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Next Visit / 次回訪問日時</label>
             <input type="datetime-local" name="nextVisitDate" value={formData.nextVisitDate} onChange={handleChange} step="1800" className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-black focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
           </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Receipt Date / 受付日</label>
               <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
             </div>
          </Section>

          <Section title="Site Info / 訪問先" icon={MapPin}>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Destination / 訪問先名</label>
               <input type="text" name="visitName" value={formData.visitName} onChange={handleChange} placeholder="お名前・建物名" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-black focus:ring-2 focus:ring-orange-100 outline-none transition-all" required />
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Address / 住所</label>
               <textarea name="visitAddress" value={formData.visitAddress} onChange={handleChange} rows={2} placeholder="訪問先の住所を入力" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none" required />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Site TEL / 訪問先TEL</label>
                 <input type="tel" name="visitTel" value={formData.visitTel} onChange={handleChange} placeholder="080-..." className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Contact Name / 連絡先名</label>
                 <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="担当者等" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">alt TEL / 連絡先TEL</label>
               <input type="tel" name="contactTel" value={formData.contactTel} onChange={handleChange} placeholder="緊急連絡先" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
             </div>
          </Section>

          <Section title="Product Info / 製品" icon={Wrench}>
             <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Product / 品目</label>
                 <input type="text" name="targetProduct" value={formData.targetProduct} onChange={handleChange} placeholder="給湯器等" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Model / 品番</label>
                 <input type="text" name="targetProductCode" value={formData.targetProductCode} onChange={handleChange} placeholder="型番" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Started / 開始年月</label>
                  <input type="text" name="usageStartDate" value={formData.usageStartDate} onChange={handleChange} placeholder="YYYY-MM" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Serial / 製造番号</label>
                  <input type="text" name="serialNo" value={formData.serialNo} onChange={handleChange} placeholder="SN" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
                </div>
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Defects / 依頼内容</label>
               <textarea name="requestDetails" value={formData.requestDetails} onChange={handleChange} rows={3} placeholder="不具合状況の詳細" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none" />
             </div>
          </Section>

          <Section title="Client Info / 依頼元" icon={ArrowLeft}>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Source / 依頼元名</label>
               <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="会社名等" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-black focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">TEL / 依頼元TEL</label>
                 <input type="tel" name="clientTel" value={formData.clientTel} onChange={handleChange} className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">FAX / 依頼元FAX</label>
                 <input type="tel" name="clientFax" value={formData.clientFax} onChange={handleChange} className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
               </div>
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-gray-400 ml-1 tracking-widest uppercase">Message / メッセージ</label>
               <textarea name="clientMessage" value={formData.clientMessage} onChange={handleChange} rows={2} placeholder="依頼元からの特記事項" className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none" />
             </div>
          </Section>

          <button type="submit" disabled={loading} className="mt-6 w-full bg-[#eaaa43] text-white py-5 rounded-[22px] font-black shadow-xl shadow-orange-100 flex justify-center items-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 hover:brightness-105">
            {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} strokeWidth={3} /> この内容で案件を登録する</>}
          </button>

          <div className="h-10" />
        </form>
      )}
    </div>
  );
}
