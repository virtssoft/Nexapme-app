
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Search, Plus, Edit2, X, Save, 
  Loader2, Layers, ArrowRight, RefreshCw
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

  // Transformation State
  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [transformSource, setTransformSource] = useState<StockItem | null>(null);
  const [transformQty, setTransformQty] = useState(1);
  const [transformTargetId, setTransformTargetId] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);

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

  const handleTransform = async () => {
    if (!transformSource || !transformTargetId || transformQty <= 0) return;
    setIsTransforming(true);
    try {
      await storageService.transformProduct(transformSource.id, transformTargetId, transformQty);
      await loadStock();
      setIsTransformOpen(false);
      setTransformSource(null);
      setTransformQty(1);
      setTransformTargetId('');
    } catch (e: any) {
      alert("Erreur de transformation : " + e.message);
    } finally {
      setIsTransforming(false);
    }
  };

  const filteredStock = useMemo(() => {
    return stock.filter(item => 
      item.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stock, searchTerm]);

  const retailItems = useMemo(() => stock.filter(i => !i.isWholesale), [stock]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <Branding companyName={config?.name || ''} category="Inventaire Cloud" size="lg" variant="light" />
        <div className="flex gap-2">
          <button onClick={loadStock} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-500 shadow-sm">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {isManager && (
            <button onClick={() => { setFormData({ category: CATEGORIES[0], quantity: 0, retailPrice: 0 }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center space-x-2">
              <Plus size={20} />
              <span className="hidden md:inline">Nouveau Produit</span>
            </button>
          )}
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
        <Search size={20} className="text-slate-400" />
        <input type="text" placeholder="Rechercher un produit..." className="flex-1 outline-none font-bold text-sm bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-black uppercase text-xs tracking-widest">Synchronisation Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStock.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="flex justify-between mb-4">
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.isWholesale ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                   {item.isWholesale ? 'Gros' : 'Détail'}
                 </span>
                 <p className={`text-xs font-black ${item.quantity <= item.alertThreshold ? 'text-rose-500' : 'text-slate-800'}`}>
                   {item.quantity} {item.unit}
                 </p>
               </div>
               <h3 className="font-black text-slate-800 text-sm mb-4 leading-tight min-h-[40px]">{item.designation}</h3>
               <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xl font-black text-slate-900">{storageService.formatFC(item.retailPrice)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                  </div>
                  <div className="flex space-x-1">
                    {item.isWholesale && isManager && (
                      <button 
                        onClick={() => { setTransformSource(item); setIsTransformOpen(true); }}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Transformer en Détail"
                      >
                        <Layers size={18} />
                      </button>
                    )}
                    <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Transformation Gros -> Détail */}
      {isTransformOpen && transformSource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Layers className="text-emerald-400" size={24} />
                <h3 className="text-sm font-black uppercase tracking-widest">Transformation</h3>
              </div>
              <button onClick={() => setIsTransformOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center space-x-4">
                <div className="flex-1">
                   <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Source (Gros)</p>
                   <p className="font-black text-slate-800 text-xs">{transformSource.designation}</p>
                   <p className="text-[10px] text-slate-500 font-bold">Disponible: {transformSource.quantity} units</p>
                </div>
                <ArrowRight className="text-emerald-400" />
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Cible (Détail)</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500"
                    value={transformTargetId}
                    onChange={(e) => setTransformTargetId(e.target.value)}
                  >
                    <option value="">Sélectionner l'article de détail...</option>
                    {retailItems.map(ri => <option key={ri.id} value={ri.id}>{ri.designation}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Quantité à transformer (Gros)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={transformSource.quantity}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none"
                    value={transformQty}
                    onChange={(e) => setTransformQty(Number(e.target.value))}
                  />
                </div>
              </div>

              <button 
                onClick={handleTransform} 
                disabled={isTransforming || !transformTargetId}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center disabled:opacity-50"
              >
                {isTransforming ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                Valider la Transformation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiche Produit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-[3rem] w-full max-w-xl max-h-screen md:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between shrink-0">
              <h3 className="font-black uppercase tracking-widest text-xs">Fiche Produit Cloud</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Désignation du produit</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Quantité</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.quantity ?? ''} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Unité (sac, kg, pcs)</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.unit || ''} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Prix Vente (FC)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.retailPrice ?? ''} onChange={(e) => setFormData({...formData, retailPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Type Stock</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none"
                    value={formData.isWholesale ? "1" : "0"}
                    onChange={(e) => setFormData({...formData, isWholesale: e.target.value === "1"})}
                  >
                    <option value="0">Détail</option>
                    <option value="1">Gros</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Catégorie</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t shrink-0">
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
