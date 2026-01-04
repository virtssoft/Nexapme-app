
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Search, Plus, Edit2, X, Save, Trash2,
  Loader2, RefreshCw, AlertCircle, Filter
} from 'lucide-react';
import Branding from '../components/Branding';

const Stock: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const currentUser = storageService.getCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';

  const [stock, setStock] = useState<StockItem[]>(storageService.getStock());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<StockItem>>({});

  useEffect(() => {
    loadStock();
    const handleUpdate = () => setStock(storageService.getStock());
    window.addEventListener('nexa_data_updated', handleUpdate);
    return () => window.removeEventListener('nexa_data_updated', handleUpdate);
  }, []);

  const loadStock = async () => {
    setIsLoading(true);
    await storageService.fetchStock();
    setIsLoading(false);
  };

  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const matchesSearch = (item.designation || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Tous' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [stock, searchTerm, categoryFilter]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <Branding companyName={config?.name || ''} category="Inventaire Produits" size="lg" variant="light" />
        <div className="flex gap-2">
          <button onClick={loadStock} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-500 shadow-sm transition-all">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {isManager && (
            <button 
              onClick={() => { setFormData({ category: CATEGORIES[0], quantity: 0, retailPrice: 0, wholesalePrice: 0, purchasePrice: 0, alertThreshold: 5, unit: 'pcs' }); setIsModalOpen(true); }} 
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center space-x-2 shadow-xl hover:bg-emerald-600 transition-all"
            >
              <Plus size={20} />
              <span className="hidden md:inline">Ajouter Produit</span>
            </button>
          )}
        </div>
      </header>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center space-x-3 px-4 py-1">
          <Search size={20} className="text-slate-400" />
          <input type="text" placeholder="Rechercher par nom..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center space-x-3 border-l pl-4">
           <Filter size={18} className="text-slate-400" />
           <select 
             className="bg-transparent font-bold text-xs uppercase outline-none"
             value={categoryFilter}
             onChange={(e) => setCategoryFilter(e.target.value)}
           >
             <option value="Tous">Toutes Catégories</option>
             {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-5">Désignation</th>
              <th className="px-6 py-5">Catégorie</th>
              <th className="px-6 py-5">Stock Actuel</th>
              <th className="px-6 py-5">Unité</th>
              <th className="px-6 py-5">P.V Détail</th>
              <th className="px-6 py-5">P.V Gros</th>
              <th className="px-6 py-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStock.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-black text-slate-800 text-xs uppercase">{item.designation}</td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{item.category}</td>
                <td className="px-6 py-4">
                  <span className={`font-black text-xs ${item.quantity <= (item.alertThreshold || 0) ? 'text-rose-600' : 'text-slate-700'}`}>
                    {item.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold uppercase">{item.unit}</td>
                <td className="px-6 py-4 font-black text-xs text-blue-600">{(item.retailPrice || 0).toLocaleString()} FC</td>
                <td className="px-6 py-4 font-black text-xs text-emerald-600">{(item.wholesalePrice || 0).toLocaleString()} FC</td>
                <td className="px-6 py-4 text-center flex justify-center space-x-2">
                  <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-slate-900 transition-all bg-slate-50 rounded-xl"><Edit2 size={16} /></button>
                  {isManager && (
                    <button onClick={() => { if(confirm("Supprimer ?")) { storageService.deleteStockItem(item.id!); } }} className="p-2 text-rose-300 hover:text-rose-600 transition-all bg-rose-50 rounded-xl"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStock.length === 0 && (
          <div className="py-20 text-center text-slate-300 uppercase font-black text-xs tracking-widest">Aucun produit</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs">Fiche Produit</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Désignation *</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold uppercase outline-none focus:border-emerald-500" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Catégorie</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Quantité</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.quantity ?? ''} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">P.A (Achat)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.purchasePrice ?? ''} onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase px-2">P.V Détail</label><input type="number" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-bold" value={formData.retailPrice ?? ''} onChange={(e) => setFormData({...formData, retailPrice: Number(e.target.value)})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-emerald-500 uppercase px-2">P.V Gros</label><input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-bold" value={formData.wholesalePrice ?? ''} onChange={(e) => setFormData({...formData, wholesalePrice: Number(e.target.value)})} /></div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => { storageService.saveStockItem(formData); setIsModalOpen(false); }} className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700">Enregistrer Produit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
