
import React, { useState, useMemo, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { Sale, SaleItem } from '../types';
import DocumentPrinter from '../components/DocumentPrinter';
import Branding from '../components/Branding';
import { 
  Calendar, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  User, 
  CreditCard, 
  Banknote, 
  Layers,
  TrendingUp,
  Clock,
  ShoppingCart,
  Printer,
  Filter,
  X,
  FileText,
  BarChart3,
  PackageSearch,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

type Period = 'today' | 'week' | 'month' | 'custom';

const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>(storageService.getSales());
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [isReportMode, setIsReportMode] = useState(false);
  
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const config = storageService.getCompanyInfo();

  const loadSales = async () => {
    setIsLoading(true);
    try {
      // On peut passer les dates à fetchSales pour un filtrage côté serveur
      const data = await storageService.fetchSales(
        period === 'custom' ? startDate : undefined,
        period === 'custom' ? endDate : undefined
      );
      setSales(data);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [period, startDate, endDate]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = (sale.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                           sale.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProduct = productSearch === '' || (sale.items && sale.items.some(item => 
        item.designation.toLowerCase().includes(productSearch.toLowerCase())
      ));

      return matchesSearch && matchesProduct;
    });
  }, [sales, searchTerm, productSearch]);

  const reportStats = useMemo(() => {
    const total = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
    const count = filteredSales.length;
    const avg = count > 0 ? total / count : 0;
    
    const productMap: Record<string, { qty: number, total: number }> = {};
    filteredSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          if (!productMap[item.designation]) {
            productMap[item.designation] = { qty: 0, total: 0 };
          }
          productMap[item.designation].qty += item.quantity;
          productMap[item.designation].total += item.total;
        });
      }
    });

    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { total, count, avg, topProducts };
  }, [filteredSales]);

  const getPaymentBadge = (type: string) => {
    const t = type.toUpperCase();
    switch (t) {
      case 'CASH': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center space-x-1"><Banknote size={10} /> <span>CASH</span></span>;
      case 'CREDIT': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center space-x-1"><CreditCard size={10} /> <span>CRÉDIT</span></span>;
      case 'MIXED': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center space-x-1"><Layers size={10} /> <span>MIXTE</span></span>;
      case 'MOBILE_MONEY': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center space-x-1"><Banknote size={10} /> <span>MOBILE</span></span>;
      default: return <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-black">{t}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <Branding companyName={config?.name || ''} category="Rapports de Ventes Cloud" size="lg" variant="light" />
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={loadSales}
            disabled={isLoading}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex">
            <button onClick={() => setPeriod('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'today' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Aujourd'hui</button>
            <button onClick={() => setPeriod('week')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'week' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Semaine</button>
            <button onClick={() => setPeriod('month')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'month' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Mois</button>
            <button onClick={() => setPeriod('custom')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'custom' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Perso</button>
          </div>
          
          <button 
            onClick={() => setIsReportMode(true)}
            className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2 hover:scale-105 active:scale-95 transition-all"
          >
            <FileText size={18} />
            <span>Générer Rapport</span>
          </button>
        </div>
      </header>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Client / Facture</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Nom ou ID..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Produit vendu</label>
          <div className="relative">
            <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Riz, Huile, Savon..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
        </div>

        {period === 'custom' && (
          <>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date Début</label>
              <input 
                type="date" 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date Fin</label>
              <input 
                type="date" 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
           <Loader2 className="animate-spin mb-4" size={48} />
           <p className="font-black uppercase text-xs tracking-widest">Accès Archives Cloud...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
            <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Chiffre d'Affaires</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{storageService.formatFC(reportStats.total)}</h3>
                <p className="text-[9px] text-emerald-500 font-black uppercase mt-2 flex items-center space-x-1">
                  <TrendingUp size={12} /> <span>Période sélectionnée</span>
                </p>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner">
                <Banknote size={24} />
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Volume Ventes</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{reportStats.count} Factures</h3>
                <p className="text-[9px] text-blue-500 font-black uppercase mt-2">Activité sur filtres</p>
              </div>
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                <Layers size={24} />
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Panier Moyen</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{storageService.formatFC(Math.round(reportStats.avg))}</h3>
                <p className="text-[9px] text-amber-500 font-black uppercase mt-2">Dépense par client</p>
              </div>
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-inner">
                <ShoppingCart size={24} />
              </div>
            </div>
          </div>

          <div className="space-y-4 no-print">
            {filteredSales.map(sale => (
              <div key={sale.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:border-emerald-200 transition-all group">
                <div className="w-full p-6 flex items-center justify-between">
                  <button onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)} className="flex items-center space-x-5 text-left flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                      <Clock size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-black text-slate-800 tracking-tight">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {getPaymentBadge(sale.paymentType)}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        #{sale.id.toUpperCase()} • {new Date(sale.date).toLocaleDateString()}
                        {sale.author && ` • Vendeur: ${sale.author}`}
                      </p>
                    </div>
                  </button>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-lg">{storageService.formatFC(sale.total)}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Archivé</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setPrintSale(sale)}
                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Réimprimer"
                      >
                        <Printer size={18} />
                      </button>
                      <button onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)} className="p-3 text-slate-300 hover:text-emerald-500">
                        {expandedSaleId === sale.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedSaleId === sale.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-50/50 rounded-2xl p-5 space-y-4 border border-slate-100">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-3">Détail du panier</h4>
                      <div className="space-y-3">
                        {sale.items && sale.items.length > 0 ? sale.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <p className="font-black text-slate-700 uppercase text-xs">{item.designation}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{item.quantity} x {storageService.formatFC(parseFloat(item.unitPrice || 0))}</p>
                            </div>
                            <span className="font-black text-slate-900">{storageService.formatFC(parseFloat(item.total || 0))}</span>
                          </div>
                        )) : <p className="text-center text-[10px] text-slate-400 font-bold py-2 uppercase tracking-widest italic">Chargement des détails non disponible en vue réduite.</p>}
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Opérateur: {sale.author}</span>
                        <span>Total: {storageService.formatFC(sale.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredSales.length === 0 && (
              <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300">
                <Search size={64} className="mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-sm">Aucune vente ne correspond à vos critères</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Rapport de Période (Mode Impression) */}
      {isReportMode && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-10 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh]">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center no-print">
               <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900 shadow-lg">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Rapport d'Activité nexaPME</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      Période: {period === 'custom' ? `${startDate || '?'} au ${endDate || '?'}` : period}
                    </p>
                  </div>
               </div>
               <div className="flex items-center space-x-3">
                 <button onClick={() => window.print()} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2 hover:bg-emerald-50 transition-all">
                    <Printer size={18} />
                    <span>Imprimer PDF</span>
                 </button>
                 <button onClick={() => setIsReportMode(false)} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-rose-500 transition-all">
                   <X size={24} />
                 </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12" id="printable-report">
               <div className="hidden print:flex flex-col items-center text-center mb-10">
                  <Branding companyName={config?.name || ''} category="Rapport Financier" size="lg" variant="light" />
                  <div className="h-1 w-32 bg-slate-900 mt-4"></div>
                  <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Généré le {new Date().toLocaleDateString()} à {new Date().toLocaleTimeString()}
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chiffre d'Affaires Brut</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{storageService.formatFC(reportStats.total)}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase">{storageService.formatUSD(reportStats.total)}</p>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de Transactions</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{reportStats.count}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase">Volume total</p>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dépense Moyenne / Client</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{storageService.formatFC(Math.round(reportStats.avg))}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase">Performance de vente</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Top 5 Produits (Ventes)</h4>
                    <div className="space-y-4">
                      {reportStats.topProducts.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="flex items-center space-x-4">
                            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">{i+1}</span>
                            <span className="font-black text-slate-700 uppercase text-xs">{p.name}</span>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-slate-900 text-sm">{storageService.formatFC(p.total)}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">{p.qty} unités vendues</p>
                          </div>
                        </div>
                      ))}
                      {reportStats.topProducts.length === 0 && <p className="text-center py-10 text-slate-300 font-bold uppercase text-xs">Aucune donnée produit</p>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Résumé des Modes de Paiement</h4>
                    <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                       {['CASH', 'MOBILE_MONEY', 'CREDIT', 'MIXED'].map((m: string) => {
                         const amount = filteredSales.filter(s => s.paymentType === m).reduce((acc, s) => acc + s.total, 0);
                         if (amount === 0) return null;
                         return (
                           <div key={m} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                             <span className="text-[10px] font-black text-slate-400 uppercase">{m.replace('_', ' ')}</span>
                             <span className="font-black text-slate-800">{storageService.formatFC(amount)}</span>
                           </div>
                         );
                       }).filter(el => el !== null)}
                    </div>
                  </div>
               </div>

               <div className="pt-10 border-t border-slate-200">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">
                    Document officiel nexaPME - Traçabilité Garantie
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {printSale && config && (
        <DocumentPrinter 
          sale={printSale} 
          config={config} 
          onClose={() => setPrintSale(null)} 
        />
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          #printable-report {
            display: block !important;
            visibility: visible !important;
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white;
            padding: 20px;
          }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default SalesHistory;
