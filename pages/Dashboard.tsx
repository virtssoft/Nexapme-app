
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis
} from 'recharts';
import { 
  ShoppingBag, Package, Wallet, RefreshCw, DollarSign, 
  TrendingUp, Loader2, User
} from 'lucide-react';
import { storageService } from '../services/StorageService';
import Branding from '../components/Branding';

const Dashboard: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const user = storageService.getCurrentUser();
  const isManager = user?.role === 'MANAGER';
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rate, setRate] = useState(storageService.getExchangeRate());

  const [localData, setLocalData] = useState({
    stock: storageService.getStock(),
    sales: storageService.getSales(),
    cashFlow: storageService.getCashFlow()
  });

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        storageService.fetchStock(),
        storageService.fetchSales(),
        storageService.fetchCashLedger(),
        storageService.fetchCompanyConfigRemote() // Assure que le taux de change est à jour
      ]);
    } catch (e) {
      console.error("Erreur synchro Dashboard", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => {
      setLocalData({
        stock: storageService.getStock(),
        sales: storageService.getSales(),
        cashFlow: storageService.getCashFlow()
      });
      setRate(storageService.getExchangeRate());
    };
    window.addEventListener('nexa_data_updated', handleUpdate);
    return () => window.removeEventListener('nexa_data_updated', handleUpdate);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filtrage strict : Le vendeur ne voit que SES ventes
    const filteredSales = isManager 
      ? localData.sales 
      : localData.sales.filter(s => String(s.authorId) === String(user?.id));

    const todaySales = filteredSales
      .filter(s => s.date.startsWith(today))
      .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
      
    const stockAlerts = localData.stock
      .filter(item => item.quantity <= item.alertThreshold)
      .length;
      
    const cashBalance = storageService.getCashBalance();

    const perWorkerSales: Record<string, number> = {};
    if (isManager) {
      localData.sales
        .filter(s => s.date.startsWith(today))
        .forEach(s => {
          const name = s.author || 'Inconnu';
          perWorkerSales[name] = (perWorkerSales[name] || 0) + s.total;
        });
    }

    return { todaySales, stockAlerts, cashBalance, perWorkerSales };
  }, [localData, user, isManager]);

  const salesData = useMemo(() => storageService.getWeeklySalesData(), [localData.sales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Branding companyName={config?.name || 'nexaPME'} category={isManager ? "Tableau de Bord Gérant" : "Mes Performances du Jour"} size="lg" variant="light" />
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button onClick={refreshData} disabled={isRefreshing} className={`p-3 bg-white border border-slate-200 rounded-2xl transition-all shadow-sm flex items-center justify-center ${isRefreshing ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}>
            {isRefreshing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>

          <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 flex-1 md:flex-none">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={18} /></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Taux Fixé</p>
              <span className="text-sm font-black text-slate-700">1$ = {(rate || 2850).toLocaleString()} FC</span>
            </div>
          </div>

          {isManager && (
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center space-x-4 shadow-xl flex-1 md:flex-none">
              <Wallet className="text-emerald-400" size={28} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Caisse Globale</p>
                <p className="text-xl font-black leading-none">{storageService.formatFC(stats.cashBalance)}</p>
                <p className="text-[10px] font-bold text-emerald-400 mt-1 uppercase">≈ {storageService.formatUSD(stats.cashBalance)}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between text-left">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-2">{isManager ? "Recettes Globales (Jour)" : "Mes Recettes (Jour)"}</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{storageService.formatFC(stats.todaySales)}</h3>
            <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1 flex items-center space-x-1">
              <TrendingUp size={12} /> <span>Conversion: {storageService.formatUSD(stats.todaySales)}</span>
            </p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><ShoppingBag size={24} /></div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between text-left">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-2">Articles en Alerte</p>
            <h3 className={`text-xl font-black mt-1 ${stats.stockAlerts > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.stockAlerts} Références</h3>
          </div>
          <div className={`p-4 rounded-2xl ${stats.stockAlerts > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}><Package size={24} /></div>
        </div>

        <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl border border-blue-500 flex items-start justify-between text-white text-left">
          <div>
            <p className="text-[10px] text-blue-100 font-black uppercase tracking-widest leading-none mb-2">Session Active</p>
            <h3 className="text-xl font-black mt-1 uppercase truncate">{user?.name}</h3>
          </div>
          <div className="p-4 bg-blue-500 rounded-2xl"><User size={24} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tighter text-left">Activité hebdomadaire</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${(Number(value) || 0).toLocaleString()} FC`, 'Chiffre d\'affaires']} 
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={0.1} fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isManager && (
          <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest text-left">Classement Vendeurs</h3>
            <div className="space-y-4">
              {Object.entries(stats.perWorkerSales).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm"><User size={16} className="text-slate-400" /></div>
                    <span className="font-black text-slate-700 text-xs uppercase">{name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600 text-xs">{storageService.formatFC(amount)}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{storageService.formatUSD(amount)}</p>
                  </div>
                </div>
              ))}
              {Object.keys(stats.perWorkerSales).length === 0 && (
                <p className="text-center py-10 text-[10px] text-slate-300 font-bold uppercase tracking-widest">Aucune vente ce jour</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
