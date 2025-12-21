
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { storageService } from '../services/StorageService';
import { 
  MessageSquare, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Bonjour ! Je suis l'assistant intelligent nexaPME. Comment puis-je vous aider dans la gestion de votre PME aujourd'hui ?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Préparation du contexte métier pour l'IA
      const stock = storageService.getStock();
      const cash = storageService.getCashBalance();
      const lowStockCount = stock.filter(i => i.quantity <= i.alertThreshold).length;
      const totalSalesToday = storageService.getSales()
        .filter(s => s.date.startsWith(new Date().toISOString().split('T')[0]))
        .reduce((acc, s) => acc + s.total, 0);

      const systemInstruction = `
        Tu es l'assistant IA de "nexaPME", une plateforme modulaire de gestion pour PME.
        Actuellement, l'utilisateur utilise le module "Gestion Alimentaire".
        Ton rôle est d'aider l'utilisateur à analyser ses données et à optimiser sa gestion.
        TU NE DOIS RÉPONDRE QU'À DES QUESTIONS LIÉES À L'ENTREPRISE, AU STOCK, AUX VENTES, À LA COMPTABILITÉ OU AU FONCTIONNEMENT DE L'APP.
        Si l'utilisateur pose une question hors sujet (politique, sport, divertissement, etc.), refuse poliment en disant que tu es un assistant de gestion commerciale spécialisé nexaPME.
        
        CONTEXTE RÉEL (Module Alimentaire) :
        - Caisse actuelle : ${storageService.formatFC(cash)}
        - Ventes aujourd'hui : ${storageService.formatFC(totalSalesToday)}
        - Articles en alerte de stock : ${lowStockCount}
        - Total produits référencés : ${stock.length}
        
        Sois professionnel, expert en gestion, concis et utilise un ton encourageant.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const botText = response.text || "Désolé, je rencontre une petite difficulté technique. Pouvez-vous reformuler ?";
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error("Chatbot Error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Erreur de connexion avec l'assistant. Vérifiez votre connexion internet." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] no-print">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[90vw] md:w-[400px] h-[500px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-slate-900">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight">IA nexaPME</h3>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-slate-400">Expert en ligne</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 rounded-tl-none flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                  <span className="text-xs font-bold text-slate-400">Analyse nexaPME en cours...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <input 
                type="text"
                placeholder="Questions sur votre stock, caisse, ventes..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold px-2 py-1 outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-slate-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[9px] text-center text-slate-400 font-bold mt-2 uppercase flex items-center justify-center space-x-1">
              <Sparkles size={10} className="text-emerald-500" />
              <span>Intelligence Artificielle nexaPME</span>
            </p>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-rose-500 rotate-90' : 'bg-slate-900'
        } text-white`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-50"></div>
        )}
      </button>
    </div>
  );
};

export default Chatbot;
