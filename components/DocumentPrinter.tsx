
import React, { useState } from 'react';
import { Sale, CompanyConfig } from '../types';
import { Printer, FileText, X, Download, Share2 } from 'lucide-react';
import { storageService } from '../services/StorageService';

interface DocumentPrinterProps {
  sale: Sale;
  config: CompanyConfig;
  onClose: () => void;
}

const DocumentPrinter: React.FC<DocumentPrinterProps> = ({ sale, config, onClose }) => {
  const [printFormat, setPrintFormat] = useState<'TICKET' | 'A4'>('TICKET');

  const handlePrint = () => {
    window.print();
  };

  // Génération du QR Code contenant l'ID et le Total pour traçabilité
  const qrData = `ID:${sale.id}|Total:${sale.total}|Date:${new Date(sale.date).toLocaleDateString()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=1`;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col md:flex-row h-[90vh]">
        
        {/* Barre Latérale Options */}
        <div className="w-full md:w-80 bg-slate-900 text-white p-8 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-slate-900"><Printer size={20} /></div>
              <h3 className="text-sm font-black uppercase tracking-widest">Édition Document</h3>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Format de sortie</p>
              <button 
                onClick={() => setPrintFormat('TICKET')}
                className={`w-full p-4 rounded-2xl flex items-center space-x-4 border-2 transition-all ${printFormat === 'TICKET' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
              >
                <Printer size={20} className={printFormat === 'TICKET' ? 'text-emerald-500' : 'text-slate-500'} />
                <div className="text-left">
                  <p className="text-xs font-black uppercase">Ticket de Caisse</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Thermique 80mm</p>
                </div>
              </button>
              <button 
                onClick={() => setPrintFormat('A4')}
                className={`w-full p-4 rounded-2xl flex items-center space-x-4 border-2 transition-all ${printFormat === 'A4' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
              >
                <FileText size={20} className={printFormat === 'A4' ? 'text-blue-500' : 'text-slate-500'} />
                <div className="text-left">
                  <p className="text-xs font-black uppercase">Facture Pro</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Format A4 PDF</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={handlePrint} className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center space-x-2">
              <Printer size={18} />
              <span>Imprimer</span>
            </button>
            <button onClick={onClose} className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all">Fermer</button>
          </div>
        </div>

        {/* Zone de Prévisualisation */}
        <div className="flex-1 bg-slate-100 p-4 md:p-8 overflow-y-auto no-scrollbar flex justify-center items-start">
          
          <div 
            id="printable-document" 
            className={`bg-white shadow-2xl transition-all duration-300 ${printFormat === 'TICKET' ? 'w-[300px] p-6' : 'w-full max-w-[800px] min-h-[1000px] p-12'}`}
            style={{ fontFamily: "'Inter', sans-serif", color: '#1e293b' }}
          >
            {/* Header Document */}
            <div className={`flex flex-col ${printFormat === 'A4' ? 'md:flex-row md:justify-between items-start mb-12' : 'items-center text-center mb-6'}`}>
              <div className="space-y-1 text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">nexaPME</p>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{config.name}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{config.subDomain || 'Commerce'}</p>
                {config.taxId && <p className="text-[9px] font-bold text-slate-400 mt-2">NIF: {config.taxId}</p>}
              </div>
              
              <div className={`${printFormat === 'A4' ? 'text-right mt-0' : 'mt-4 space-y-1'}`}>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Document</p>
                <h3 className="text-lg font-black uppercase leading-none">
                  {sale.paymentType === 'CREDIT' ? 'Note de Débit' : (printFormat === 'A4' ? 'Facture' : 'Ticket')}
                </h3>
                <p className="text-xs font-bold text-slate-800">#{sale.id}</p>
                <p className="text-[10px] text-slate-500 font-bold">{new Date(sale.date).toLocaleDateString()} - {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>

            {/* Coordonnées (A4 Uniquement) */}
            {printFormat === 'A4' && (
              <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-slate-100 py-8">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Émetteur</p>
                  <p className="text-xs font-bold leading-relaxed">
                    {config.address || 'Adresse non spécifiée'}<br />
                    Tél: {config.phone || '-'}<br />
                    {config.email || ''}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Client</p>
                  <p className="text-xs font-black uppercase">{sale.customerName || 'Client Comptant'}</p>
                  <p className="text-xs text-slate-500">
                    {sale.customerAddress || ''}<br />
                    {sale.customerPhone || ''}
                  </p>
                </div>
              </div>
            )}

            {/* Table des articles */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-2 text-left">Désignation</th>
                  <th className="py-2 text-center">Qté</th>
                  {printFormat === 'A4' && <th className="py-2 text-right">P.U.</th>}
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="text-xs font-bold">
                    <td className="py-3 text-slate-800">{item.designation}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    {printFormat === 'A4' && <td className="py-3 text-right">{item.unitPrice.toLocaleString()}</td>}
                    <td className="py-3 text-right font-black">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux & Footer */}
            <div className={`flex ${printFormat === 'A4' ? 'justify-between' : 'justify-end'} items-start`}>
              {/* QR Code pour A4 (côté gauche) */}
              {printFormat === 'A4' && (
                <div className="flex flex-col items-center">
                   <img src={qrUrl} alt="QR Code" className="w-24 h-24 mb-2 p-1 border border-slate-100 rounded-lg" />
                   <p className="text-[7px] font-black text-slate-400 uppercase text-center max-w-[100px]">Validation de l'authenticité nexaPME</p>
                </div>
              )}

              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Sous-total HT</span>
                  <span>{sale.subtotal.toLocaleString()} FC</span>
                </div>
                <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase">Total Net TTC</span>
                  <div className="text-right">
                    <p className="text-xl font-black leading-none">{sale.total.toLocaleString()} FC</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Soit {storageService.formatUSD(sale.total)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code pour Ticket (Centré) */}
            {printFormat === 'TICKET' && (
              <div className="mt-8 flex flex-col items-center border-t border-dashed border-slate-200 pt-6">
                <img src={qrUrl} alt="QR de Traçabilité" className="w-24 h-24 mb-2" />
                <p className="text-[8px] font-black text-slate-400 uppercase">Scanner pour vérifier la vente</p>
              </div>
            )}

            {/* Footer Légal & Banque */}
            <div className={`mt-8 pt-8 border-t border-slate-100 ${printFormat === 'TICKET' ? 'text-center' : ''}`}>
              {printFormat === 'A4' && config.bankDetails && (
                <div className="mb-8 p-4 bg-slate-50 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Instructions de paiement</p>
                  <p className="text-[10px] font-bold text-slate-600 font-mono">{config.bankDetails}</p>
                </div>
              )}
              
              <p className="text-xs font-black uppercase text-slate-800 italic mb-2">
                {config.receiptFooter || 'Merci de votre confiance !'}
              </p>
              
              <div className="space-y-1 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                <p>Logiciel de gestion nexaPME v2.5</p>
                <p>Traçabilité ID: {sale.id}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-document, #printable-document * { visibility: visible; }
          #printable-document {
            position: fixed;
            left: 0;
            top: 0;
            width: ${printFormat === 'TICKET' ? '80mm' : '210mm'};
            margin: 0;
            padding: ${printFormat === 'TICKET' ? '5mm' : '20mm'};
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default DocumentPrinter;
