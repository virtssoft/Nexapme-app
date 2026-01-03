
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Search, Plus, Edit2, X, Save, Trash2,
  Loader2, Layers, ArrowRight, RefreshCw, AlertCircle, Banknote, Tag, ArrowDown
} from 'lucide-react';
import Branding from '../components/Branding';

const Stock: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const currentUser = storageService.getCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';

  const [stock, setStock] = useState<StockItem[]>(storageService.getStock());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<StockItem>>({});

  // Transformation states
  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [transformSource, setTransformSource] = useState<StockItem | null>(null);
  const [transformQty, setTransformQty] = useState(1);
  const [transformFactor, setTransformFactor] = useState(50);
  const [transformTargetId, setTransformTargetId] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);

  useEffect(() => {
    // Premier chargement depuis le cache
    setStock(storageService.getStock());
    
    // Synchro Cloud au montage
    loadStock();

    // Écouteur pour les mises à jour réactives
    const handleUpdate = () => {
      setStock(storageService.getStock());
    };
    window.addEventListener('nexa_data_updated', handleUpdate);
    return () => window.removeEventListener('nexa_data_updated', handleUpdate);
  }, []);

  const loadStock = async () => {
    setIsLoading(true);
    await storageService.fetchStock();
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.designation) return;
    // On ferme le modal immédiatement car la mise à jour est déjà gérée localement par StorageService
    setIsModalOpen(false);
    try {
      await storageService.saveStockItem(formData);
    } catch (e: any) {
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  };

  const handleDelete = async () => {
    if (!formData.id || !isManager) return;
    if (!confirm(`Voulez-vous vraiment supprimer définitivement "${formData.designation}" ?`)) return;
    
    setIsModalOpen(false);
    try {
      await storageService.deleteStockItem(formData.id);
    } catch (e: any) {
      alert("Erreur lors de la suppression : " + e.message);
    }
  };

  const handleTransform = async () => {
    if (!transformSource || !transformTargetId || transformQty <= 0 || transformFactor <= 0) return;
    setIsTransforming(true);
    try {
      await storageService.transformProduct(transformSource.id, transformTargetId, transformQty, transformFactor);
      setIsTransformOpen(false);
      setTransformSource(null);
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
          <button onClick={loadStock} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-500 shadow-sm transition-all">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {isManager && (
            <button 
              onClick={() => { setFormData({ category: CATEGORIES[0], quantity: 0, retailPrice: 0, wholesalePrice: 0, purchasePrice: 0, alertThreshold: 5, unit: 'pcs' }); setIsModalOpen(true); }} 
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center space-x-2 shadow-xl hover:bg-emerald-600 transition-all"
            >
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStock.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
             <div className="flex justify-between mb-4">
               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.isWholesale ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                 {item.isWholesale ? 'Gros' : 'Détail'}
               </span>
               <p className={`text-xs font-black flex items-center gap-1 ${item.quantity <= item.alertThreshold ? 'text-rose-500' : 'text-slate-800'}`}>
                 {item.quantity <= item.alertThreshold && <AlertCircle size={12} />}
                 {item.quantity} {item.unit}
               </p>
             </div>
             <h3 className="font-black text-slate-800 text-sm mb-4 leading-tight min-h-[40px] uppercase">{item.designation}</h3>
             
             <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prix Détail</span>
                  <span className="text-sm font-black text-blue-600">{storageService.formatFC(item.retailPrice)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-emerald-50/50 rounded-xl">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Prix Gros</span>
                  <span className="text-sm font-black text-emerald-700">{storageService.formatFC(item.wholesalePrice)}</span>
                </div>
             </div>

             <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                <div className="flex space-x-1">
                  {item.isWholesale && isManager && (
                    <button 
                      onClick={() => { setTransformSource(item); setIsTransformOpen(true); }}
                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Désaler Gros vers Détail"
                    >
                      <Layers size={18} />
                    </button>
                  )}
                  <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-all"><Edit2 size={18} /></button>
                </div>
             </div>
          </div>
        ))}
        {!isLoading && filteredStock.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 uppercase font-black text-xs tracking-widest">Aucun article dans cette liste</div>
        )}
      </div>

      {/* Modal CRUD Produit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-[3rem] w-full max-w-2xl max-h-screen md:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between shrink-0">
              <h3 className="font-black uppercase tracking-widest text-xs">Fiche Produit Cloud Nexa</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Désignation du produit *</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none uppercase focus:border-emerald-500" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Catégorie</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Type Stock Principal</label>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Quantité</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.quantity ?? ''} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Unité</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.unit || ''} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-400 uppercase px-2">Alerte Stock</label>
                  <input type="number" className="w-full p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl font-bold outline-none text-rose-700" value={formData.alertThreshold ?? ''} onChange={(e) => setFormData({...formData, alertThreshold: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Prix Achat (FC)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" value={formData.purchasePrice ?? ''} onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-500 uppercase px-2">Vente Détail (FC)</label>
                  <input type="number" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black outline-none text-blue-700" value={formData.retailPrice ?? ''} onChange={(e) => setFormData({...formData, retailPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-500 uppercase px-2">Vente Gros (FC)</label>
                  <input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black outline-none text-emerald-700" value={formData.wholesalePrice ?? ''} onChange={(e) => setFormData({...formData, wholesalePrice: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t shrink-0 flex gap-4">
              {formData.id && isManager && (
                <button onClick={handleDelete} disabled={isLoading} className="px-6 py-5 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase hover:bg-rose-100 transition-all flex items-center justify-center">
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={handleSave} disabled={isLoading} className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all hover:bg-emerald-700 disabled:opacity-50">
                {formData.id ? 'Mettre à jour Cloud' : 'Enregistrer sur le Serveur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transformation Nexa - GROS vers DÉTAIL */}
      {isTransformOpen && transformSource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">Transformation de Stock</h3>
              <button onClick={() => setIsTransformOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">DE (GROS)</p>
                    <p className="font-black text-slate-800 text-xs truncate">{transformSource.designation}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{transformSource.quantity} {transformSource.unit} dispos</p>
                </div>
                <ArrowRight className="text-slate-300" />
                <div className="flex-1 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase mb-1">VERS (DÉTAIL)</p>
                    <p className="font-black text-slate-800 text-xs truncate">
                      {transformTargetId ? retailItems.find(i => i.id === transformTargetId)?.designation : 'Choisir article...'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Cible détail</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">1. Sélectionner l'article de détail cible</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500" 
                    value={transformTargetId} 
                    onChange={(e) => setTransformTargetId(e.target.value)}
                  >
                    <option value="">Sélectionner dans le stock détail...</option>
                    {retailItems.map(ri => <option key={ri.id} value={ri.id}>{ri.designation} ({ri.unit})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2">2. Qté de gros à casser</label>
                    <input 
                        type="number" 
                        min="1" 
                        max={transformSource.quantity} 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-emerald-500" 
                        value={transformQty} 
                        onChange={(e) => setTransformQty(Number(e.target.value))} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2">3. Facteur (1 {transformSource.unit} = X {transformTargetId ? retailItems.find(i => i.id === transformTargetId)?.unit : '?'})</label>
                    <input 
                        type="number" 
                        min="1" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-emerald-500" 
                        value={transformFactor} 
                        onChange={(e) => setTransformFactor(Number(e.target.value))} 
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleTransform} 
                disabled={isTransforming || !transformTargetId || transformQty <= 0 || transformFactor <= 0} 
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center disabled:opacity-50 transition-all hover:bg-emerald-700"
              >
                {isTransforming ? <Loader2 className="animate-spin mr-2" /> : <Layers className="mr-2" />}
                Lancer la Transformation Cloud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
