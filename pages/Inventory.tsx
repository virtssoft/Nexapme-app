
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
  ArrowRight
} from 'lucide-react';
import { CATEGORIES } from '../constants';

type InventoryPhase = 'START' | 'WHOLESALE_PHASE' | 'WHOLESALE_REVIEW' | 'RETAIL_PHASE' | 'RETAIL_REVIEW' | 'SUMMARY' | 'VIEW_PAST_REPORT';

const Inventory: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>(storageService.getStock());
  const [reports, setReports] = useState<InventoryReport[]>(storageService.getInventories());
  
  const [phase, setPhase] = useState<InventoryPhase>('START');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedPastReport, setSelectedPastReport] = useState<InventoryReport | null>(null);

  useEffect(() => {
    setStock(storageService.getStock());
    setReports(storageService.getInventories());
  }, []);

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
    
    if (wholesaleCategories.length > 0) {
      setPhase('WHOLESALE_PHASE');
    } else if (retailCategories.length > 0) {
      setPhase('RETAIL_PHASE');
    } else {
      alert("Votre stock est vide ! Ajoutez des articles avant de faire un inventaire.");
    }
  };

  const handleNext = () => {
    if (phase === 'WHOLESALE_PHASE') {
      if (currentCategoryIndex < wholesaleCategories.length - 1) {
        setCurrentCategoryIndex(currentCategoryIndex + 1);
      } else {
        setPhase('WHOLESALE_REVIEW');
      }
    } else if (phase === 'RETAIL_PHASE') {
      if (currentCategoryIndex < retailCategories.length - 1) {
        setCurrentCategoryIndex(currentCategoryIndex + 1);
      } else {
        setPhase('RETAIL_REVIEW');
      }
    }
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (phase === 'WHOLESALE_PHASE') {
      if (currentCategoryIndex > 0) setCurrentCategoryIndex(currentCategoryIndex - 1);
      else setPhase('START');
    } else if (phase === 'WHOLESALE_REVIEW') {
      setPhase('WHOLESALE_PHASE');
      setCurrentCategoryIndex(wholesaleCategories.length - 1);
    } else if (phase === 'RETAIL_PHASE') {
      if (currentCategoryIndex > 0) setCurrentCategoryIndex(currentCategoryIndex - 1);
      else {
        if (wholesaleCategories.length > 0) setPhase('WHOLESALE_REVIEW');
        else setPhase('START');
      }
    } else if (phase === 'RETAIL_REVIEW') {
      setPhase('RETAIL_PHASE');
      setCurrentCategoryIndex(retailCategories.length - 1);
    } else if (phase === 'SUMMARY') {
      setPhase('RETAIL_REVIEW');
    }
    window.scrollTo(0, 0);
  };

  const finalizeInventory = () => {
    const reportItems = stock.map(item => {
      const realQty = counts[item.id] ?? item.quantity;
      const difference = realQty - item.quantity;
      return {
        itemId: item.id,
        designation: item.designation,
        theoreticalQty: item.quantity,
        realQty: realQty,
        difference: difference,
        lossValue: difference < 0 ? Math.abs(difference) * item.purchasePrice : 0
      };
    });

    const report: InventoryReport = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'COMPLETE_AUDIT',
      items: reportItems,
      totalLoss: reportItems.reduce((acc, i) => acc + i.lossValue, 0),
      author: storageService.getUser()
    };

    const updatedStock = stock.map(item => ({ ...item, quantity: counts[item.id] ?? item.quantity }));
    storageService.updateStock(updatedStock);
    storageService.addInventory(report);
    
    setStock(updatedStock);
    setReports([report, ...reports]);
    setPhase('START');
    alert("Inventaire global clôturé ! Le stock a été mis à jour.");
  };

  const viewReport = (report: InventoryReport) => {
    setSelectedPastReport(report);
    setPhase('VIEW_PAST_REPORT');
  };

  const groupedReportItems = (items: any[]) => {
    const grouped: Record<string, any[]> = {
      'STOCK_DE_GROS': [],
      'STOCK_DE_DETAIL': []
    };
    
    items.forEach(item => {
      const stockItem = stock.find(s => s.id === item.itemId);
      const isWholesale = stockItem?.isWholesale;
      const key = isWholesale ? 'STOCK_DE_GROS' : 'STOCK_DE_DETAIL';
      grouped[key].push(item);
    });
    
    return grouped;
  };

  const updateCount = (id: string, val: number) => {
    setCounts(prev => ({ ...prev, [id]: Math.max(0, val) }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="no-print flex justify-between items-center mb-2 px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">Assistant Inventaire</h2>
          <p className="text-slate-500 font-medium text-[10px] md:text-xs">Audit scindé Gros & Détail</p>
        </div>
      </header>

      {/* START SCREEN */}
      {phase === 'START' && (
        <div className="space-y-8 animate-in fade-in no-print px-2">
          <div className="bg-white p-6 md:p-12 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl text-center space-y-6 max-w-2xl mx-auto overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-rose-500"></div>
            <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-900 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <ClipboardCheck size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Audit de Stock Global</h3>
              <p className="text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Le processus sera scindé en deux étapes : d'abord le <span className="text-emerald-600 font-black">Gros</span>, puis le <span className="text-blue-600 font-black">Détail</span>.
              </p>
            </div>
            <button 
              onClick={startInventoryProcess}
              className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3 mx-auto"
            >
              <span>Démarrer par le Gros</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="flex items-center space-x-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] px-2">
              <History size={14} />
              <span>Derniers Audits</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <div key={report.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-lg transition-all">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-black text-slate-800 truncate">{new Date(report.date).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold text-rose-500 uppercase truncate">Perte: {storageService.formatFC(report.totalLoss)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => viewReport(report)}
                    className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* COUNTING PHASES */}
      {(phase === 'WHOLESALE_PHASE' || phase === 'RETAIL_PHASE') && (
        <div className="space-y-6 animate-in slide-in-from-right-4 no-print px-2">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center space-x-2 ${phase === 'WHOLESALE_PHASE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {phase === 'WHOLESALE_PHASE' ? <Layers size={14} /> : <ShoppingBag size={14} />}
                  <span>{phase === 'WHOLESALE_PHASE' ? 'ÉTAPE 1 : INVENTAIRE GROS' : 'ÉTAPE 2 : INVENTAIRE DÉTAIL'}</span>
                </span>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {currentCategory} ({currentCategoryIndex + 1}/{currentCategories.length})
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${phase === 'WHOLESALE_PHASE' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${((currentCategoryIndex + 1) / currentCategories.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {itemsToDisplay.map(item => (
              <div key={item.id} className="bg-white p-5 md:p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-1/2">
                  <h4 className="font-black text-slate-800 text-lg md:text-xl leading-none uppercase">{item.designation}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Prévu: {item.quantity} {item.unit}</p>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-8">
                   <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <button 
                        onClick={() => updateCount(item.id, (counts[item.id] ?? item.quantity) - 1)}
                        className="w-10 h-10 rounded-xl bg-white text-slate-600 font-black text-xl shadow-sm hover:bg-slate-200 transition-all"
                      >-</button>
                      <input 
                        type="number" 
                        className="w-20 bg-transparent text-center font-black text-slate-900 outline-none text-xl"
                        value={counts[item.id] ?? item.quantity}
                        onChange={(e) => updateCount(item.id, Number(e.target.value))}
                      />
                      <button 
                        onClick={() => updateCount(item.id, (counts[item.id] ?? item.quantity) + 1)}
                        className="w-10 h-10 rounded-xl bg-white text-slate-600 font-black text-xl shadow-sm hover:bg-slate-200 transition-all"
                      >+</button>
                   </div>
                </div>
              </div>
            ))}
          </div>

          <footer className="flex justify-between items-center pt-8">
            <button onClick={handleBack} className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-2">
              <ChevronLeft size={18} /> <span>Précédent</span>
            </button>
            <button 
              onClick={handleNext}
              className={`px-12 py-4 ${phase === 'WHOLESALE_PHASE' ? 'bg-emerald-600' : 'bg-blue-600'} text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 shadow-xl hover:scale-105 transition-all`}
            >
              <span>{currentCategoryIndex === currentCategories.length - 1 ? 'Valider l\'étape' : 'Suivant'}</span>
              <ChevronRight size={18} />
            </button>
          </footer>
        </div>
      )}

      {/* REVIEW PHASES */}
      {(phase === 'WHOLESALE_REVIEW' || phase === 'RETAIL_REVIEW') && (
        <div className="space-y-6 animate-in zoom-in-95 no-print px-2">
          <div className={`p-8 rounded-[3rem] text-white shadow-2xl ${phase === 'WHOLESALE_REVIEW' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Vérification de l'étape</h3>
            <p className="text-white/70 text-sm font-bold uppercase">Consultez les écarts détectés en {phase === 'WHOLESALE_REVIEW' ? 'Gros' : 'Détail'} avant de poursuivre.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              {stock.filter(i => phase === 'WHOLESALE_REVIEW' ? i.isWholesale : !i.isWholesale)
                .map(item => {
                  const real = counts[item.id] ?? item.quantity;
                  const diff = real - item.quantity;
                  if (diff === 0) return null;
                  return (
                    <div key={item.id} className={`p-4 rounded-2xl border flex justify-between items-center ${diff < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{item.designation}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Théorique: {item.quantity} → Réel: {real}</p>
                      </div>
                      <span className={`font-black text-lg ${diff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{diff > 0 ? '+' : ''}{diff}</span>
                    </div>
                  );
                }).filter(el => el !== null).length === 0 && (
                  <div className="py-10 text-center text-slate-300 italic font-bold">Aucun écart détecté pour cette phase.</div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
               <button onClick={handleBack} className="flex-1 py-4 border-2 border-slate-200 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Corriger le comptage</button>
               <button 
                onClick={() => {
                  if (phase === 'WHOLESALE_REVIEW') {
                    if (retailCategories.length > 0) {
                      setPhase('RETAIL_PHASE');
                      setCurrentCategoryIndex(0);
                    } else {
                      setPhase('SUMMARY');
                    }
                  } else {
                    setPhase('SUMMARY');
                  }
                }}
                className={`flex-[2] py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 ${phase === 'WHOLESALE_REVIEW' ? 'bg-emerald-600' : 'bg-blue-600'}`}
               >
                 <span>Confirmer & {phase === 'WHOLESALE_REVIEW' ? 'Passer au Détail' : 'Voir le Bilan Final'}</span>
                 <ArrowRight size={18} />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL SUMMARY / PAST REPORT */}
      {(phase === 'SUMMARY' || phase === 'VIEW_PAST_REPORT') && (
        <div className="space-y-6 animate-in zoom-in-95 pb-24 px-2">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6 no-print">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-emerald-500 rounded-3xl text-slate-900 shadow-lg"><CheckCircle2 size={24} /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Bilan Final de l'Audit</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{phase === 'SUMMARY' ? 'Audit Complet' : `Rapport archivé du ${new Date(selectedPastReport?.date || '').toLocaleDateString()}`}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => window.print()} className="px-6 py-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 font-black text-xs uppercase flex items-center space-x-2 border border-slate-700 no-print">
                  <Printer size={18} /> <span>Imprimer</span>
                </button>
                {phase === 'VIEW_PAST_REPORT' && <button onClick={() => setPhase('START')} className="p-4 bg-rose-600 text-white rounded-2xl"><X size={20} /></button>}
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-12">
              {Object.entries(groupedReportItems(phase === 'SUMMARY' ? stock.map(i => {
                const real = counts[i.id] ?? i.quantity;
                const diff = real - i.quantity;
                return { itemId: i.id, designation: i.designation, theoreticalQty: i.quantity, realQty: real, difference: diff, lossValue: diff < 0 ? Math.abs(diff) * i.purchasePrice : 0 };
              }) : selectedPastReport!.items)).map(([section, items]) => {
                const diffItems = items.filter(i => i.difference !== 0);
                if (diffItems.length === 0) return null;
                return (
                  <div key={section} className="space-y-6">
                    <h4 className={`text-xl font-black uppercase tracking-tight border-b-4 pb-2 flex justify-between items-center ${section === 'STOCK_DE_GROS' ? 'text-emerald-600 border-emerald-100' : 'text-blue-600 border-blue-100'}`}>
                      <span>{section.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-slate-400">{diffItems.length} Variations</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map(item => {
                        if (item.difference === 0) return null;
                        return (
                          <div key={item.itemId} className={`p-5 rounded-3xl flex justify-between items-center border ${item.difference < 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex-1">
                              <p className="font-black text-slate-900 text-sm uppercase">{item.designation}</p>
                              <p className="text-[10px] font-bold text-slate-400">Prévu: {item.theoreticalQty} → Réel: {item.realQty}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-black text-lg ${item.difference < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{item.difference > 0 ? '+' : ''}{item.difference}</p>
                              {item.difference < 0 && <p className="text-[10px] font-bold text-rose-400">-{storageService.formatFC(item.lossValue)}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="pt-12 mt-8 border-t-[12px] border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">VALEUR TOTALE DES PERTES (P.A.)</p>
                  <h2 className="text-5xl font-black text-rose-600 tracking-tighter">
                    {storageService.formatFC(phase === 'SUMMARY' ? stock.reduce((acc, i) => {
                      const diff = (counts[i.id] ?? i.quantity) - i.quantity;
                      return acc + (diff < 0 ? Math.abs(diff) * i.purchasePrice : 0);
                    }, 0) : selectedPastReport?.totalLoss || 0)}
                  </h2>
                </div>
                {phase === 'SUMMARY' && (
                  <button onClick={finalizeInventory} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center space-x-3 no-print">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    <span>Valider & Mettre à jour le stock</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .pb-24 { padding-bottom: 0; }
        }
      `}</style>
    </div>
  );
};

export default Inventory;
