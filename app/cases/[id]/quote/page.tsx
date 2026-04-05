"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Mail, Loader2, ArrowRight, Save, CheckCircle, Check, FileText, Send, Wrench, Trash2, Plus } from "lucide-react";
import dynamic from 'next/dynamic';
import QuotePDF from "../../../../components/QuotePDF";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <div className="text-gray-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> PDFエンジン準備中...</div> }
);

const TECHNICAL_FEES = [3200, 4300, 4850, 5400, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];
const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30];

const RECIPIENTS = [
  { name: "中窪", email: process.env.NEXT_PUBLIC_QUOTE_RECIPIENT_A_EMAIL || "shinta.nakakubo@lixil.com" },
  { name: "本野", email: process.env.NEXT_PUBLIC_QUOTE_RECIPIENT_B_EMAIL || "yukiko.motono@lixil.com" },
  { name: "タケヨシ", email: process.env.NEXT_PUBLIC_QUOTE_RECIPIENT_C_EMAIL || "takeyoshi2008@hotmail.com" }
];

export default function QuotePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(quoteId ? false : true);
  const [storedTotal, setStoredTotal] = useState<number | null>(null);
  const [caseData, setCaseData] = useState<any>(null);
  
  // モードと担当者
  const [mode, setMode] = useState<"FAX" | "EMAIL">("FAX");
  const [recipientIndex, setRecipientIndex] = useState(0);
  const [customerEmail, setCustomerEmail] = useState("");
  
  // 各種費用
  const [travelFee, setTravelFee] = useState(4000);
  const [technicalFee, setTechnicalFee] = useState(3200);
  const [disposalFee, setDisposalFee] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [isManualFee, setIsManualFee] = useState(false);
  
  // 見積書用オーバーライド情報
  const [quoteRecipientName, setQuoteRecipientName] = useState("");
  const [quoteSiteName, setQuoteSiteName] = useState("");
  const [quoteProjectName, setQuoteProjectName] = useState("");
  const [quoteProjectExt, setQuoteProjectExt] = useState("");
  
  const [parts, setParts] = useState<any[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [quotePartsSnapshot, setQuotePartsSnapshot] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/gas-new?action=getCase&caseId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.case;
        setCaseData(c);
        
        // 初期値の設定
        setQuoteRecipientName(c.clientName || "");
        setQuoteSiteName(c.visitAddress || "");
        setQuoteProjectName(c.targetProduct || "");
        
        if (c.requestDetails) {
          setQuoteProjectExt(c.requestDetails.split(/[。\n]/)[0].substring(0, 50));
        }
        
        const fetchedParts = data.parts || [];
        setParts(fetchedParts);
        
        if (quoteId && data.quotes) {
          const existingQuote = data.quotes.find((q: any) => q.id === quoteId);
          if (existingQuote) {
            setTechnicalFee(Number(existingQuote.technicalFee));
            setTravelFee(Number(existingQuote.travelFee || 4000));
            setDisposalFee(Number(existingQuote.disposalFee || 0));
            setDiscountRate(Number(existingQuote.discountRate || 0));
            setMode(existingQuote.mode || "FAX");
            
            if (existingQuote.recipient) setQuoteRecipientName(existingQuote.recipient);
            if (existingQuote.site) setQuoteSiteName(existingQuote.site);
            if (existingQuote.project) {
                 const projectText = existingQuote.project.toString();
                 const partsArr = projectText.split(" ");
                 setQuoteProjectName(partsArr[0] || "");
                 setQuoteProjectExt(partsArr.slice(1).join(" ") || "");
            }
            
            if (existingQuote.selectedPartIds) {
              setSelectedPartIds(new Set(existingQuote.selectedPartIds.split(',').filter(Boolean)));
            } else {
              setSelectedPartIds(new Set(fetchedParts.map((p: any) => p.id)));
            }
            
            // スナップショットの復元（重要）
            if (existingQuote.partsSnapshot) {
              try {
                const snapshot = JSON.parse(existingQuote.partsSnapshot);
                setQuotePartsSnapshot(snapshot);
              } catch(e) {
                console.error("Snapshot parse error", e);
              }
            }
            
            setSaved(true);
            setIsEditing(false); // 既存の場合は編集モードオフ
            setStoredTotal(Number(existingQuote.totalAmount));

            // スナップショットの復元（pdfUrlをバックアップ用に使用）
            const snapshotData = existingQuote.partsSnapshot || existingQuote.pdfUrl;
            if (snapshotData && snapshotData.startsWith("[")) {
              try {
                const snapshot = JSON.parse(snapshotData);
                setQuotePartsSnapshot(snapshot);
              } catch(e) {
                console.error("Snapshot parse error", e);
              }
            }
            
            if (!TECHNICAL_FEES.includes(Number(existingQuote.technicalFee))) {
              setIsManualFee(true);
            }
          }
        } else {
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

  const handlePartEdit = (id: string, field: string, value: any) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaved(false);
  };

  const addPart = () => {
    const newPart = {
      id: uuidv4(),
      partName: "",
      partCode: "",
      price: 0,
      quantity: 1,
      caseId: params.id
    };
    setParts([...parts, newPart]);
    setSelectedPartIds(new Set([...Array.from(selectedPartIds), newPart.id]));
    setSaved(false);
  };

  const deletePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
    const newSelected = new Set(selectedPartIds);
    newSelected.delete(id);
    setSelectedPartIds(newSelected);
    setSaved(false);
  };

  // 表示用部品リストの選定（編集モードなら最新、読み取り専用ならスナップショット優先）
  const displayParts = (isEditing || quotePartsSnapshot.length === 0) 
    ? parts.filter(p => selectedPartIds.has(p.id))
    : quotePartsSnapshot;

  const partsTotalRaw = displayParts.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0);
  const partsDiscountAmount = Math.round(partsTotalRaw * (discountRate / 100));
  const partsTotalDiscounted = partsTotalRaw - partsDiscountAmount;
  const totalAmount = partsTotalDiscounted + travelFee + technicalFee + disposalFee;

  const handleSaveQuote = async () => {
    setSaving(true);
    try {
      await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveParts", payload: parts })
      });

      const payload = {
        id: quoteId || uuidv4(),
        caseId: params.id,
        createdAt: format(new Date(), "yyyy-MM-dd HH:mm"),
        recipient: quoteRecipientName,
        site: quoteSiteName,
        project: quoteProjectName + (quoteProjectExt ? " " + quoteProjectExt : ""),
        selectedPartIds: Array.from(selectedPartIds).join(","),
        travelFee,
        technicalFee,
        disposalFee,
        discountRate,
        partsTotal: partsTotalDiscounted,
        totalAmount,
        mode,
        partsSnapshot: JSON.stringify(displayParts), 
        pdfUrl: JSON.stringify(displayParts) // 万が一新規カラムが反映されない場合の予備
      };

      const res = await fetch("/api/gas-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveQuote", payload })
      });

      if (!res.ok) throw new Error("見積保存に失敗しました");
      setSaved(true);
      setIsEditing(false);
      alert("見積情報を保存しました。");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMailto = () => {
    const recipient = RECIPIENTS[recipientIndex];
    const subject = encodeURIComponent(`【御見積】${quoteProjectName}の修理・送付依頼`);
    const sendMethodStr = mode === "FAX" ? `FAX送信 (${caseData?.clientFax || "---"})` : "メール送信";
    const partsDetailText = displayParts.map((p, i) => `${i + 1}. 品番: ${p.partCode}\n　品名: ${p.partName}\n　金額: ¥${Number(p.price).toLocaleString()}\n　数量: ${p.quantity}`).join("\n");
    const bodyText = `${recipient.name} さんお疲れ様です。\n\n${mode === "FAX" ? "見積り作成送付をFAXにてお願い致します。" : `見積り作成送付を、以下のメールアドレス宛てにPDFで送信をお願いします。\n【送信先】${customerEmail}`}\n\n受付No: ${caseData?.receiptNo || "未発行"}\n訪問先名: ${caseData?.clientName || "お客様"}\n見積り宛名: ${quoteRecipientName}\n担当: ${caseData?.clientContactName || "---"}\n現場名: ${quoteSiteName}\n工事名: ${quoteProjectName} ${quoteProjectExt}\n送付方法: ${sendMethodStr}\n\n【金額内訳】\n出張費: ¥${travelFee.toLocaleString()}\n技術料: ¥${technicalFee.toLocaleString()}\n${disposalFee > 0 ? `処分料: ¥${disposalFee.toLocaleString()}\n` : ""}部品代: ¥${partsTotalDiscounted.toLocaleString()} (値引き${discountRate}%適用後)\n小計: ¥${totalAmount.toLocaleString()}\n合計: ¥${totalAmount.toLocaleString()}（税込）\n\n【部品詳細】\n${partsDetailText}`.trim();
    window.location.href = `mailto:${recipient.email}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse font-medium">データの読み取り中...</div>;
  if (!caseData) return <div className="text-center py-20 text-gray-500 font-medium">案件データが見つかりません。</div>;

  // --- UI Components ---

  const Header = (
    <div className="w-[92%] max-w-md mt-6 mb-6 flex items-center justify-between px-1">
       <Link href={`/cases/${params.id}`} className="p-2.5 bg-white rounded-xl shadow-sm active:scale-90 border border-gray-100">
          <ArrowLeft size={18} className="text-gray-400" />
       </Link>
       <div className="text-center">
          <h1 className="text-[17px] font-black text-gray-900 tracking-tight">{quoteId ? "見積書詳細" : "見積書作成"}</h1>
          <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest leading-none mt-0.5">Professional Management</p>
       </div>
       <div className="w-[42px]" />
    </div>
  );

  const ModeSwitcher = (
    <div className="w-full bg-gray-100/50 p-1.5 rounded-[22px] flex gap-1 mb-6 border border-gray-100">
      <button onClick={() => setMode("FAX")} className={`flex-1 py-3.5 rounded-[18px] font-black text-[11px] transition-all flex items-center justify-center gap-2 ${mode === "FAX" ? "bg-white text-gray-900 shadow-md" : "text-gray-400"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${mode === "FAX" ? "bg-orange-400" : "bg-gray-300"}`} />
        FAX 依頼モード
      </button>
      <button onClick={() => setMode("EMAIL")} className={`flex-1 py-3.5 rounded-[18px] font-black text-[11px] transition-all flex items-center justify-center gap-2 ${mode === "EMAIL" ? "bg-white text-gray-900 shadow-md" : "text-gray-400"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${mode === "EMAIL" ? "bg-blue-400" : "bg-gray-300"}`} />
        メール 送付モード
      </button>
    </div>
  );

  const BasicInfo = (
    <div className="bg-white rounded-[28px] p-7 shadow-sm border border-gray-50 flex flex-col gap-6 w-full">
       <div className="flex items-center gap-2.5">
         <div className="p-2 bg-orange-50 rounded-xl text-[#eaaa43]"><FileText size={16} /></div>
         <h3 className="font-black text-sm text-gray-900 tracking-tight">見積基本情報の編集</h3>
       </div>
       <div className="flex flex-col gap-5">
         <div className="space-y-1.5">
           <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest leading-none">宛名</label>
           <input value={quoteRecipientName} onChange={e => {setQuoteRecipientName(e.target.value); setSaved(false);}} className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 text-xs font-bold outline-none focus:border-orange-100 focus:bg-white transition-all shadow-inner" />
         </div>
         <div className="space-y-1.5">
           <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest leading-none">現場名</label>
           <input value={quoteSiteName} onChange={e => {setQuoteSiteName(e.target.value); setSaved(false);}} className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 text-xs font-bold outline-none focus:border-orange-100 focus:bg-white transition-all shadow-inner" />
         </div>
         <div className="space-y-1.5">
           <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest leading-none">工事名 商品名</label>
           <input value={quoteProjectName} onChange={e => {setQuoteProjectName(e.target.value); setSaved(false);}} className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 text-xs font-bold outline-none focus:border-orange-100 focus:bg-white transition-all shadow-inner" />
           <textarea value={quoteProjectExt} onChange={e => {setQuoteProjectExt(e.target.value); setSaved(false);}} className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 text-xs font-medium outline-none focus:border-orange-100 focus:bg-white transition-all shadow-inner h-20 resize-none" placeholder="修理内容などの補足" />
         </div>
       </div>
    </div>
  );

  const PartsEditor = (
    <div className="bg-white rounded-[28px] p-7 shadow-sm border border-gray-50 w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><Wrench size={16} /></div>
          <h3 className="font-black text-sm text-gray-900 tracking-tight">部品リストの編集</h3>
        </div>
        <span className="text-[9px] font-black bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">{parts.length} Rows</span>
      </div>
      <div className="flex flex-col gap-4 mb-6">
         {parts.map(p => (
            <div key={p.id} className={`flex flex-col gap-4 p-5 rounded-[24px] border-2 transition-all group ${selectedPartIds.has(p.id) ? 'bg-orange-50/10 border-orange-100/50' : 'bg-gray-50/40 border-transparent opacity-80'}`}>
               <div className="flex items-center gap-3">
                 <button onClick={() => togglePartSelection(p.id)} className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${selectedPartIds.has(p.id) ? 'bg-[#eaaa43] border-[#eaaa43] text-white' : 'border-gray-200 bg-white'}`}>
                   {selectedPartIds.has(p.id) && <Check size={14} strokeWidth={4} />}
                 </button>
                 <input value={p.partName} onChange={e => handlePartEdit(p.id, "partName", e.target.value)} className="flex-1 bg-transparent border-none text-[13px] font-black outline-none" placeholder="部品名" />
                 <button onClick={() => deletePart(p.id)} className="p-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
               </div>
               <div className="flex items-center gap-3 pl-9">
                 <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase">Code</label>
                    <input value={p.partCode} onChange={e => handlePartEdit(p.id, "partCode", e.target.value)} className="w-full bg-white/60 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" placeholder="型番" />
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-14 flex flex-col gap-1">
                      <label className="text-[8px] font-black text-gray-400 text-center">Qty</label>
                      <input type="number" value={p.quantity} onChange={e => handlePartEdit(p.id, "quantity", Number(e.target.value))} className="w-full bg-white border border-gray-100 rounded-xl py-1.5 text-center text-xs font-black shadow-inner" />
                    </div>
                    <div className="w-24 flex flex-col gap-1">
                      <label className="text-[8px] font-black text-gray-400 text-right mr-1">Price</label>
                      <div className="bg-white border-2 border-orange-100/50 rounded-xl px-3 py-1.5 text-[12px] font-black flex items-center gap-1 shadow-sm">
                        <span className="text-[10px] text-gray-300">¥</span>
                        <input type="number" value={p.price} onChange={e => handlePartEdit(p.id, "price", Number(e.target.value))} className="w-full bg-transparent border-none p-0 outline-none text-right" />
                      </div>
                    </div>
                 </div>
               </div>
            </div>
         ))}
      </div>
      <button onClick={addPart} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-[20px] text-gray-400 font-black text-[10px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-all uppercase tracking-widest"><Plus size={14} /> Add Row / 行を追加</button>
      <div className="flex justify-between items-end pt-5 mt-6 border-t border-gray-100">
        <div>
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Subtotal / 部品代小計</p>
           {discountRate > 0 && <div className="flex items-center gap-2"><span className="text-[10px] font-black text-white bg-red-400 px-1.5 py-0.5 rounded-md">-{discountRate}%</span><span className="text-[11px] text-gray-300 line-through">¥{partsTotalRaw.toLocaleString()}</span></div>}
        </div>
        <p className="text-2xl font-black text-gray-900 tracking-tighter">¥{partsTotalDiscounted.toLocaleString()}</p>
      </div>
    </div>
  );

  const FeesDetail = (
    <div className="bg-white rounded-[28px] p-7 shadow-sm border border-gray-50 flex flex-col gap-6 w-full">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500"><CheckCircle size={16} /></div>
        <h3 className="font-black text-sm text-gray-900">費用・値引き</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 mb-2 uppercase">出張費</p>
          <div className="flex items-center justify-between"><span className="text-sm font-black text-gray-300">¥</span><input type="number" value={travelFee} onChange={e => {setTravelFee(Number(e.target.value)); setSaved(false);}} className="w-full bg-transparent border-none text-right text-[17px] font-black outline-none" /></div>
        </div>
        <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 mb-2 uppercase">処分料</p>
          <div className="flex items-center justify-between"><span className="text-sm font-black text-gray-300">¥</span><input type="number" value={disposalFee} onChange={e => {setDisposalFee(Number(e.target.value)); setSaved(false);}} className="w-full bg-transparent border-none text-right text-[17px] font-black outline-none" /></div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
         <div className="flex justify-between items-center px-1">
            <p className="text-[11px] font-black text-gray-500 uppercase">基本技術料</p>
            <button onClick={() => setIsManualFee(!isManualFee)} className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-all ${isManualFee ? "bg-blue-500 text-white" : "bg-white text-blue-500 border-blue-100"}`}>{isManualFee ? "リストに戻す" : "直接入力"}</button>
         </div>
         {isManualFee ? (
            <div className="bg-white p-5 rounded-[24px] border-2 border-orange-100 flex items-center gap-2"><span className="text-xl font-black text-gray-300">¥</span><input type="number" value={technicalFee} onChange={e => {setTechnicalFee(Number(e.target.value)); setSaved(false);}} className="flex-1 bg-transparent border-none text-right text-xl font-black outline-none" placeholder="0" /></div>
         ) : (
            <select value={technicalFee} onChange={e => {setTechnicalFee(Number(e.target.value)); setSaved(false);}} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[20px] p-5 text-sm font-black appearance-none outline-none focus:border-orange-200 shadow-inner">
               {TECHNICAL_FEES.map(fee => <option key={fee} value={fee}>¥{fee.toLocaleString()}</option>)}
            </select>
         )}
      </div>
      <div className="flex flex-col gap-3">
         <p className="text-[11px] font-black text-gray-500 uppercase px-1">値引き率 (品番のみ)</p>
         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {DISCOUNT_OPTIONS.map(rate => <button key={rate} onClick={() => {setDiscountRate(rate); setSaved(false);}} className={`min-w-[64px] py-4 rounded-[20px] text-xs font-black border-2 transition-all ${discountRate === rate ? 'bg-red-500 border-red-500 text-white shadow-xl shadow-red-100' : 'bg-gray-50 border-transparent text-gray-400'}`}>{rate === 0 ? "なし" : `${rate}%`}</button>)}
         </div>
      </div>
    </div>
  );

  const GrandTotal = (
    <div className="bg-white rounded-[44px] p-10 pt-12 pb-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden w-full group">
      <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-amber-500 opacity-80" />
      <p className="text-[10px] font-black text-slate-400 mb-5 uppercase tracking-[0.4em] relative z-10">Quote Grand Total</p>
      <div className="flex items-center justify-center gap-1.5 mb-2 relative z-10 transition-transform group-hover:scale-105 duration-500">
        <span className="text-[26px] font-black text-orange-500 mt-[-16px]">¥</span>
        <p className="text-[64px] font-black text-slate-900 leading-none tracking-tighter">
          {(!isEditing && storedTotal !== null) ? storedTotal.toLocaleString() : totalAmount.toLocaleString()}
        </p>
      </div>
      <p className="text-[9px] font-black text-slate-300 mt-4 uppercase tracking-widest">(税込 / Tax Included)</p>
      <button onClick={handleSaveQuote} disabled={saving || saved} className={`mt-10 w-full py-5.5 rounded-[26px] font-black text-sm flex justify-center items-center gap-3.5 transition-all shadow-xl ${saved ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-[#eaaa43] text-white hover:brightness-110 active:scale-95'}`}>
          {saving ? <Loader2 size={24} className="animate-spin" /> : (saved ? <CheckCircle size={24} /> : <Save size={24} />)}
          {saved ? "SAVED" : "見積保存 (スプレッドシート)"}
      </button>
    </div>
  );

  const ActionSection = (
    <div className="bg-slate-50/70 rounded-[36px] p-8 pb-10 border border-slate-100 flex flex-col gap-9 w-full">
       <div className="flex flex-col gap-7">
         <div className="flex items-center gap-3.5">
           <div className="p-3 bg-white rounded-2xl text-purple-500 shadow-sm border border-slate-100"><Send size={18} /></div>
           <h3 className="font-black text-sm text-slate-800 tracking-tight">送付・PDF出力</h3>
         </div>
         {mode === "EMAIL" && (
            <div className="px-1">
               <p className="text-[10px] font-black text-slate-400 mb-2.5 ml-1.5 uppercase tracking-widest leading-none">Customer Email</p>
               <div className="relative">
                  <Mail size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full bg-white border border-slate-100 rounded-[22px] py-5 pl-15 pr-6 text-sm font-black outline-none focus:ring-4 focus:ring-orange-50 transition-all shadow-sm" placeholder="customer@example.com" />
               </div>
            </div>
         )}
         <div className="flex flex-col gap-4">
           <p className="text-[11px] font-black text-slate-400 uppercase ml-2">社内担当者を選択</p>
           <div className="flex gap-2.5">
             {RECIPIENTS.map((r, idx) => (
                <button key={idx} onClick={() => setRecipientIndex(idx)} className={`flex-1 py-5 rounded-[22px] font-black text-[12px] border-2 transition-all ${recipientIndex === idx ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border-slate-50'}`}>{r.name}</button>
             ))}
           </div>
         </div>
       </div>
       <div className="flex flex-col gap-4 pt-8 border-t border-slate-200/60">
         <div className="flex flex-col sm:flex-row gap-4">
            <PDFDownloadLink document={<QuotePDF caseData={caseData} parts={displayParts} technicalFee={technicalFee} travelFee={travelFee} total={totalAmount} disposalFee={disposalFee} discountRate={discountRate} quoteInfo={{ recipient: quoteRecipientName, site: quoteSiteName, project: quoteProjectName + (quoteProjectExt ? " " + quoteProjectExt : "") }} />} fileName={`見積書_${quoteRecipientName}.pdf`} className="flex-1">
              {({ loading }) => (
                <button disabled={loading} className="w-full bg-white border-2 border-slate-900 text-slate-900 py-5 rounded-[26px] font-black text-xs flex justify-center items-center gap-2.5 hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} PDF保存
                </button>
              )}
            </PDFDownloadLink>
            <button onClick={handleMailto} className="flex-[2.2] bg-[#eaaa43] text-white py-5 rounded-[26px] font-black text-[17px] shadow-2xl shadow-orange-100 flex justify-center items-center gap-3 active:scale-95 transition-all hover:brightness-105"><Mail size={24} /> メール作成</button>
         </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fbfcff] flex flex-col items-center font-sans pb-32 relative text-slate-800">
      {Header}
      <div className="w-[92%] max-w-md flex flex-col gap-6">
        
        {quoteId ? (
          /* --- Existing Quote View --- */
          <>
            <div className="animate-in fade-in slide-in-from-top-6 duration-700">{GrandTotal}</div>
            <div className="animate-in fade-in slide-in-from-top-8 duration-1000">{ActionSection}</div>
            
            {!isEditing ? (
              <div className="mt-8 animate-in fade-in zoom-in-95 duration-500">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-5 rounded-[26px] bg-white border-2 border-slate-100 text-slate-400 font-black text-sm flex justify-center items-center gap-3 transition-all hover:border-orange-200 hover:text-orange-400 active:scale-95 shadow-sm"
                >
                  <Wrench size={18} /> 見積内容を編集する
                </button>
                <p className="text-center text-[9px] font-bold text-slate-200 uppercase tracking-widest mt-3">Click to open editor / 編集が必要な場合はこちら</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 mt-8 animate-in slide-in-from-bottom-10 duration-700">
                <div className="px-2 flex items-center gap-3 opacity-30">
                  <div className="h-[1px] flex-1 bg-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Editor Mode</p>
                  <div className="h-[1px] flex-1 bg-slate-300" />
                </div>
                {ModeSwitcher}
                {BasicInfo}
                {PartsEditor}
                {FeesDetail}
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-full py-4 rounded-[20px] bg-slate-50 text-slate-400 font-bold text-xs mt-2"
                >
                  編集を閉じる
                </button>
              </div>
            )}
          </>
        ) : (
          /* --- New Quote View --- */
          <>
            {ModeSwitcher}
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">{BasicInfo}</div>
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">{PartsEditor}</div>
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">{FeesDetail}</div>
            <div className="my-6">{GrandTotal}</div>
            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300">{ActionSection}</div>
          </>
        )}
      </div>
    </div>
  );
}
