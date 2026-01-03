
import React, { useState, useMemo, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem, InventoryReport } from '../types';
import { 
  ClipboardCheck, 
  Layers, 
  ShoppingBag, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Printer,
  History,
  FileText,
  X,
  TrendingDown,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
  Search,
  Eye
} from 'lucide-react';
import { CATEGORIES } from '../constants';

type InventoryTab = 'VIEW_CLOUD' | 'PHYSICAL_AUDIT';
type InventoryPhase = 'START' | 'WHOLESALE_PHASE' | 'WHOLESALE_REVIEW' | 'RETAIL_PHASE' | 'RETAIL_REVIEW' | 'SUMMARY' | 'VIEW_PAST_REPORT';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('VIEW_CLOUD');
  const [stockType, setStockType] = useState<'wholesale' | 'retail'>('wholesale');
  const [cloudStock, setCloudStock] = useState<StockItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Audit State
  const [stock, setStock] = useState<StockItem[]>(storageService.getStock());
  const [reports, setReports] = useState<InventoryReport[]>(storageService.getInventories());
  const [phase, setPhase] = useState<InventoryPhase>('START');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedPastReport, setSelectedPastReport] = useState<InventoryReport | null>(null);

  const loadCloudInventory = async () => {
    setIsRefreshing(true);
    const data = await storageService.fetchInventory(stockType);
    setCloudStock(data);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (activeTab === 'VIEW_CLOUD') loadCloudInventory();
  }, [activeTab, stockType]);

  useEffect(() => {
    setStock(storageService.getStock());
    setReports(storageService.getInventories());
  }, []);

  const filteredCloudStock = useMemo(() => {
    return cloudStock.filter(i => i.designation.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cloudStock, searchTerm]);

  // Logic Audit Physique (Wizard)
  const wholesaleCategories = useMemo(() => {
    const cats = new Set<string>();
    stock.filter(item => item.isWholesale).forEach(item => cats.add(item.category));
    return CATEGORIES.filter(c => cats.has(c));
  }, [stock]);

  const retailCategories = useMemo(() => {
    const cats = new Set<string>();
    stock.filter(item => !item.isWholesale).forEach(item => cats.add(item.category));
    return CATEGORIES.filter(c => cats.has(c));
  }, [stock]);

  const currentCategories = (phase === 'WHOLESALE_PHASE') ? wholesaleCategories : retailCategories;
  const currentCategory = currentCategories[currentCategoryIndex];

  const itemsToDisplay = useMemo(() => {
    if (phase !== 'WHOLESALE_PHASE' && phase !== 'RETAIL_PHASE') return [];
    return stock.filter(item => {
      const matchesPhase = phase === 'WHOLESALE_PHASE' ? item.isWholesale : !item.isWholesale;
      return matchesPhase && item.category === currentCategory;
    });
  }, [stock, phase, currentCategory]);

  const startInventoryProcess = () => {
    const initialCounts: Record<string, number> = {};
    stock.forEach(item => { initialCounts[item.id] = item.quantity; });
    setCounts(initialCounts);
    setCurrentCategoryIndex(0);
    if (wholesaleCategories.length > 0) setPhase('WHOLESALE_PHASE');
    else if (retailCategories.length > 0) setPhase('RETAIL_PHASE');
    else alert("Stock vide.");
  };

  const handleNext = () => {
    if (phase === 'WHOLESALE_PHASE') {
      if (currentCategoryIndex < wholesaleCategories.length - 1) setCurrentCategoryIndex(currentCategoryIndex + 1);
      else setPhase('WHOLESALE_REVIEW');
    } else if (phase === 'RETAIL_PHASE') {
      if (currentCategoryIndex < retailCategories.length - 1) setCurrentCategoryIndex(currentCategoryIndex + 1);
      else setPhase('RETAIL_REVIEW');
    }
    window.scrollTo(0, 0);
  };

  const finalizeInventory = () => {
    const reportItems = stock.map(item => {
      const realQty = counts[item.id] ?? item.quantity;
      const difference = realQty - item.quantity;
      return { itemId: item.id, designation: item.designation, theoreticalQty: item.quantity, realQty, difference, lossValue: difference < 0 ? Math.abs(difference) * item.purchasePrice : 0 };
    });
    const report: InventoryReport = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), type: 'COMPLETE_AUDIT', items: reportItems, totalLoss: reportItems.reduce((acc, i) => acc + i.lossValue, 0), author: storageService.getCurrentUser()?.name || 'system' };
    const updatedStock = stock.map(item => ({ ...item, quantity: counts[item.id] ?? item.quantity }));
    storageService.updateStock(updatedStock);
    storageService.addInventory(report);
    setStock(updatedStock);
    setReports([report, ...reports]);
    setPhase('START');
    alert("Inventaire global clôturé !");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="flex justify-between items-end px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Module Inventaire</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Contrôle de dépôt et d'unités</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-3xl border border-slate-200 shadow-sm flex no-print">
        <button onClick={() => setActiveTab('VIEW_CLOUD')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center space-x-2 transition-all ${activeTab === 'VIEW_CLOUD' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
          <Database size={16} /> <span>Vue Cloud Nexa</span>
        </button>
        <button onClick={() => setActiveTab('PHYSICAL_AUDIT')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center space-x-2 transition-all ${activeTab === 'PHYSICAL_AUDIT' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
          <ClipboardCheck size={16} /> <span>Audit Physique</span>
        </button>
      </div>

      {activeTab === 'VIEW_CLOUD' ? (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
             <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shrink-0">
                <button onClick={() => setStockType('wholesale')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${stockType === 'wholesale' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>Stock de Gros</button>
                <button onClick={() => setStockType('retail')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${stockType === 'retail' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Stock Détail</button>
             </div>
             
             <div className="flex-1 max-w-lg relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="Filtrer l'inventaire..." className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-slate-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <button onClick={loadCloudInventory} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <th className="px-8 py-5">Article (Désignation)</th>
                  <th className="px-8 py-5">Catégorie</th>
                  <th className="px-8 py-5">Stock Actuel</th>
                  <th className="px-8 py-5">Seuil Alerte</th>
                  <th className="px-8 py-5 text-right">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCloudStock.map(item => {
                  const isLow = parseFloat(item.quantity as any) <= parseFloat(item.alertThreshold as any);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 font-black text-slate-800 uppercase text-xs">{item.designation}</td>
                      <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">{item.category}</td>
                      <td className="px-8 py-5">
                         <span className={`font-black text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity} {item.unit}</span>
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-400 font-bold">{item.alertThreshold} {item.unit}</td>
                      <td className="px-8 py-5 text-right">
                         {isLow ? <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Critique</span> : <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Ok</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in">
           {/* REPRISE DU WIZARD EXISTANT ICI */}
           {phase === 'START' && (
              <div className="space-y-8 no-print px-2">
                <div className="bg-white p-6 md:p-12 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl text-center space-y-6 max-w-2xl mx-auto overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-rose-500"></div>
                  <div className="w-20 h-20 bg-slate-900 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                    <ClipboardCheck size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Audit de Stock Global</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Le processus sera scindé en deux étapes : d'abord le <span className="text-emerald-600 font-black">Gros</span>, puis le <span className="text-blue-600 font-black">Détail</span>.</p>
                  </div>
                  <button onClick={startInventoryProcess} className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-4 mx-auto">
                    <span>Démarrer Audit Physique</span> <ArrowRight size={18} />
                  </button>
                </div>
                <div className="space-y-4 pt-4">
                  <h3 className="flex items-center space-x-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] px-2"><History size={14} /> <span>Archives d'Audits Physiques</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reports.map(report => (
                      <div key={report.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
                        <div className="flex items-center space-x-3 truncate">
                          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0"><FileText size={18} /></div>
                          <div className="truncate"><p className="text-sm font-black text-slate-800">{new Date(report.date).toLocaleDateString()}</p><p className="text-[9px] font-bold text-rose-500 uppercase">-{storageService.formatFC(report.totalLoss)}</p></div>
                        </div>
                        <button className="p-2 bg-slate-100 text-slate-500 rounded-xl"><Printer size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
           )}
           
           {(phase === 'WHOLESALE_PHASE' || phase === 'RETAIL_PHASE') && (
              <div className="space-y-6 animate-in slide-in-from-right-4 px-2">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center space-x-2 ${phase === 'WHOLESALE_PHASE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {phase === 'WHOLESALE_PHASE' ? <Layers size={14} /> : <ShoppingBag size={14} />}
                      <span>{phase === 'WHOLESALE_PHASE' ? 'ÉTAPE 1 : GROS' : 'ÉTAPE 2 : DÉTAIL'}</span>
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentCategory} ({currentCategoryIndex + 1}/{currentCategories.length})</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${phase === 'WHOLESALE_PHASE' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${((currentCategoryIndex + 1) / currentCategories.length) * 100}%` }} />
                  </div>
                </div>
                <div className="space-y-3">
                  {itemsToDisplay.map(item => (
                    <div key={item.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1 text-center md:text-left"><h4 className="font-black text-slate-800 text-lg uppercase">{item.designation}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Stock Cloud: {item.quantity} {item.unit}</p></div>
                      <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button onClick={() => setCounts({...counts, [item.id]: Math.max(0, (counts[item.id] ?? item.quantity) - 1)})} className="w-10 h-10 rounded-xl bg-white text-slate-600 font-black text-xl shadow-sm hover:bg-slate-200">-</button>
                        <input type="number" className="w-20 bg-transparent text-center font-black text-slate-900 outline-none text-xl" value={counts[item.id] ?? item.quantity} onChange={(e) => setCounts({...counts, [item.id]: Number(e.target.value)})} />
                        <button onClick={() => setCounts({...counts, [item.id]: (counts[item.id] ?? item.quantity) + 1})} className="w-10 h-10 rounded-xl bg-white text-slate-600 font-black text-xl shadow-sm hover:bg-slate-200">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <footer className="flex justify-between items-center pt-8">
                  <button onClick={() => setPhase('START')} className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Annuler</button>
                  <button onClick={handleNext} className={`px-12 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2 ${phase === 'WHOLESALE_PHASE' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                    <span>{currentCategoryIndex === currentCategories.length - 1 ? 'Confirmer l\'étape' : 'Suivant'}</span> <ChevronRight size={18} />
                  </button>
                </footer>
              </div>
           )}
           
           {(phase === 'WHOLESALE_REVIEW' || phase === 'RETAIL_REVIEW') && (
              <div className="space-y-6 animate-in zoom-in-95 px-2">
                <div className={`p-8 rounded-[3rem] text-white shadow-2xl ${phase === 'WHOLESALE_REVIEW' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Bilan de l'étape</h3>
                   <p className="text-white/80 text-xs font-bold uppercase mt-1 tracking-widest">Validez les écarts de stock avant la clôture finale.</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <div className="space-y-3">
                      {stock.filter(i => phase === 'WHOLESALE_REVIEW' ? i.isWholesale : !i.isWholesale).map(item => {
                        const real = counts[item.id] ?? item.quantity;
                        const diff = real - item.quantity;
                        if (diff === 0) return null;
                        return (
                          <div key={item.id} className={`p-4 rounded-2xl border flex justify-between items-center ${diff < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div><p className="font-black text-slate-800 text-sm uppercase">{item.designation}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} -> {real}</p></div>
                            <span className={`font-black text-lg ${diff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{diff > 0 ? '+' : ''}{diff}</span>
                          </div>
                        );
                      }).filter(x => x !== null)}
                   </div>
                   <button onClick={() => { if(phase === 'WHOLESALE_REVIEW') { setPhase('RETAIL_PHASE'); setCurrentCategoryIndex(0); } else setPhase('SUMMARY'); }} className="w-full mt-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Continuer</button>
                </div>
              </div>
           )}

           {phase === 'SUMMARY' && (
              <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
                 <div className="p-10 bg-slate-900 text-white text-center">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Rapport d'Audit Final</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Mise à jour du stock imminent</p>
                 </div>
                 <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur des pertes (PA)</p>
                          <h2 className="text-5xl font-black text-rose-600 tracking-tighter">{storageService.formatFC(stock.reduce((acc, i) => { const diff = (counts[i.id] ?? i.quantity) - i.quantity; return acc + (diff < 0 ? Math.abs(diff) * i.purchasePrice : 0); }, 0))}</h2>
                       </div>
                    </div>
                    <button onClick={finalizeInventory} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 flex items-center justify-center space-x-3"><CheckCircle2 size={24} /> <span>Valider & Mettre à jour le Cloud</span></button>
                 </div>
              </div>
           )}
        </div>
      )}
    </div>
  );
};

export default Inventory;
