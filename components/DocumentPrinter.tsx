
import React, { useState } from 'react';
import { Sale, CompanyConfig } from '../types';
import { Printer, FileText, X } from 'lucide-react';
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

  const qrData = `ID:${sale.id}|Total:${sale.total}|Date:${new Date(sale.date).toLocaleDateString()}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=1`;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col md:flex-row h-[90vh] relative">
        
        {/* Barre Latérale Options - Masquée à l'impression */}
        <div className="w-full md:w-80 bg-slate-900 text-white p-8 flex flex-col justify-between no-print shrink-0">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-slate-900"><Printer size={20} /></div>
              <h3 className="text-sm font-black uppercase tracking-widest">Édition Document</h3>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Format d'impression</p>
              <button 
                onClick={() => setPrintFormat('TICKET')}
                className={`w-full p-4 rounded-2xl flex items-center space-x-4 border-2 transition-all ${printFormat === 'TICKET' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
              >
                <Printer size={20} className={printFormat === 'TICKET' ? 'text-emerald-500' : 'text-slate-500'} />
                <div className="text-left">
                  <p className="text-xs font-black uppercase">Ticket Caisse</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">80mm Thermique</p>
                </div>
              </button>
              
              <button 
                onClick={() => setPrintFormat('A4')}
                className={`w-full p-4 rounded-2xl flex items-center space-x-4 border-2 transition-all ${printFormat === 'A4' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
              >
                <FileText size={20} className={printFormat === 'A4' ? 'text-blue-500' : 'text-slate-500'} />
                <div className="text-left">
                  <p className="text-xs font-black uppercase">Facture Pro</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Format A4 / PDF</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-8 border-t border-slate-800">
            <button 
              onClick={handlePrint} 
              className="w-full py-5 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center space-x-3"
            >
              <Printer size={20} />
              <span>Imprimer</span>
            </button>
            <button 
              onClick={onClose} 
              className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-white"
            >
              Fermer l'aperçu
            </button>
          </div>
        </div>

        {/* Zone de Prévisualisation */}
        <div className="flex-1 bg-slate-100 p-4 md:p-12 overflow-y-auto flex justify-center items-start no-scrollbar scroll-smooth">
          <div 
            id="printable-document" 
            className={`bg-white shadow-2xl transition-all duration-500 origin-top ${printFormat === 'TICKET' ? 'w-[320px] p-6' : 'w-full max-w-[800px] p-16'}`}
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Header */}
            <div className={`flex flex-col ${printFormat === 'A4' ? 'md:flex-row md:justify-between items-start mb-12' : 'items-center text-center mb-8'}`}>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">nexaPME Platform</p>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{config.name}</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{config.domain || 'Commerce'}</p>
                {config.address && <p className="text-[9px] font-bold text-slate-400 max-w-[200px] uppercase mt-2">{config.address}</p>}
                {config.phone && <p className="text-[9px] font-black text-slate-800 uppercase">Tél: {config.phone}</p>}
              </div>

              <div className={`${printFormat === 'A4' ? 'text-right' : 'mt-6 space-y-1'}`}>
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {sale.paymentType === 'CREDIT' ? 'Note de Crédit' : 'Facture Vente'}
                </h3>
                <p className="text-xs font-black text-slate-400 mt-1">N° {sale.id}</p>
                <p className="text-[10px] font-bold text-slate-800 uppercase mt-1">Date: {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>

            {/* Client Info (A4 Only) */}
            {printFormat === 'A4' && (
              <div className="flex justify-between py-10 border-t border-b border-slate-100 mb-10">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Émetteur</p>
                  <p className="text-xs font-black text-slate-800 uppercase">{config.owner}</p>
                  <p className="text-[10px] font-bold text-slate-500">{config.email || ''}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Client</p>
                  <p className="text-xs font-black text-slate-800 uppercase">{sale.customerName || 'Client Comptant'}</p>
                  <p className="text-[10px] font-bold text-slate-500">{sale.customerPhone || ''}</p>
                </div>
              </div>
            )}

            {/* Articles */}
            <table className="w-full text-left mb-10">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-3">Désignation</th>
                  <th className="py-3 text-center">Qté</th>
                  <th className="py-3 text-right">P.U</th>
                  <th className="py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, i) => (
                  <tr key={i} className="text-[11px] font-bold">
                    <td className="py-4 text-slate-800 uppercase leading-tight">{item.designation}</td>
                    <td className="py-4 text-center">{item.quantity}</td>
                    <td className="py-4 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-4 text-right font-black">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-10">
              <div className="flex flex-col items-center">
                <img src={qrUrl} alt="QR Code" className="w-24 h-24 mb-2" />
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Validation nexaCloud</p>
              </div>

              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Sous-total</span>
                  <span>{sale.subtotal.toLocaleString()} FC</span>
                </div>
                <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-end">
                   <span className="text-xs font-black uppercase tracking-widest">Total Net</span>
                   <div className="text-right">
                      <p className="text-2xl font-black text-slate-900 leading-none">{(sale.total || 0).toLocaleString()} FC</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">≈ {storageService.formatUSD(sale.total)}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-dashed border-slate-200 text-center">
              <p className="text-xs font-black text-slate-800 italic mb-4 uppercase tracking-tight">Merci de votre confiance !</p>
              <div className="flex flex-col items-center space-y-1">
                 <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.3em]">nexaPME v2.5 • Solution de Gestion Cloud Intégrée</p>
                 <p className="text-[7px] font-bold text-slate-300 uppercase">Signature Numérique : {sale.id.split('-')[1] || 'AUTH'}-SECURE-CLOUD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          /* Masquer TOUT le corps par défaut */
          body > * {
            display: none !important;
          }
          /* Afficher uniquement le document cible et forcer son style */
          #printable-document {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printFormat === 'TICKET' ? '80mm' : '210mm'} !important;
            margin: 0 !important;
            padding: ${printFormat === 'TICKET' ? '10mm' : '20mm'} !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-document * {
            visibility: visible !important;
            color: black !important;
            border-color: #e2e8f0 !important;
          }
          /* Forcer l'affichage du texte en noir pour les PDF */
          .text-emerald-600, .text-blue-600, .text-slate-900 {
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentPrinter;
