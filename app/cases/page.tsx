"use client";
import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { Plus, ChevronRight, FileText, Wrench, MoreHorizontal, Trash2, ExternalLink, Edit } from "lucide-react";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const deleteCase = async (id: string, name: string) => {
    if (!confirm(`案件「${name}」を削除してもよろしいですか？\n※この操作は取り消せません。`)) return;
    
    setDeletingId(id);
    try {
      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteCase", sheetName: "Cases", id })
      });
      if (res.ok) {
        setCases(cases.filter(c => c.id !== id));
        alert("削除しました。");
      }
    } catch (error) {
      alert("削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center font-sans pb-24 relative overflow-hidden text-slate-800">
      <div className="w-[92%] max-w-md mt-8 mb-8 flex justify-between items-end px-1">
         <div>
           <h1 className="text-[22px] font-black text-gray-900 tracking-tight">案件管理</h1>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Management Area</p>
         </div>
         <Link href="/cases/new" className="bg-white border border-[#eaaa43] text-[#eaaa43] px-5 py-2 rounded-full font-black text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform hover:bg-orange-50">
            <Plus size={14} strokeWidth={3} /> 新規登録
         </Link>
      </div>

      <div className="w-[92%] max-w-md flex flex-col gap-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500 font-medium animate-pulse">読み込み中...</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-[20px] shadow-sm text-gray-500">案件がありません</div>
        ) : (
          cases.map((c) => (
            <div key={c.id} className="bg-white rounded-[24px] shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-50 p-0 flex flex-col active:scale-[0.98] transition-transform overflow-hidden">
              <Link href={`/cases/${c.id}`} className="p-6 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-black text-gray-300 tracking-wider">NO: {c.receiptNo || "---"}</span>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-black ${c.status === "完了" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
                    {c.status || "未対応"}
                  </span>
                </div>
                <h2 className="text-[1.2rem] font-black text-gray-900 mb-1">{c.clientName || "名称未設定"} <span className="text-sm font-bold text-gray-400">様</span></h2>
                <p className="text-sm text-gray-500 mb-4 truncate">{c.targetProduct || "対象商品未設定"} - {c.requestDetails || "依頼内容未設定"}</p>
                
                <div className="flex gap-2 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1"><FileText size={12}/> {c.receiptDate ? new Date(c.receiptDate).toLocaleDateString() : ""}</span>
                  <span className="flex items-center gap-1"><Wrench size={12}/> {c.clientCategory || "分類未定"}</span>
                </div>
              </Link>

              {/* Action Buttons */}
              <div className="px-6 pb-5 pt-2">
                 <button 
                   onClick={(e) => { e.preventDefault(); deleteCase(c.id, c.clientName); }}
                   disabled={deletingId === c.id}
                   className="w-full bg-gray-50/50 hover:bg-red-50 text-gray-300 hover:text-red-500 py-3 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black active:scale-95 transition-all disabled:opacity-50 border border-transparent hover:border-red-100"
                 >
                    <Trash2 size={13} /> 案件情報を削除
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Back button */}
      <div className="w-[92%] max-w-md mt-8">
        <Link href="/" className="bg-[#fcfbf9]/50 text-gray-400 px-4 py-4 rounded-[18px] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform border border-dashed border-gray-200">
           ホームへ戻る
        </Link>
      </div>
    </div>
  );
}
