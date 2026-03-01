"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyi3gbullz4u0EqXBkhMVxiqfZq0-PKdhim9QVrSyl1q4SvBaS46GX5lzsyZrAu5j8u2A/exec';

const assignees = ["佐藤", "田中", "南", "新田", "德重"];
const areas = ["市内南部エリア", "市街地エリア", "市内北部エリア", "日置エリア", "北薩エリア", "南薩エリア", "大隅エリア", "鹿屋エリア", "姶良エリア", "霧島エリア", "その他"];
const clients = ["リビング", "ハウス", "ひだまり", "タカギ", "トータルサービス", "LTS"];
const items = ["トイレ", "キッチン", "洗面", "浴室", "ドア", "窓サッシ", "水栓", "エクステリア", "照明換気設備", "内装設備", "外装設備"];
const requestContents = ["水漏れ", "作動不良", "開閉不良", "破損", "異音", "詰り関係", "その他"];
const workContents = ["部品交換", "製品交換、取付", "清掃", "点検", "見積", "応急処置", "その他"];
const proposalContents = ["サティス", "プレアス", "アメージュ", "パッソ", "KA", "KB", "水栓", "その他"];
const statuses = ["完了", "再訪予定", "部品手配", "見積", "保留"];

function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function ReportForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultWorker = searchParams.get('worker') || ""; 

  const [formData, setFormData] = useState({
    日付: getTodayString(),
    開始時間: '',
    終了時間: '',
    担当者: defaultWorker,
    訪問先: '',
    エリア: '',
    クライアント: '',
    品目: '',
    品番: '',
    依頼内容: '',
    作業内容: '',
    作業区分: '修理',
    技術料: '0',
    修理金額: '0',
    販売金額: '0',
    提案有無: '無',
    提案内容: '',
    提案内容詳細: '',
    遠隔高速利用: '無',
    伝票番号: '',
    状況: '完了',
    メモ: '',
    成約有無: '無'
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startTime = e.target.value;
    
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      let endHours = (hours + 1) % 24;
      let endMinutes = minutes;
      
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
      setFormData({ ...formData, 開始時間: startTime, 終了時間: endTime });
    } else {
      setFormData({ ...formData, 開始時間: startTime });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === '品目' && value !== 'トイレ') {
      setFormData({ ...formData, [name]: value, 品番: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleToggle = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSeiyakuToggle = (value: string) => {
    let newMemo = formData.メモ;
    
    if (value === '有') {
      if (!newMemo.includes('【成約】')) {
        newMemo = `【成約】\n${newMemo}`;
      }
    } else {
      newMemo = newMemo.replace('【成約】\n', '').replace('【成約】', '');
    }

    setFormData({ ...formData, 成約有無: value, メモ: newMemo });
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage("");

    const techFee = Number(formData.技術料) || 0;
    const repairAmt = formData.作業区分 === '修理' ? (Number(formData.修理金額) || 0) : 0;
    const salesAmt = formData.作業区分 === '販売' ? (Number(formData.販売金額) || 0) : 0;
    const finalProposal = formData.提案内容 === 'その他' ? formData.提案内容詳細 : formData.提案内容;

    const payload = {
      日付: formData.日付,
      開始時間: formData.開始時間,
      終了時間: formData.終了時間,
      担当者: formData.担当者,
      訪問先: formData.訪問先,
      エリア: formData.エリア,
      クライアント: formData.クライアント,
      品目: formData.品目,
      品番: formData.品目 === 'トイレ' ? formData.品番 : '',
      依頼内容: formData.依頼内容,
      作業内容: formData.作業内容,
      作業区分: formData.作業区分,
      技術料: techFee,
      修理金額: repairAmt,
      販売金額: salesAmt,
      提案有無: formData.提案有無,
      提案内容: finalProposal,
      遠隔高速利用: formData.遠隔高速利用,
      伝票番号: formData.伝票番号,
      状況: formData.状況,
      メモ: formData.メモ
    };

    try {
      const formBody = new URLSearchParams();
      formBody.append('data', JSON.stringify(payload));

      await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      setShowConfirm(false);
      setShowSuccessModal(true);
      
      setFormData({
        ...formData,
        開始時間: '',
        終了時間: '',
        訪問先: '',
        エリア: '',
        クライアント: '',
        品目: '',
        品番: '',
        依頼内容: '',
        作業内容: '',
        技術料: '0',
        修理金額: '0',
        販売金額: '0',
        提案有無: '無',
        提案内容: '',
        提案内容詳細: '',
        遠隔高速利用: '無',
        伝票番号: '',
        メモ: '',
        成約有無: '無'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setSubmitMessage(`通信エラー: ${errorMessage}`);
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueInput = () => {
    setShowSuccessModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inputBaseClass = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-[#eaaa43] focus:ring-1 focus:ring-[#eaaa43] transition-all appearance-none";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 ml-1";
  const selectWrapperClass = "relative after:content-['▼'] after:text-gray-400 after:text-[10px] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:pointer-events-none";

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-[92%] max-w-md mt-6 mb-6">
        <div className="bg-[#eaaa43] rounded-[14px] py-4 px-4 shadow-sm flex items-center justify-between">
          <Link href="/report" className="text-white font-bold flex items-center w-16 active:scale-90 transition-transform">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            <span className="text-sm tracking-wider">戻る</span>
          </Link>
          <h1 className="text-white font-bold tracking-widest text-lg flex-1 text-center">新規入力</h1>
          <div className="w-16 flex justify-end">
            <div className="bg-white/20 px-3 py-1 rounded-full border border-white/30 text-white text-xs font-bold shadow-inner whitespace-nowrap">
              {formData.担当者 || "未選択"}
            </div>
          </div>
        </div>
      </div>

      {submitMessage && (
        <div className={`w-[92%] max-w-md mb-4 p-4 rounded-xl text-center text-sm font-bold shadow-sm ${submitMessage.includes('エラー') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-[#eaaa43] border border-[#eaaa43]'}`}>
          {submitMessage}
        </div>
      )}

      <form onSubmit={handleOpenConfirm} className="w-[92%] max-w-md flex flex-col gap-5">
        
        {/* 01 基本情報 */}
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">基本情報</h2>
            <span className="text-gray-300 font-black text-xl leading-none">01</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>日付</label>
                <input type="date" name="日付" value={formData.日付} onChange={handleChange} required className={inputBaseClass} />
              </div>
              <div className={selectWrapperClass}>
                <label className={labelClass}>担当者</label>
                <select name="担当者" value={formData.担当者} onChange={handleChange} required className={inputBaseClass}>
                  <option value="">(選択)</option>
                  {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>開始時間</label>
                <input type="time" name="開始時間" value={formData.開始時間} onChange={handleStartTimeChange} required className={inputBaseClass} />
              </div>
              <div>
                <label className={labelClass}>終了時間</label>
                <input type="time" name="終了時間" value={formData.終了時間} onChange={handleChange} required className={inputBaseClass} />
              </div>
            </div>
          </div>
        </div>

        {/* 02 業務詳細 */}
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">業務詳細</h2>
            <span className="text-gray-300 font-black text-xl leading-none">02</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>訪問先名</label>
                <input type="text" name="訪問先" value={formData.訪問先} onChange={handleChange} placeholder="入力して下さい。" required className={inputBaseClass} />
              </div>
              <div className={selectWrapperClass}>
                <label className={labelClass}>クライアント</label>
                <select name="クライアント" value={formData.クライアント} onChange={handleChange} className={inputBaseClass}>
                  <option value="">(-----)</option>
                  {clients.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={selectWrapperClass}>
                <label className={labelClass}>エリア</label>
                <select name="エリア" value={formData.エリア} onChange={handleChange} required className={inputBaseClass}>
                  <option value="">(選択)</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className={selectWrapperClass}>
                <label className={labelClass}>品目</label>
                <select name="品目" value={formData.品目} onChange={handleChange} required className={inputBaseClass}>
                  <option value="">(選択)</option>
                  {items.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            
            {formData.品目 === 'トイレ' && (
              <div className="animate-fade-in bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                <label className={`${labelClass} text-orange-600`}>品番（※トイレ選択時）</label>
                <input type="text" name="品番" value={formData.品番} onChange={handleChange} placeholder="例: DT-1234" className={`${inputBaseClass} bg-white`} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className={selectWrapperClass}>
                <label className={labelClass}>依頼内容</label>
                <select name="依頼内容" value={formData.依頼内容} onChange={handleChange} required className={inputBaseClass}>
                  <option value="">(選択)</option>
                  {requestContents.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className={selectWrapperClass}>
                <label className={labelClass}>作業内容</label>
                <select name="作業内容" value={formData.作業内容} onChange={handleChange} required className={inputBaseClass}>
                  <option value="">(選択)</option>
                  {workContents.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 03 金額 */}
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">金額</h2>
            <span className="text-gray-300 font-black text-xl leading-none">03</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>作業区分</label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button type="button" onClick={() => handleToggle('作業区分', '修理')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.作業区分 === '修理' ? 'bg-white text-[#547b97] shadow-sm' : 'text-gray-400'}`}>修理</button>
                <button type="button" onClick={() => handleToggle('作業区分', '販売')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.作業区分 === '販売' ? 'bg-white text-[#d98c77] shadow-sm' : 'text-gray-400'}`}>販売</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>技術料</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                  <input type="number" name="技術料" value={formData.技術料} onChange={handleChange} required className={`${inputBaseClass} pl-8`} />
                </div>
              </div>
              {formData.作業区分 === '修理' ? (
                <div>
                  <label className={`${labelClass} text-[#547b97]`}>修理金額</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#547b97] font-bold">¥</span>
                    <input type="number" name="修理金額" value={formData.修理金額} onChange={handleChange} required className={`${inputBaseClass} pl-8 border-[#547b97]/30 text-[#547b97] bg-[#547b97]/5`} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={`${labelClass} text-[#d98c77]`}>販売金額</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d98c77] font-bold">¥</span>
                    <input type="number" name="販売金額" value={formData.販売金額} onChange={handleChange} required className={`${inputBaseClass} pl-8 border-[#d98c77]/30 text-[#d98c77] bg-[#d98c77]/5`} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 04 提案 */}
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">提案</h2>
            <span className="text-gray-300 font-black text-xl leading-none">04</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>提案有無</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button type="button" onClick={() => { handleToggle('提案有無', '無'); setFormData(p => ({...p, 提案内容: '', 提案内容詳細: ''})) }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.提案有無 === '無' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>無</button>
                  <button type="button" onClick={() => handleToggle('提案有無', '有')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.提案有無 === '有' ? 'bg-white text-[#eaaa43] shadow-sm' : 'text-gray-400'}`}>有</button>
                </div>
              </div>
              {formData.提案有無 === '有' && (
                <div className={selectWrapperClass}>
                  <label className={labelClass}>提案内容</label>
                  <select name="提案内容" value={formData.提案内容} onChange={handleChange} required className={inputBaseClass}>
                    <option value="">選択してください</option>
                    {proposalContents.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>
            {formData.提案有無 === '有' && formData.提案内容 === 'その他' && (
              <div>
                <label className={labelClass}>提案内容（詳細）</label>
                <input type="text" name="提案内容詳細" value={formData.提案内容詳細} onChange={handleChange} placeholder="具体的な提案内容を入力" required className={inputBaseClass} />
              </div>
            )}
          </div>
        </div>

        {/* 05 ステータス */}
        <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6">
          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-[1.1rem] font-bold text-[#eaaa43] tracking-wider">ステータス</h2>
            <span className="text-gray-300 font-black text-xl leading-none">05</span>
          </div>
          <div className="space-y-4">
            
            <div className="grid grid-cols-2 gap-3">
              <div className={selectWrapperClass}>
                <label className={labelClass}>状況</label>
                <select name="状況" value={formData.状況} onChange={handleChange} required className={inputBaseClass}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>成約有無</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button type="button" onClick={() => handleSeiyakuToggle('無')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.成約有無 === '無' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>無</button>
                  <button type="button" onClick={() => handleSeiyakuToggle('有')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.成約有無 === '有' ? 'bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400 text-white shadow-sm' : 'text-gray-400'}`}>有</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>遠隔・高速利用</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button type="button" onClick={() => { handleToggle('遠隔高速利用', '無'); setFormData(p => ({...p, 伝票番号: ''})) }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.遠隔高速利用 === '無' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>無</button>
                  <button type="button" onClick={() => handleToggle('遠隔高速利用', '有')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.遠隔高速利用 === '有' ? 'bg-[#6495ED] text-white shadow-sm' : 'text-gray-400'}`}>有</button>
                </div>
              </div>
              {formData.遠隔高速利用 === '有' && (
                <div className="animate-fade-in">
                  <label className={labelClass}>伝票番号</label>
                  <input type="text" name="伝票番号" value={formData.伝票番号} onChange={handleChange} placeholder="例: 12345" required className={inputBaseClass} />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5 ml-1">
                <label className="text-xs font-bold text-gray-600 block">メモ</label>
                {formData.成約有無 === '有' && (
                  <span className="text-[10px] font-bold text-red-500 animate-pulse">※成約した製品名を入力してください</span>
                )}
              </div>
              <textarea 
                name="メモ" 
                value={formData.メモ} 
                onChange={handleChange} 
                rows={4} 
                className={`${inputBaseClass} resize-none ${formData.成約有無 === '有' ? 'border-pink-200 bg-pink-50/30' : ''}`} 
                placeholder={formData.成約有無 === '有' ? "例：【成約】DT-1234 を販売しました。" : "特記事項があれば入力してください"}
              ></textarea>
            </div>
          </div>
        </div>

        {/* 提出ボタン */}
        <button type="submit" className="w-full bg-[#eaaa43] text-white rounded-[14px] py-4 shadow-sm active:scale-95 transition-transform font-black text-base mt-2 tracking-widest">
          内容確認する
        </button>
      </form>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8f6f0] rounded-[20px] w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl flex flex-col">
            <div className="sticky top-0 bg-[#eaaa43] text-white py-4 text-center font-bold tracking-widest z-10">
              入力内容の確認
            </div>
            <div className="p-6 space-y-4 text-sm font-medium">
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">日付/時間</span>
                <span className="col-span-2 text-right">{formData.日付} ({formData.開始時間}〜{formData.終了時間})</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">担当者</span>
                <span className="col-span-2 text-right">{formData.担当者}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">訪問先</span>
                <span className="col-span-2 text-right">{formData.訪問先}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">エリア</span>
                <span className="col-span-2 text-right">{formData.エリア}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">クライアント</span>
                <span className="col-span-2 text-right">{formData.クライアント || 'デフォルト'}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">作業概要</span>
                <span className="col-span-2 text-right">
                  {formData.品目} {formData.品目 === 'トイレ' && formData.品番 ? `(品番: ${formData.品番})` : ''} / {formData.依頼内容} / {formData.作業内容}
                </span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">金額 ({formData.作業区分})</span>
                <span className="col-span-2 text-right">
                  技術: ¥{formData.技術料} <br/>
                  {formData.作業区分 === '修理' ? `修理: ¥${formData.修理金額}` : `販売: ¥${formData.販売金額}`}
                </span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">提案</span>
                <span className="col-span-2 text-right">{formData.提案有無} {formData.提案内容 && `(${formData.提案内容 === 'その他' ? formData.提案内容詳細 : formData.提案内容})`}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">ステータス等</span>
                <span className="col-span-2 text-right">
                  {formData.状況} <br/>
                  {formData.成約有無 === '有' && <span className="text-[10px] text-white bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400 px-1.5 py-0.5 rounded mr-1">成約</span>}
                  {formData.遠隔高速利用 === '有' && <span className="text-[10px] text-white bg-[#6495ED] px-1.5 py-0.5 rounded mr-1">遠隔</span>}
                  {formData.遠隔高速利用 === '有' && `(伝: ${formData.伝票番号})`}
                </span>
              </div>
              {formData.メモ && (
                <div className="pt-2">
                  <span className="text-gray-500 text-xs block mb-1">メモ</span>
                  <p className="bg-white p-3 rounded-lg border border-gray-200 text-xs whitespace-pre-wrap">{formData.メモ}</p>
                </div>
              )}
            </div>
            <div className="p-6 pt-2 flex gap-3 sticky bottom-0 bg-[#f8f6f0]">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold active:scale-95 transition-transform">
                修正する
              </button>
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-[#eaaa43] text-white py-3 rounded-xl font-bold tracking-widest active:scale-95 transition-transform disabled:bg-gray-400">
                {isSubmitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 送信完了後の成功ポップアップ（モーダル） */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-8 flex flex-col items-center text-center shadow-2xl transform transition-all scale-100">
            
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-gray-800 mb-2 tracking-wider">送信完了！</h3>
            <p className="text-sm text-gray-500 font-medium mb-8">
              日報データが正常に保存されました。<br/>続けて次の案件を入力しますか？
            </p>

            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={handleContinueInput} 
                className="w-full bg-[#eaaa43] text-white py-3.5 rounded-xl font-bold tracking-widest active:scale-95 transition-transform shadow-md"
              >
                続けて入力する
              </button>
              
              <button 
                onClick={() => router.push(`/report/list?worker=${encodeURIComponent(formData.担当者)}`)} 
                className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold tracking-widest active:scale-95 transition-transform"
              >
                当日一覧（A-2）を確認
              </button>
              
              <button 
                onClick={() => router.push('/report')} 
                className="w-full bg-white border border-gray-200 text-gray-400 py-3 rounded-xl font-bold text-sm mt-2 active:scale-95 transition-transform"
              >
                メニューへ戻る
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}

export default function NewReportPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f0] font-sans text-slate-800 pb-32">
      <Suspense fallback={<div className="flex justify-center items-center h-screen text-gray-500 font-bold">画面を読み込んでいます...</div>}>
        <ReportForm />
      </Suspense>

      {/* 画面下のタブバー */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white rounded-t-[30px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] h-[70px] flex justify-around items-center px-4 max-w-md mx-auto pb-2 z-40">
        <Link href="/report" className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Link>
        <div className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <div className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eaaa43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#eaaa43] rounded-full border-2 border-white"></span>
        </div>
        <div className="p-2 cursor-pointer relative">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </div>
    </div>
  );
}
