
import React, { useState, useMemo, useEffect } from 'react';
import { storageService } from '../services/StorageService';
import { Sale } from '../types';
import DocumentPrinter from '../components/DocumentPrinter';
import Branding from '../components/Branding';
import { 
  Search, Banknote, Clock, ShoppingCart, Printer, FileText, 
  PackageSearch, RefreshCw, CheckCircle2 
} from 'lucide-react';

type Period = 'today' | 'week' | 'month' | 'custom';

const SalesHistory: React.FC = () => {
  const user = storageService.getCurrentUser();
  const isManager = user?.role === 'MANAGER';
  
  const [sales, setSales] = useState<Sale[]>(storageService.getSales());
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportMode, setIsReportMode] = useState(false);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const config = storageService.getCompanyInfo();

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.fetchSales();
      setSales(data);
    } catch (e: any) {
      console.error("Erreur chargement ventes:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
    const handleUpdate = () => setSales(storageService.getSales());
    window.addEventListener('nexa_data_updated', handleUpdate);
    return () => window.removeEventListener('nexa_data_updated', handleUpdate);
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Filtrage strict par auteur : le vendeur ne voit que ses propres ventes
      if (!isManager && String(sale.authorId) !== String(user?.id)) return false;

      const matchesSearch = (sale.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                           sale.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const saleDate = new Date(sale.date);
      const now = new Date();
      let matchesPeriod = true;
      
      if (period === 'today') matchesPeriod = saleDate.toDateString() === now.toDateString();
      else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesPeriod = saleDate >= weekAgo;
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        matchesPeriod = saleDate >= monthAgo;
      }

      return matchesSearch && matchesPeriod;
    });
  }, [sales, searchTerm, period, isManager, user]);

  const stats = useMemo(() => {
    const total = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
    return { total, count: filteredSales.length };
  }, [filteredSales]);

  const handleGenerateReport = () => {
    if (filteredSales.length === 0) {
      alert("Aucune vente à rapporter pour cette sélection.");
      return;
    }
    setIsReportMode(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <Branding companyName={config?.name || ''} category={isManager ? "Historique Cloud Global" : "Mon Historique de Ventes"} size="lg" variant="light" />
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex">
            <button onClick={() => setPeriod('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'today' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Jour</button>
            <button onClick={() => setPeriod('week')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'week' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Semaine</button>
            <button onClick={() => setPeriod('month')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === 'month' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Mois</button>
          </div>
          
          <button 
            onClick={handleGenerateReport}
            className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center space-x-2 hover:bg-emerald-700 transition-all"
          >
            <FileText size={18} />
            <span>Générer Rapport</span>
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input type="text" placeholder="Numéro de facture ou nom client..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <button onClick={loadSales} className="p-2 text-slate-400 hover:text-emerald-500"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
           <div className="text-left"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ventes sur Période</p><h3 className="text-xl font-black">{storageService.formatFC(stats.total)}</h3></div>
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Banknote size={20} /></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
           <div className="text-left"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre de Factures</p><h3 className="text-xl font-black">{stats.count} Unités</h3></div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ShoppingCart size={20} /></div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredSales.map(sale => (
          <div key={sale.id} className="bg-white rounded-[2rem] border border-slate-50 shadow-sm overflow-hidden group hover:border-emerald-200 transition-all">
            <div className="w-full p-6 flex items-center justify-between">
              <div className="flex items-center space-x-5 text-left flex-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><Clock size={20} /></div>
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-black text-slate-800 text-sm">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${sale.paymentType === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{sale.paymentType}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest truncate max-w-[200px]">#{sale.id} • {sale.customerName} • Par {sale.author}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="font-black text-slate-900 text-sm">{storageService.formatFC(sale.total)}</p>
                  <p className="text-[9px] font-bold text-slate-400">{storageService.formatUSD(sale.total)}</p>
                </div>
                <button onClick={() => setPrintSale(sale)} className="p-2 text-slate-300 hover:text-slate-900 transition-all"><Printer size={18} /></button>
              </div>
            </div>
          </div>
        ))}
        {filteredSales.length === 0 && !isLoading && (
          <div className="py-20 text-center text-slate-300 space-y-4">
             <PackageSearch size={48} className="mx-auto opacity-10" />
             <p className="font-black text-[10px] uppercase tracking-widest">Aucune vente trouvée</p>
          </div>
        )}
      </div>

      {isReportMode && (
        <div className="fixed inset-0 z-[110] bg-white overflow-y-auto no-scrollbar p-10 animate-in fade-in zoom-in-95 duration-200">
           <div className="max-w-4xl mx-auto space-y-10">
              <div className="flex justify-between items-start border-b border-slate-100 pb-8 no-print">
                 <Branding companyName={config?.name || ''} category={`Rapport de Ventes - ${period.toUpperCase()}`} size="lg" variant="light" />
                 <div className="flex gap-4">
                    <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"><Printer size={18} /> Imprimer</button>
                    <button onClick={() => setIsReportMode(false)} className="bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Fermer</button>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-8 py-10 border-b border-slate-50 text-left">
                 <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total CA Période</p><h2 className="text-3xl font-black">{storageService.formatFC(stats.total)}</h2></div>
                 <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total en Dollars</p><h2 className="text-3xl font-black text-emerald-600">{storageService.formatUSD(stats.total)}</h2></div>
                 <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre d'opérations</p><h2 className="text-3xl font-black text-blue-600">{stats.count}</h2></div>
              </div>

              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                       <th className="px-6 py-4">Date & Heure</th>
                       <th className="px-6 py-4">Facture</th>
                       <th className="px-6 py-4">Client</th>
                       <th className="px-6 py-4">Vendeur</th>
                       <th className="px-6 py-4 text-right">Montant</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredSales.map(s => (
                       <tr key={s.id} className="text-xs">
                          <td className="px-6 py-4 font-bold">{new Date(s.date).toLocaleString()}</td>
                          <td className="px-6 py-4 font-black">{s.id}</td>
                          <td className="px-6 py-4 uppercase font-bold text-slate-500">{s.customerName}</td>
                          <td className="px-6 py-4 uppercase font-bold">{s.author}</td>
                          <td className="px-6 py-4 text-right font-black">{(s.total || 0).toLocaleString()} FC</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              <div className="pt-20 text-center space-y-2 opacity-50">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em]">Document généré par nexaPME Cloud - {new Date().toLocaleString()}</p>
                 <div className="flex justify-center items-center space-x-2"><CheckCircle2 size={12} className="text-emerald-500" /> <span className="text-[8px] font-bold uppercase tracking-widest">Validité Certifiée Cloud</span></div>
              </div>
           </div>
        </div>
      )}

      {printSale && config && <DocumentPrinter sale={printSale} config={config} onClose={() => setPrintSale(null)} />}
    </div>
  );
};

export default SalesHistory;
