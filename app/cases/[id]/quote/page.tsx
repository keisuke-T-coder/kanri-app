"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Mail, Loader2, ArrowRight, Save, CheckCircle, Check } from "lucide-react";
import dynamic from 'next/dynamic';
import QuotePDF from "../../../../components/QuotePDF";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <div className="text-gray-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> PDFエンジン準備中...</div> }
);

const TECHNICAL_FEES = [3200, 4300, 4850, 5400, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];
const TRAVEL_FEE = 4000;

const RECIPIENTS = [
  { name: "社内：運用担当A", email: "staff-a@example.com" },
  { name: "社内：運用担当B", email: "staff-b@example.com" },
  { name: "社内：運用担当C", email: "staff-c@example.com" },
  { name: "その他（手入力）", email: "" }
];

export default function QuotePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [technicalFee, setTechnicalFee] = useState(3200);
  const [isManualFee, setIsManualFee] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(RECIPIENTS[0]);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/gas-new?action=getCase&caseId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCaseData(data.case);
        const fetchedParts = data.parts || [];
        setParts(fetchedParts);
        
        // If viewing existing quote
        if (quoteId && data.quotes) {
          const existingQuote = data.quotes.find((q: any) => q.id === quoteId);
          if (existingQuote) {
            const fee = Number(existingQuote.technicalFee);
            setTechnicalFee(fee);
            setSaved(true);
            if (!TECHNICAL_FEES.includes(fee)) {
              setIsManualFee(true);
            }
          }
        } else {
            // Default select all
            setSelectedPartIds(new Set(fetchedParts.map((p: any) => p.id)));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePartSelection = (id: string) => {
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPartIds(newSelected);
    setSaved(false);
  };

  const filteredParts = parts.filter(p => selectedPartIds.has(p.id));
  const partsTotal = filteredParts.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0);
  const totalAmount = partsTotal + TRAVEL_FEE + technicalFee;

  const handleSaveQuote = async () => {
    setSaving(true);
    try {
      const payload = {
        id: uuidv4(),
        caseId: params.id,
        createdAt: format(new Date(), "yyyy-MM-dd HH:mm"),
        travelFee: TRAVEL_FEE,
        technicalFee: technicalFee,
        partsTotal: partsTotal,
        totalAmount: totalAmount,
        pdfUrl: "" 
      };

      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveQuote", payload })
      });

      if (!res.ok) throw new Error("保存に失敗しました");
      setSaved(true);
      alert("見積情報をスプレッドシートに保存しました。");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMailto = () => {
    const subject = encodeURIComponent(`【御見積】${caseData?.targetProduct}の修理作業につきまして`);
    const body = encodeURIComponent(`
${caseData?.clientName || "お客様"} 様

お世話になっております。
先日の修理依頼につき、御見積書を作成いたしました。
お手数ですが、別添のPDFファイルをご確認ください。

【案件情報】
受付番号: ${caseData?.receiptNo || "未発行"}
対象機器: ${caseData?.targetProduct} (${caseData?.targetProductCode})
内訳:
部品代合計: ${partsTotal.toLocaleString()} 円
出張費: ${TRAVEL_FEE.toLocaleString()} 円
基本技術料: ${technicalFee.toLocaleString()} 円

見積合計金額: ${totalAmount.toLocaleString()} 円 (税込)

よろしくお願いいたします。
    `.trim());

    window.location.href = `mailto:${selectedRecipient.email}?subject=${subject}&body=${body}`;
  };

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">データを読み込んでいます...</div>;
  if (!caseData) return <div className="text-center py-20 text-gray-500">案件データがありません。</div>;

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex flex-col items-center font-sans pb-24 relative text-slate-800">
      <div className="w-[92%] max-w-md mt-6 mb-6 flex items-center justify-between">
         <Link href={`/cases/${params.id}`} className="p-2 bg-white rounded-full shadow-sm active:scale-90">
            <ArrowLeft size={20} />
         </Link>
         <h1 className="text-xl font-black text-gray-900 tracking-widest">{quoteId ? "見積書詳細" : "見積書作成"}</h1>
         <div className="w-[36px]" />
      </div>

      <div className="w-[92%] max-w-md bg-white rounded-[20px] p-6 shadow-sm mb-6 flex flex-col gap-4">
        
        <div className="bg-gray-50 p-4 rounded-[14px] border border-gray-100">
          <p className="text-xs font-bold text-gray-400 mb-2">使用部品の選択</p>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto mb-3">
             {parts.map(p => (
                <div 
                    key={p.id} 
                    onClick={() => !quoteId && togglePartSelection(p.id)}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${selectedPartIds.has(p.id) ? 'bg-white border-[#eaaa43] shadow-sm' : 'bg-gray-50 border-transparent opacity-60'}`}
                >
                   <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${selectedPartIds.has(p.id) ? 'bg-[#eaaa43] border-[#eaaa43] text-white' : 'border-gray-300 bg-white'}`}>
                      {selectedPartIds.has(p.id) && <Check size={14} />}
                   </div>
                   <div className="flex-1">
                      <p className="text-[11px] font-black">{p.partName}</p>
                      <p className="text-[10px] text-gray-500">¥{Number(p.price).toLocaleString()} × {p.quantity}</p>
                   </div>
                </div>
             ))}
          </div>
          <div className="flex justify-between items-end pt-2 border-t border-gray-200">
            <p className="text-xs font-bold text-gray-500">{selectedPartIds.size} 点を選択中</p>
            <p className="text-lg font-black text-gray-900">¥{partsTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
          <p className="text-sm font-bold text-gray-700">出張費（固定）</p>
          <p className="text-lg font-black text-gray-900">¥{TRAVEL_FEE.toLocaleString()}</p>
        </div>

        <div className="flex justify-between items-center py-2">
          <p className="text-sm font-bold text-gray-700">技術料を選択</p>
          {isManualFee ? (
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={technicalFee} 
                onChange={e => {setTechnicalFee(Number(e.target.value)); setSaved(false);}}
                disabled={!!quoteId}
                className="w-24 border-2 border-[#eaaa43] rounded-lg p-2 bg-white text-right font-bold outline-none"
              />
              <button 
                onClick={() => setIsManualFee(false)}
                disabled={!!quoteId}
                className="text-[10px] text-blue-500 font-bold underline"
              >
                リストから選ぶ
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select 
                value={technicalFee} 
                onChange={e => {
                    const val = e.target.value;
                    if (val === "manual") {
                      setIsManualFee(true);
                    } else {
                      setTechnicalFee(Number(val));
                    }
                    setSaved(false);
                }}
                disabled={!!quoteId}
                className="border-2 border-gray-200 rounded-lg p-2 bg-white text-right font-bold focus:ring-[#eaaa43] focus:border-[#eaaa43] outline-none disabled:bg-gray-50"
              >
                {TECHNICAL_FEES.map(fee => (
                  <option key={fee} value={fee}>¥{fee.toLocaleString()}</option>
                ))}
                <option value="manual">その他 (自由入力)</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 bg-[#fffdf5] border-2 border-[#eaaa43] rounded-[16px] p-4 text-center">
          <p className="text-sm font-bold text-[#eaaa43] mb-1">見積合計金額(税込)</p>
          <p className="text-3xl font-black text-gray-900">¥{totalAmount.toLocaleString()}</p>
        </div>

        {!quoteId && (
            <button 
                onClick={handleSaveQuote}
                disabled={saving || saved}
                className={`mt-2 w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95 ${saved ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-[#eaaa43] text-white shadow-md'}`}
            >
                {saving ? <Loader2 size={18} className="animate-spin" /> : (saved ? <CheckCircle size={18} /> : <Save size={18} />)}
                {saved ? "スプレッドシート保存済み" : "見積もりを保存する"}
            </button>
        )}
      </div>

      <div className="w-[92%] max-w-md flex flex-col gap-4">
         <div className="bg-white p-5 rounded-[20px] shadow-sm flex flex-col gap-3">
            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2"><span className="bg-[#eaaa43] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span> PDFを保存</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">まずは見積書PDFを端末にダウンロードしてください。</p>
            <div className="w-full flex justify-center mt-2">
              <PDFDownloadLink document={<QuotePDF caseData={caseData} parts={filteredParts} technicalFee={technicalFee} travelFee={TRAVEL_FEE} total={totalAmount} />} fileName={`見積書_${caseData.clientName || "お客様"}.pdf`}>
                {({ loading }) => (
                  <button disabled={loading} className="bg-gray-900 text-white w-[250px] py-3 rounded-full font-bold shadow-md flex justify-center items-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} PDFダウンロード
                  </button>
                )}
              </PDFDownloadLink>
            </div>
         </div>

         <div className="flex justify-center -my-2 opacity-50 z-10">
            <ArrowRight size={24} className="text-gray-400 transform rotate-90" />
         </div>

         <div className="bg-white p-5 rounded-[20px] shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2"><span className="bg-[#eaaa43] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span> メーラーを起動</h3>
            
            <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500">送信先の選択</p>
              <select 
                value={selectedRecipient.name}
                onChange={(e) => {
                   const r = RECIPIENTS.find(req => req.name === e.target.value);
                   if (r) setSelectedRecipient(r);
                }}
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#eaaa43]"
              >
                {RECIPIENTS.map(r => (
                  <option key={r.name} value={r.name}>{r.name} ({r.email || "手入力"})</option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">宛先を選択してボタンを押すとメール作成画面が開きます。①で保存したPDFを添付して送信してください。</p>
            
            <button onClick={handleMailto} className="bg-[#eaaa43] text-white w-full py-4 rounded-[16px] font-bold shadow-md flex justify-center items-center gap-2 active:scale-95 transition-transform">
               <Mail size={20} /> メール作成画面を開く
            </button>
         </div>
      </div>
    </div>
  );
}
