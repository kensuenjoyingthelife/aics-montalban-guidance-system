import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Sparkles,
  Bot,
  HelpCircle,
  ShieldAlert,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { askGuidanceCopilot, CopilotMessage } from '../services/guidanceCopilotService';

export const GuidanceChatHead: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Magandang araw! Ako ang AICS Guidance Copilot. Handa akong sumagot sa mga tanong kung paano gamitin ang system (paano gumawa ng case, mag-approve, o mag-print ng reports). Walang access ang AI sa personal data ng mga mag-aaral alinsunod sa RA 10173. Paano kita matutulungan?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await askGuidanceCopilot(query, messages);
      const botMsg: CopilotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errBotMsg: CopilotMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Paumanhin, nagkaroon ng pansamantalang aberya sa koneksyon. Pakisubukan muling magtanong.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errBotMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (text: string) => {
    setInput(text);
  };

  return (
    <aside
      role="complementary"
      aria-label="AICS Guidance Copilot"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none select-none"
    >
      {/* Expanded Messenger Window */}
      {isOpen && !isMinimized && (
        <div
          role="dialog"
          aria-label="Guidance Assistant Chat Window"
          className="pointer-events-auto w-[92vw] sm:w-[380px] h-[520px] max-h-[82vh] mb-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between border-b border-blue-600/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight truncate leading-tight flex items-center gap-1.5">
                  AICS Guidance Copilot
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded-full">
                    SOP AI
                  </span>
                </h2>
                <p className="text-[11px] text-blue-100/90 truncate flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>Privacy Protected · System Guide</span>
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="w-7 h-7 rounded-lg hover:bg-white/15 active:scale-95 transition-transform flex items-center justify-center text-white/90"
                title="Minimize chat"
                aria-label="Minimize chat window"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/15 active:scale-95 transition-transform flex items-center justify-center text-white/90"
                title="Close chat"
                aria-label="Close chat window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60 dark:bg-slate-950/60">
            {messages.map((m) => {
              const isMe = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/70 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                    {m.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:200ms]" />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="p-2 bg-slate-100/80 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleQuickPrompt('paano gumawa ng case')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 active:scale-95 shrink-0 transition-transform"
            >
              Paano gumawa ng case?
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt('saan mag export ng reports')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 active:scale-95 shrink-0 transition-transform"
            >
              Export reports?
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt('ano gagawin sa pending concern')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 active:scale-95 shrink-0 transition-transform"
            >
              Pending concern?
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Magtanong (e.g. paano, saan, bakit)..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-transform shrink-0"
              title="Send question"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Messenger-Style Bubble / Chat Head */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Minimized Pill Bar when minimized */}
        {isOpen && isMinimized && (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-2 rounded-full bg-slate-900/90 dark:bg-slate-800/90 border border-white/20 text-white text-xs font-bold shadow-xl hover:bg-slate-900 active:scale-95 transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            <span>Guidance Copilot</span>
            <Maximize2 className="w-3 h-3 text-slate-400" />
          </button>
        )}

        {/* Circular Chat Head */}
        <button
          type="button"
          onClick={() => {
            if (isOpen && isMinimized) {
              setIsMinimized(false);
            } else {
              setIsOpen(!isOpen);
              setIsMinimized(false);
            }
          }}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 text-white shadow-2xl border-2 border-white dark:border-slate-800 flex items-center justify-center hover:shadow-blue-500/30 active:scale-95 transition-all duration-200 relative group ${
            isOpen && !isMinimized ? 'ring-4 ring-blue-500/20' : ''
          }`}
          title="AICS Guidance AI Copilot (SOP & System Guide)"
          aria-label="Toggle Guidance AI Copilot"
        >
          {isOpen && !isMinimized ? (
            <X className="w-6 h-6 text-white transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <>
              <Bot className="w-6 h-6 text-white" />
              {/* Online Dot */}
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
