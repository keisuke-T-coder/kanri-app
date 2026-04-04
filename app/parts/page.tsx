'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, PackageOpen, AlertTriangle, AlertCircle, CheckCircle, ChevronDown, PackagePlus, ArrowLeft, Loader2, Home, Settings, Wrench, X, Calculator, Save } from 'lucide-react';
import { Part, Staff } from '../../types/schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PartsPage() {
  const router = useRouter();
  
  // Data State
  const [parts, setParts] = useState<Part[]>([]);
  const [masters, setMasters] = useState({ makers: [], staff: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [activeMaker, setActiveMaker] = useState('すべて');
  
  // Restock Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restockData, setRestockData] = useState({
    quantity: 1,
    staff_id: '',
    notes: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [partsRes, mastersRes] = await Promise.all([
        fetch('/api/gas?type=parts'),
        fetch('/api/gas?type=masters')
      ]);
      const pData = await partsRes.json();
      const mData = await mastersRes.json();

      if (Array.isArray(pData)) setParts(pData.filter(p => !!p.部品ID));
      if (mData.staff || mData.makers) {
        setMasters({ staff: mData.staff || [], makers: mData.makers || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const makersList = useMemo(() => {
    const list = new Set(parts.map(p => p.メーカーID).filter(m => m));
    return ['すべて', ...Array.from(list)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      const matchMaker = activeMaker === 'すべて' || p.メーカーID === activeMaker;
      const searchLower = search.toLowerCase();
      const matchSearch = (p.品名 || '').toLowerCase().includes(searchLower) || 
                          (p.品番 || '').toLowerCase().includes(searchLower);
      return matchMaker && matchSearch;
    });
  }, [parts, activeMaker, search]);

  const openRestockModal = (part: Part) => {
    setSelectedPart(part);
    setRestockData({ quantity: 1, staff_id: '', notes: '' });
    setIsModalOpen(true);
  };

  const submitRestock = async () => {
    if (!selectedPart || restockData.quantity <= 0) {
      alert('数量を正しく入力してください');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        type: 'add_restock',
        part_id: selectedPart.部品ID,
        quantity: restockData.quantity,
        staff_id: restockData.staff_id,
        notes: restockData.notes
      };

      const res = await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setIsModalOpen(false);
        await fetchData(); // Refresh stocks
      } else {
        alert('エラー: ' + data.message);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    let colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    let Icon = CheckCircle;
    
    if (status === '欠品') {
      colorClass = 'bg-rose-100 text-rose-700 border-rose-200';
      Icon = AlertCircle;
    } else if (status === '不足') {
      colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
      Icon = AlertTriangle;
    }

    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${colorClass} flex items-center space-x-1 shadow-sm`}>
        <Icon size={14} />
        <span>{status || '適正'}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 font-sans selection:bg-blue-200">
      
      {/* Header Area */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/" className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">部品在庫マスタ</h1>
          </div>
          
          <div className="relative mb-3 group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="品名、品番で検索..."
              className="w-full bg-slate-100/80 border-0 text-slate-900 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2 snap-x">
            {makersList.map((maker) => (
              <button
                key={maker}
                onClick={() => setActiveMaker(maker)}
                className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeMaker === maker
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-500/25 scale-105'
                    : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50'
                }`}
              >
                {maker}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 size={40} className="text-rose-500 animate-spin" />
            <p className="text-sm font-medium text-slate-400 animate-pulse">マスタデータを読み込み中...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-12 text-center shadow-lg shadow-slate-200/20 mt-8">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <PackageOpen size={32} className="text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-600 mb-2">部品が見つかりません</p>
            <p className="text-sm text-slate-400">検索条件を変更してください</p>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredParts.map((p, index) => {
              const currentStock = Number(p.現在在庫) || 0;
              const properStock = Number(p.適正在庫) || 0;
              const ratio = properStock > 0 ? Math.min(100, (currentStock / properStock) * 100) : 100;
              
              // ProgressBar Color
              let progressColor = 'bg-emerald-500';
              if (p.在庫ステータス === '欠品') progressColor = 'bg-rose-500';
              else if (p.在庫ステータス === '不足') progressColor = 'bg-amber-500';

              return (
                <div key={p.部品ID || index} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/60 hover:shadow-lg transition-shadow relative overflow-hidden group">
                  
                  {/* Glass highlight */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-10 -mt-10 opacity-50 z-0 pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{p.メーカーID || 'メーカー不明'}</span>
                       {getStatusBadge(p.在庫ステータス)}
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight mb-2 pr-6">
                      {p.品名 || '名称未設定'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mb-4">{p.品番 ? `品番: ${p.品番}` : '品番登録なし'}</p>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 mb-4">
                       <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-bold text-slate-500">現在庫</span>
                          <div className="flex items-baseline space-x-1">
                            <span className={`text-2xl font-black ${p.在庫ステータス==='欠品'? 'text-rose-600': p.在庫ステータス==='不足'? 'text-amber-600' : 'text-emerald-600'}`}>
                              {currentStock}
                            </span>
                            <span className="text-sm font-bold text-slate-400">/ {properStock > 0 ? properStock : '-'}</span>
                          </div>
                       </div>
                       {/* Progress Bar */}
                       <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-2.5 rounded-full ${progressColor} transition-all duration-500`} style={{ width: `${ratio}%` }}></div>
                       </div>
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => openRestockModal(p)}
                        className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 px-4 py-2 rounded-xl font-bold transition-colors active:scale-95"
                      >
                         <PackagePlus size={16} />
                         <span>入庫を登録する</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restock Modal */}
      {isModalOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
              <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
                <PackagePlus size={20} className="text-blue-500"/>
                <span>入庫登録</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 active:scale-95 transition-all"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-slate-50/50">
               
               <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4">
                 <p className="text-xs font-bold text-blue-500 mb-1">{selectedPart.メーカーID}</p>
                 <p className="text-base font-black text-blue-900">{selectedPart.品名}</p>
                 <p className="text-sm font-semibold text-blue-700 mt-2 flex items-center">
                   現在の在庫: {selectedPart.現在在庫}  <ChevronRight size={14} className="mx-1 opacity-50"/>  増枠分を以下に入力
                 </p>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">入庫数量（いくつ追加するか）</label>
                 <div className="flex items-center space-x-3">
                   <button 
                     type="button" 
                     onClick={() => setRestockData(p => ({...p, quantity: Math.max(1, p.quantity - 1)}))}
                     className="w-12 h-12 bg-white border border-slate-200 rounded-xl text-xl font-bold flex items-center justify-center shadow-sm active:scale-95 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                   >-</button>
                   <input 
                     type="number"
                     min="1"
                     value={restockData.quantity}
                     onChange={e => setRestockData({...restockData, quantity: Number(e.target.value)})}
                     className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-center text-xl font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                   />
                   <button 
                     type="button" 
                     onClick={() => setRestockData(p => ({...p, quantity: p.quantity + 1}))}
                     className="w-12 h-12 bg-white border border-slate-200 rounded-xl text-xl font-bold flex items-center justify-center shadow-sm active:scale-95 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                   >+</button>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">入庫担当者</label>
                 <select 
                   value={restockData.staff_id}
                   onChange={e => setRestockData({...restockData, staff_id: e.target.value})}
                   className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 appearance-none outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm"
                 >
                   <option value="">未選択</option>
                   {masters.staff.map((s:any) => (
                     <option key={s.社員ID} value={s.社員名 || s.社員ID}>{s.社員名 || s.社員ID}</option>
                   ))}
                 </select>
               </div>
               
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">備考</label>
                  <input
                    value={restockData.notes}
                    onChange={e => setRestockData({...restockData, notes: e.target.value})}
                    placeholder="発注書番号やメモなど"
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm"
                  />
               </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex pb-safe shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
              <button 
                onClick={submitRestock}
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                <span>{restockData.quantity} 個 を入庫確定する</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-2 sm:pb-4 z-40">
        <div className="flex justify-around items-center h-16 max-w-3xl mx-auto px-2">
          <Link href="/" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-blue-600 transition-colors">
            <Home size={22} />
            <span className="text-[10px] font-bold">ホーム</span>
          </Link>
          <Link href="/cases" className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-blue-600 transition-colors">
            <Wrench size={22} />
            <span className="text-[10px] font-bold">案件管理</span>
          </Link>
          <div className="relative flex flex-col items-center justify-center w-full h-full space-y-1 text-blue-600 transition-colors pointer-events-none">
             <Settings size={22} />
            <span className="text-[10px] font-bold">部品・在庫</span>
            <div className="absolute top-2 right-1/4 w-2 h-2 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}