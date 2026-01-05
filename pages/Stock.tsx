
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/StorageService';
import { StockItem } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Search, Plus, Edit2, X, Save, Trash2,
  Loader2, RefreshCw, Filter, Layers, Scissors, ArrowRight
} from 'lucide-react';
import Branding from '../components/Branding';

const Stock: React.FC = () => {
  const config = storageService.getCompanyInfo();
  const currentUser = storageService.getCurrentUser();
  const isManager = currentUser?.role === 'MANAGER';

  const [stock, setStock] = useState<StockItem[]>(storageService.getStock());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransformModalOpen, setIsTransformModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<StockItem>>({});
  const [transformData, setTransformData] = useState({
    sourceId: '',
    sourceName: '',
    sourceItem: null as StockItem | null,
    factor: 50,
    quantityToTransform: 1,
    newDesignation: '',
    newUnit: 'kg',
    newPurchasePrice: 0,
    newRetailPrice: 0,
    newWholesalePrice: 0,
    newAlertThreshold: 10
  });

  // Recalcul automatique des prix quand le facteur change
  useEffect(() => {
    if (transformData.sourceItem && transformData.factor > 0) {
      const item = transformData.sourceItem;
      const f = transformData.factor;
      setTransformData(prev => ({
        ...prev,
        newPurchasePrice: Math.ceil(item.purchasePrice / f),
        newWholesalePrice: Math.ceil(item.wholesalePrice / f),
        newRetailPrice: Math.ceil(item.retailPrice / (f * 0.9)) // Un peu plus cher au détail
      }));
    }
  }, [transformData.factor, transformData.sourceItem]);

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

  const handleSave = async () => {
    if (!formData.designation) {
      alert("La désignation est obligatoire.");
      return;
    }
    
    setIsSaving(true);
    try {
      await storageService.saveStockItem({
        ...formData,
        isWholesale: formData.isWholesale ?? false,
      });
      setIsModalOpen(false);
    } catch (e: any) {
      alert("Erreur Cloud: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openTransformModal = (item: StockItem) => {
    setTransformData({
      sourceId: item.id,
      sourceName: item.designation,
      sourceItem: item,
      factor: 50,
      quantityToTransform: 1,
      newDesignation: `${item.designation} (DÉTAIL)`,
      newUnit: 'kg',
      newPurchasePrice: Math.ceil(item.purchasePrice / 50),
      newRetailPrice: Math.ceil(item.retailPrice / 45),
      newWholesalePrice: Math.ceil(item.wholesalePrice / 50),
      newAlertThreshold: 10
    });
    setIsTransformModalOpen(true);
  };

  const handleTransform = async () => {
    if (transformData.quantityToTransform <= 0 || transformData.factor <= 0) {
      alert("Veuillez entrer des valeurs valides.");
      return;
    }
    
    setIsSaving(true);
    try {
      const detailItem: Partial<StockItem> = {
        designation: transformData.newDesignation.trim(),
        category: transformData.sourceItem?.category || 'Alimentation',
        isWholesale: false,
        unit: transformData.newUnit,
        purchasePrice: transformData.newPurchasePrice,
        retailPrice: transformData.newRetailPrice,
        wholesalePrice: transformData.newWholesalePrice,
        alertThreshold: transformData.newAlertThreshold,
        quantity: 0 
      };

      await storageService.transformProduct(
        transformData.sourceId,
        detailItem,
        transformData.quantityToTransform,
        transformData.factor
      );

      setIsTransformModalOpen(false);
      alert("Transformation terminée ! Les données ont été rafraîchies.");
    } catch (e: any) {
      alert("Erreur de transformation : " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <Branding companyName={config?.name || ''} category="Inventaire & Transformation" size="lg" variant="light" />
        <div className="flex gap-2">
          <button onClick={loadStock} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-500 shadow-sm transition-all">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {isManager && (
            <button 
              onClick={() => { setFormData({ isWholesale: true, category: CATEGORIES[0], quantity: 0, retailPrice: 0, wholesalePrice: 0, purchasePrice: 0, alertThreshold: 5, unit: 'Sacs' }); setIsModalOpen(true); }} 
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center space-x-2 shadow-xl hover:bg-emerald-600 transition-all"
            >
              <Plus size={20} />
              <span className="hidden md:inline">Nouveau Produit</span>
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
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-5">Type</th>
              <th className="px-6 py-5">Désignation</th>
              <th className="px-6 py-5">Stock</th>
              <th className="px-6 py-5">P.V Détail</th>
              <th className="px-6 py-5">P.V Gros</th>
              <th className="px-6 py-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStock.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${item.isWholesale ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.isWholesale ? 'Gros' : 'Détail'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-black text-slate-800 text-xs uppercase leading-none">{item.designation}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{item.category} • {item.unit}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-black text-xs ${item.quantity <= (item.alertThreshold || 0) ? 'text-rose-600' : 'text-slate-700'}`}>
                    {item.quantity} {item.unit}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-xs text-blue-600">{(item.retailPrice || 0).toLocaleString()} FC</td>
                <td className="px-6 py-4 font-black text-xs text-emerald-600">{(item.wholesalePrice || 0).toLocaleString()} FC</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center space-x-2">
                    {item.isWholesale && isManager && (
                      <button onClick={() => openTransformModal(item)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all" title="Détailler cet article">
                        <Scissors size={16} />
                      </button>
                    )}
                    <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-slate-900 transition-all bg-slate-50 rounded-xl"><Edit2 size={16} /></button>
                    {isManager && (
                      <button onClick={() => { if(confirm("Supprimer définitivement ?")) { storageService.deleteStockItem(item.id!); } }} className="p-2 text-rose-300 hover:text-rose-600 transition-all bg-rose-50 rounded-xl"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Création/Edition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs">Fiche Produit</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setFormData({...formData, isWholesale: true})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isWholesale ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Article de Gros</button>
                <button onClick={() => setFormData({...formData, isWholesale: false})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.isWholesale ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Article de Détail</button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Désignation *</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold uppercase outline-none focus:border-slate-900" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Catégorie</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Stock Actuel ({formData.unit || 'unité'})</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.quantity ?? ''} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">P.A (Achat)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.purchasePrice ?? ''} onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase px-2">P.V Détail</label><input type="number" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-bold" value={formData.retailPrice ?? ''} onChange={(e) => setFormData({...formData, retailPrice: Number(e.target.value)})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-emerald-500 uppercase px-2">P.V Gros</label><input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-bold" value={formData.wholesalePrice ?? ''} onChange={(e) => setFormData({...formData, wholesalePrice: Number(e.target.value)})} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Seuil d'Alerte</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.alertThreshold ?? ''} onChange={(e) => setFormData({...formData, alertThreshold: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Unité</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.unit || ''} onChange={(e) => setFormData({...formData, unit: e.target.value})} placeholder="Sacs, kg, Carton..." />
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t">
              <button 
                disabled={isSaving}
                onClick={handleSave} 
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center space-x-2 ${formData.isWholesale ? 'bg-emerald-600' : 'bg-blue-600'} text-white hover:opacity-90 transition-all`}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{formData.id ? 'Mettre à jour' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transformation (Détaillage) */}
      {isTransformModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-8 bg-amber-500 text-white flex justify-between">
              <div className="flex items-center space-x-3">
                <Scissors size={24} />
                <h3 className="font-black uppercase tracking-widest text-xs">Transformation : Détaillage de stock</h3>
              </div>
              <button onClick={() => setIsTransformModalOpen(false)}><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase">Article Source (Gros)</p>
                  <p className="font-black text-slate-800 uppercase">{transformData.sourceName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-amber-600 uppercase">Quantité à transformer</p>
                  <div className="flex items-center space-x-2">
                    <input type="number" className="w-20 bg-white border border-amber-200 rounded-lg p-2 text-center font-black" value={transformData.quantityToTransform} onChange={e => setTransformData({...transformData, quantityToTransform: Number(e.target.value)})} />
                    <span className="font-bold text-xs uppercase">{transformData.sourceItem?.unit}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowRight className="text-amber-500 animate-pulse" size={32} />
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b pb-2">Configuration de l'article détaillé</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Désignation Détail</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" value={transformData.newDesignation} onChange={e => setTransformData({...transformData, newDesignation: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Facteur (x)</label>
                      <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={transformData.factor} onChange={e => setTransformData({...transformData, factor: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Unité Détail</label>
                      <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={transformData.newUnit} onChange={e => setTransformData({...transformData, newUnit: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">P.A (Calculé)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={transformData.newPurchasePrice} onChange={e => setTransformData({...transformData, newPurchasePrice: Number(e.target.value)})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase px-2">P.V Détail</label><input type="number" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-bold" value={transformData.newRetailPrice} onChange={e => setTransformData({...transformData, newRetailPrice: Number(e.target.value)})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-emerald-500 uppercase px-2">P.V Gros</label><input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-bold" value={transformData.newWholesalePrice} onChange={e => setTransformData({...transformData, newWholesalePrice: Number(e.target.value)})} /></div>
                </div>
              </div>

              <div className="p-5 bg-blue-50 rounded-[2rem] text-center border-2 border-blue-100 border-dashed">
                <p className="text-xs font-black text-blue-900 uppercase">
                  Résultat : {transformData.quantityToTransform * transformData.factor} {transformData.newUnit} ajoutés au stock de détail.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setIsTransformModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase text-slate-400 hover:bg-slate-100 transition-all">Annuler</button>
              <button 
                onClick={handleTransform}
                disabled={isSaving}
                className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center space-x-2 hover:bg-amber-500 transition-all"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Scissors size={18} />}
                <span>Confirmer le détaillage</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
