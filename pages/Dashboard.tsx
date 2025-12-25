import React, { useState, useMemo, useEffect } from 'react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis
} from 'recharts';
import { 
  ShoppingBag, Users, Package, Wallet, RefreshCw, DollarSign, 
  TrendingDown, TrendingUp, AlertCircle, Clock, Sparkles
} from 'lucide-react';
import { storageService } from '../services/StorageService';
import Branding from '../components/Branding';

const Dashboard: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const user = storageService.getCurrentUser();
  const isManager = user?.role === 'MANAGER';
  
  // Local state for dashboard data initialized from cache
  const [sales, setSales] = useState(storageService.getSales());
  const [credits, setCredits] = useState(storageService.getCredits());
  const [cashBalance, setCashBalance] = useState(storageService.getCashBalance());
  const [stock, setStock] = useState(storageService.getStock());

  const [rate, setRate] = useState(storageService.getExchangeRate());
  const [isEditingRate, setIsEditingRate] = useState(false);

  // Refresh dashboard data from API on component mount
  useEffect(() => {
    const refreshData = async () => {
      await Promise.all([
        storageService.fetchSales().then(setSales),
        storageService.fetchCredits().then(setCredits),
        storageService.fetchCashFlow().then(() => setCashBalance(storageService.getCashBalance())),
        storageService.fetchStock().then(setStock)
      ]);
    };
    refreshData();
  }, []);

  const totalCreditsPending = credits
    .filter(c => c.status === 'PENDING')
    .reduce((acc, c) => acc + c.remainingAmount, 0);

  const today = new Date().toISOString().split('T')[0];
  const salesToday = sales
    .filter(s => s.date.startsWith(today))
    .reduce((acc, s) => acc + s.total, 0);

  // Pour l'employé, on ne montre que ses ventes s'il n'est pas manager
  const mySalesToday = isManager 
    ? salesToday 
    : sales.filter(s => s.date.startsWith(today) && s.author === user?.name).reduce((acc, s) => acc + s.total, 0);

  const lowStockCount = stock.filter(item => item.quantity <= item.alertThreshold).length;
  const salesData = useMemo(() => storageService.getWeeklySalesData(), [sales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Branding companyName={config?.name || ''} category={isManager ? "Tableau de Bord Gérant" : "Espace Vendeur"} size="lg" variant="light" />
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Le taux n'est modifiable que par le manager */}
          <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 flex-1 md:flex-none">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={18} /></div>
            {isEditingRate && isManager ? (
              <input type="number" className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold" defaultValue={rate} onBlur={(e) => { storageService.updateExchangeRate(Number(e.target.value)); setRate(Number(e.target.value)); setIsEditingRate(false); }} autoFocus />
            ) : (
              <div className={isManager ? "cursor-pointer group" : ""} onClick={() => isManager && setIsEditingRate(true)}>
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Taux du jour</p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-slate-700">1$ = {rate.toLocaleString()} FC</span>
                  {isManager && <RefreshCw size={12} className="text-slate-300 group-hover:text-blue-500 transition-all" />}
                </div>
              </div>
            )}
          </div>

          {/* Seul le manager voit le solde total de la caisse */}
          {isManager && (
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center space-x-4 shadow-xl flex-1 md:flex-none">
              <Wallet className="text-emerald-400" size={28} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Disponible en Caisse</p>
                <div className="flex flex-col">
                  <p className="text-xl font-black leading-none">{storageService.formatFC(cashBalance)}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">{storageService.formatUSD(cashBalance)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Widgets Adaptatifs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{isManager ? "Recettes Totales du Jour" : "Mon Chiffre du Jour"}</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{storageService.formatFC(mySalesToday)}</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1 flex items-center space-x-1">
              <TrendingUp size={12} /> <span>Activité {isManager ? 'Globale' : 'Personnelle'}</span>
            </p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Alertes de Stock</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{lowStockCount} Articles</h3>
            <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 flex items-center space-x-1">
              <AlertCircle size={12} /> <span>Seuils critiques</span>
            </p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <Package size={24} />
          </div>
        </div>

        {isManager ? (
          <div className="bg-rose-500 p-6 rounded-[2.5rem] shadow-xl border border-rose-400 flex items-start justify-between text-white">
            <div>
              <p className="text-[10px] text-rose-200 font-black uppercase tracking-widest">Crédits en Attente</p>
              <h3 className="text-xl font-black mt-1">{storageService.formatFC(totalCreditsPending)}</h3>
              <p className="text-[10px] text-rose-100 font-bold uppercase mt-1 flex items-center space-x-1">
                <Users size={12} /> <span>{credits.filter(c => c.status === 'PENDING').length} Clients</span>
              </p>
            </div>
            <div className="p-4 bg-rose-400 rounded-2xl">
              <TrendingDown size={24} />
            </div>
          </div>
        ) : (
          <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl border border-blue-500 flex items-start justify-between text-white">
            <div>
              <p className="text-[10px] text-blue-100 font-black uppercase tracking-widest">Session Active</p>
              <h3 className="text-xl font-black mt-1 uppercase tracking-tighter">{user?.name}</h3>
              <p className="text-[10px] text-blue-200 font-bold uppercase mt-1 flex items-center space-x-1">
                <Clock size={12} /> <span>En ligne depuis {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </p>
            </div>
            <div className="p-4 bg-blue-500 rounded-2xl">
              <Users size={24} />
            </div>
          </div>
        )}
      </div>

      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tighter">Flux de Ventes Hebdo</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()} FC`, 'Total']} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center space-y-4">
             <div className="p-6 bg-emerald-50 text-emerald-600 rounded-full animate-bounce">
                <Sparkles size={40} />
             </div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Analyse nexaPME</h3>
             <p className="text-slate-500 text-sm max-w-xs font-medium">
                Utilisez l'assistant intelligent en bas à droite pour obtenir des conseils sur la gestion de votre stock et vos marges bénéficiaires.
             </p>
          </div>
        </div>
      )}

      {!isManager && (
        <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-10">
              <ShoppingBag size={120} />
           </div>
           <div className="relative z-10 space-y-4 max-w-xl">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Bienvenue sur votre poste, {user?.name}</h3>
              <p className="text-emerald-100 font-bold uppercase text-xs tracking-widest leading-relaxed">
                 Votre mission aujourd'hui est d'assurer un service client irréprochable et de veiller à la bonne saisie des ventes. En cas de doute sur un prix, consultez le menu "Gestion Stock".
              </p>
              <div className="pt-4">
                 <button className="px-8 py-3 bg-white text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em]">Bonne vente !</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
