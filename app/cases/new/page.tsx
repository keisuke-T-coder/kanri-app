"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Loader2 } from "lucide-react";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    receiptNo: "",
    receiptDate: new Date().toISOString().split('T')[0],
    requestDate: new Date().toISOString().split('T')[0],
    contactTel: "",
    visitTel: "",
    visitAddress: "",
    targetProduct: "",
    targetProductCode: "",
    usageStartDate: "",
    requestDetails: "",
    clientMessage: "",
    clientCategory: "",
    clientName: "",
    clientTel: "",
    clientFax: "",
    clientOrderNo: "",
    status: "未対応"
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setLoading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      data.append("type", "case");

      const res = await fetch("/api/analyze-image", {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("画像解析に失敗しました");
      const analyzedData = await res.json();
      
      // Merge with existing formdata
      setFormData((prev: any) => ({ ...prev, ...analyzedData }));
      alert("画像の解析が完了し、フォームに自動入力されました。内容を確認・修正してください。");
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
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveCase", payload: formData })
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      
      const { id } = await res.json();
      router.push(`/cases/${id}`);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-10 relative text-slate-800">
      <div className="w-[92%] max-w-md mt-6 mb-6 flex items-center justify-between">
         <Link href="/cases" className="p-2 bg-white rounded-full shadow-sm active:scale-90">
            <ArrowLeft size={20} />
         </Link>
         <h1 className="text-xl font-black text-gray-900 tracking-widest">新規案件登録</h1>
         <div className="w-[36px]" /> {/* Spacer */}
      </div>

      <div className="w-[92%] max-w-md bg-white rounded-[20px] p-6 shadow-sm mb-6">
        <label className="border-2 border-dashed border-[#eaaa43] bg-orange-50 rounded-[14px] p-6 flex flex-col items-center justify-center cursor-pointer active:bg-orange-100 transition-colors">
          <UploadCloud className="text-[#eaaa43] mb-2" size={32} />
          <span className="font-bold text-[#eaaa43]">依頼書をカメラで解析</span>
          <span className="text-xs text-orange-600 mt-1">※Gemini AIにより自動入力</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={loading} />
        </label>
      </div>

      <form onSubmit={handleSubmit} className="w-[92%] max-w-md bg-white rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">依頼日</label>
            <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange} className="w-full border border-[#eaaa43] bg-orange-50/30 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">受付番号</label>
            <input type="text" name="receiptNo" value={formData.receiptNo} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">受付日（メーカー等）</label>
          <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">依頼元</label>
          <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">訪問先住所</label>
          <input type="text" name="visitAddress" value={formData.visitAddress} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">訪問先TEL</label>
            <input type="tel" name="visitTel" value={formData.visitTel} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">連絡先TEL</label>
            <input type="tel" name="contactTel" value={formData.contactTel} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">対象商品（品目）</label>
            <input type="text" name="targetProduct" value={formData.targetProduct} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">対象商品（品番）</label>
            <input type="text" name="targetProductCode" value={formData.targetProductCode} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">依頼内容</label>
          <textarea name="requestDetails" rows={3} value={formData.requestDetails} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#eaaa43] outline-none"></textarea>
        </div>

        <button type="submit" disabled={loading} className="mt-4 w-full bg-[#eaaa43] text-white py-3 rounded-[14px] font-bold shadow flex justify-center items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : "この内容で保存する"}
        </button>

      </form>
    </div>
  );
}
