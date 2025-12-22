
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Search, Plus, Edit2, X, Save, 
  Loader2
} from 'lucide-react';
import Branding from '../components/Branding';

const Stock: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const currentUser = storageService.getCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';

  const [stock, setStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<StockItem>>({});

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    setIsLoading(true);
    const data = await storageService.fetchStock();
    setStock(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.designation) return;
    setIsLoading(true);
    try {
      await storageService.saveStockItem(formData);
      await loadStock();
      setIsModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStock = useMemo(() => {
    return stock.filter(item => 
      item.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stock, searchTerm]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <Branding companyName={config?.name || ''} category="Inventaire Cloud" size="lg" variant="light" />
        {isManager && (
          <button onClick={() => { setFormData({ category: CATEGORIES[0], quantity: 0, retailPrice: 0 }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center space-x-2">
            <Plus size={20} />
            <span>Nouveau Produit</span>
          </button>
        )}
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input type="text" placeholder="Rechercher..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-black uppercase text-xs tracking-widest">Synchronisation avec la base de données...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStock.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <div className="flex justify-between mb-4">
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.isWholesale ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                   {item.isWholesale ? 'Gros' : 'Détail'}
                 </span>
                 <p className="text-xs font-black text-slate-800">{item.quantity} {item.unit}</p>
               </div>
               <h3 className="font-black text-slate-800 text-sm mb-4 leading-tight">{item.designation}</h3>
               <div className="flex justify-between items-end">
                  <p className="text-xl font-black text-slate-900">{storageService.formatFC(item.retailPrice)}</p>
                  <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
               </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs">Fiche Produit (DB)</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <input type="text" placeholder="Désignation" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Quantité" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.quantity || ''} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                <input type="number" placeholder="Prix Vente" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.retailPrice || ''} onChange={(e) => setFormData({...formData, retailPrice: Number(e.target.value)})} />
              </div>
              <button onClick={handleSave} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center">
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                Enregistrer en Base de Données
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
