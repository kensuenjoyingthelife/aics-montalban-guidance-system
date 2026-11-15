import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Sparkles,
  Bot,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText,
  GripHorizontal
} from 'lucide-react';
import { askGuidanceCopilot, CopilotMessage } from '../services/guidanceCopilotService';
import { AicyTermsModal, isAicyTermsAccepted } from './help/AicyTermsModal';

const CHAT_BALL_POS_KEY = 'aics_aicy_chat_head_pos';
const CHAT_WINDOW_POS_KEY = 'aics_aicy_window_pos';
const CHAT_WINDOW_SIZE_KEY = 'aics_aicy_window_size';
const BALL_SIZE = 56;
const MARGIN = 16;

// Official Facebook Messenger Web Chatbox Dimensions: 330px width x 440px height
// Docks directly at the bottom-right corner, exactly like Facebook Messenger
const MIN_WINDOW_WIDTH = 240;
const MIN_WINDOW_HEIGHT = 220;
const DEFAULT_WINDOW_WIDTH = 330;
const DEFAULT_WINDOW_HEIGHT = 440;

export const GuidanceChatHead: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(isAicyTermsAccepted);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Freeform resizable window size (defaults to standard 380x520)
  const [customSize, setCustomSize] = useState<{ w: number; h: number }>({
    w: DEFAULT_WINDOW_WIDTH,
    h: DEFAULT_WINDOW_HEIGHT,
  });

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Magandang araw! Ako si Aicy AI, ang iyong Guidance Assistant & System Copilot. Handa akong sumagot sa mga tanong kung paano gamitin at i-navigate ang system (paano gumawa ng case, mag-approve, o mag-print ng reports). Walang access ang aking sistema sa personal data ng mga mag-aaral alinsunod sa RA 10173 at lahat ng analytics ay sandboxed lamang sa AICS. Paano kita matutulungan?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // FLOATING DRAGGABLE CHAT HEAD BALL REFS
  // ==========================================
  const ballRef = useRef<HTMLDivElement>(null);
  const ballPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const ballDragRef = useRef<{
    isDragging: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    hasMoved: boolean;
  }>({
    isDragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    hasMoved: false,
  });

  // ==========================================
  // FLOATING DRAGGABLE CHAT WINDOW REFS
  // ==========================================
  const windowRef = useRef<HTMLDivElement>(null);
  const windowPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const windowDragRef = useRef<{
    isDragging: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    isDragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // 4-Edge & Corner Resize Drag Ref (Tulad ng native desktop/browser window)
  const resizeDragRef = useRef<{
    isResizing: boolean;
    direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's' | 'w' | 'n' | null;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    isResizing: false,
    direction: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: DEFAULT_WINDOW_WIDTH,
    origH: DEFAULT_WINDOW_HEIGHT,
  });

  // Calculate boundary bounds for chat head ball
  const getBallBounds = useCallback(() => {
    const maxX = Math.max(MARGIN, window.innerWidth - BALL_SIZE - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - BALL_SIZE - MARGIN);
    return { minX: MARGIN, maxX, minY: MARGIN, maxY };
  }, []);

  const applyBallTransform = useCallback((x: number, y: number, withTransition = false) => {
    if (!ballRef.current) return;
    ballPosRef.current = { x, y };
    ballRef.current.style.transition = withTransition
      ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.2s ease'
      : 'none';
    ballRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  // Calculate boundary bounds for chat window
  const getWindowBounds = useCallback((w = customSize.w, h = customSize.h) => {
    const wWidth = Math.min(w, window.innerWidth - 8);
    const wHeight = Math.min(h, window.innerHeight - 8);
    const maxX = Math.max(8, window.innerWidth - wWidth - 16);
    const maxY = Math.max(8, window.innerHeight - wHeight - 16);
    return { minX: 8, maxX, minY: 8, maxY, wWidth, wHeight };
  }, [customSize.w, customSize.h]);

  const applyWindowTransform = useCallback((x: number, y: number, withTransition = false) => {
    if (!windowRef.current) return;
    windowPosRef.current = { x, y };
    windowRef.current.style.transition = withTransition
      ? 'transform 0.24s cubic-bezier(0.23, 1, 0.32, 1)'
      : 'none';
    windowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  // Initialize size and position from localStorage or default
  useEffect(() => {
    // Clear legacy localStorage positions so window and ball always dock cleanly at the bottom-right corner like real Messenger
    try {
      localStorage.removeItem(CHAT_WINDOW_POS_KEY);
      localStorage.removeItem(CHAT_BALL_POS_KEY);
    } catch {}

    const initPositions = () => {
      const bBounds = getBallBounds();
      // Dock ball exactly at bottom-right corner
      const initBallX = bBounds.maxX;
      const initBallY = Math.max(bBounds.minY, window.innerHeight - BALL_SIZE - 20);
      applyBallTransform(initBallX, initBallY, false);

      // Dock chat window strictly at the bottom-right corner, 16px from edge
      const wBounds = getWindowBounds(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT);
      const initWinX = Math.max(wBounds.minX, window.innerWidth - DEFAULT_WINDOW_WIDTH - 20);
      const initWinY = Math.max(wBounds.minY, window.innerHeight - DEFAULT_WINDOW_HEIGHT - 20);
      applyWindowTransform(initWinX, initWinY, false);
    };

    initPositions();
    window.addEventListener('resize', initPositions);
    return () => window.removeEventListener('resize', initPositions);
  }, [applyBallTransform, applyWindowTransform, getBallBounds, getWindowBounds]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, customSize]);

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

  // ==========================================
  // BALL DRAG HANDLERS
  // ==========================================
  const handleBallPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    ballDragRef.current = {
      isDragging: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: ballPosRef.current.x,
      origY: ballPosRef.current.y,
      hasMoved: false,
    };
  };

  const handleBallPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ballDragRef.current.isDragging || ballDragRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - ballDragRef.current.startX;
    const deltaY = e.clientY - ballDragRef.current.startY;

    if (!ballDragRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 6) {
      ballDragRef.current.hasMoved = true;
    }

    if (ballDragRef.current.hasMoved) {
      const bounds = getBallBounds();
      const newX = Math.min(Math.max(bounds.minX, ballDragRef.current.origX + deltaX), bounds.maxX);
      const newY = Math.min(Math.max(bounds.minY, ballDragRef.current.origY + deltaY), bounds.maxY);
      applyBallTransform(newX, newY, false);
    }
  };

  const handleBallPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ballDragRef.current.isDragging || ballDragRef.current.pointerId !== e.pointerId) return;

    const wasDragging = ballDragRef.current.hasMoved;
    ballDragRef.current.isDragging = false;
    ballDragRef.current.pointerId = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (wasDragging) {
      // Snap to nearest edge (left or right)
      const bounds = getBallBounds();
      const currentX = ballPosRef.current.x;
      const currentY = ballPosRef.current.y;
      const midPoint = window.innerWidth / 2;
      const finalX = currentX < midPoint ? bounds.minX : bounds.maxX;
      const finalY = Math.min(Math.max(bounds.minY, currentY), bounds.maxY);

      applyBallTransform(finalX, finalY, true);

      try {
        localStorage.setItem(CHAT_BALL_POS_KEY, JSON.stringify({ x: finalX, y: finalY }));
      } catch {}
    } else {
      // Clicked / Tapped
      if (!termsAccepted) {
        setShowTermsModal(true);
        return;
      }
      if (isOpen && isMinimized) {
        setIsMinimized(false);
      } else {
        setIsOpen(!isOpen);
        setIsMinimized(false);
      }
    }
  };

  // ==========================================
  // WINDOW DRAG HANDLERS (Drag by Header)
  // ==========================================
  const handleWindowPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag when clicking the header background or drag handle (not child buttons)
    if ((e.target as HTMLElement).closest('button, input, form')) return;
    if (e.button !== 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    windowDragRef.current = {
      isDragging: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: windowPosRef.current.x,
      origY: windowPosRef.current.y,
    };
  };

  const handleWindowPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!windowDragRef.current.isDragging || windowDragRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - windowDragRef.current.startX;
    const deltaY = e.clientY - windowDragRef.current.startY;

    const bounds = getWindowBounds();
    const newX = Math.min(Math.max(bounds.minX, windowDragRef.current.origX + deltaX), bounds.maxX);
    const newY = Math.min(Math.max(bounds.minY, windowDragRef.current.origY + deltaY), bounds.maxY);
    applyWindowTransform(newX, newY, false);
  };

  const handleWindowPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!windowDragRef.current.isDragging || windowDragRef.current.pointerId !== e.pointerId) return;
    windowDragRef.current.isDragging = false;
    windowDragRef.current.pointerId = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    try {
      localStorage.setItem(CHAT_WINDOW_POS_KEY, JSON.stringify(windowPosRef.current));
    } catch {}
  };

  // ==========================================
  // FREE MULTI-CORNER & EDGE RESIZE (Tulad ng Windows/Mac/Browser Window)
  // ==========================================
  const handleResizeStart = (
    e: React.PointerEvent<HTMLDivElement>,
    direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's' | 'w' | 'n'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    resizeDragRef.current = {
      isResizing: true,
      direction,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: windowPosRef.current.x,
      origY: windowPosRef.current.y,
      origW: customSize.w,
      origH: customSize.h,
    };
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragRef.current.isResizing || resizeDragRef.current.pointerId !== e.pointerId) return;

    const { direction, startX, startY, origX, origY, origW, origH } = resizeDragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let nextW = origW;
    let nextH = origH;
    let nextX = origX;
    let nextY = origY;

    // Width / Horizontal adjustments
    if (direction === 'se' || direction === 'e' || direction === 'ne') {
      nextW = Math.max(MIN_WINDOW_WIDTH, Math.min(window.innerWidth - origX - 8, origW + deltaX));
    } else if (direction === 'sw' || direction === 'w' || direction === 'nw') {
      const candidateW = origW - deltaX;
      if (candidateW >= MIN_WINDOW_WIDTH) {
        nextW = Math.min(origX + origW - 8, candidateW);
        nextX = origX + (origW - nextW);
      }
    }

    // Height / Vertical adjustments
    if (direction === 'se' || direction === 's' || direction === 'sw') {
      nextH = Math.max(MIN_WINDOW_HEIGHT, Math.min(window.innerHeight - origY - 8, origH + deltaY));
    } else if (direction === 'ne' || direction === 'n' || direction === 'nw') {
      const candidateH = origH - deltaY;
      if (candidateH >= MIN_WINDOW_HEIGHT) {
        nextH = Math.min(origY + origH - 8, candidateH);
        nextY = origY + (origH - nextH);
      }
    }

    setCustomSize({ w: nextW, h: nextH });
    if (nextX !== origX || nextY !== origY) {
      applyWindowTransform(nextX, nextY, false);
    }
  };

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragRef.current.isResizing || resizeDragRef.current.pointerId !== e.pointerId) return;
    resizeDragRef.current.isResizing = false;
    resizeDragRef.current.pointerId = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    try {
      localStorage.setItem(
        CHAT_WINDOW_SIZE_KEY,
        JSON.stringify({ w: customSize.w, h: customSize.h })
      );
      localStorage.setItem(CHAT_WINDOW_POS_KEY, JSON.stringify(windowPosRef.current));
    } catch {}
  };

  // Adaptive threshold checking for ultra-compact layouts (3x4 or smaller)
  const isMini = customSize.w < 260 || customSize.h < 260;
  const isMicro = customSize.w < 220 || customSize.h < 200;

  return (
    <>
      {/* Expanded Draggable & Browser-Style Resizable Floating Messenger Window */}
      {isOpen && !isMinimized && (
        <div
          ref={windowRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: `calc(${customSize.w}px * var(--aicy-inv-zoom, 1))`,
            height: `calc(${customSize.h}px * var(--aicy-inv-zoom, 1))`,
            zIndex: 9990,
            touchAction: 'none',
            willChange: 'transform, width, height',
          }}
          role="dialog"
          aria-label="Guidance Assistant Chat Window"
          className="bg-white dark:bg-[#18191a] border border-[#cbd5e1] dark:border-[#3a3b3c] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 select-none relative group/window"
        >
          {/* Messenger Style Clean Header */}
          <div
            onPointerDown={handleWindowPointerDown}
            onPointerMove={handleWindowPointerMove}
            onPointerUp={handleWindowPointerUp}
            onPointerCancel={handleWindowPointerUp}
            className="bg-white dark:bg-[#242526] text-slate-800 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-3 py-2 cursor-grab active:cursor-grabbing select-none shrink-0"
            title="I-drag ang header upang ilipat ang screen kahit saan"
          >
            <div className="flex items-center gap-2 min-w-0 pointer-events-none">
              {/* EVE Visor Mascot Avatar */}
              <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center p-0.5 overflow-hidden shadow-xs shrink-0">
                <div className="w-5 h-4 rounded-full bg-slate-900 flex items-center justify-center gap-0.5 overflow-hidden">
                  <svg className="w-1.5 h-1" viewBox="0 0 20 14" fill="none">
                    <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <svg className="w-1.5 h-1" viewBox="0 0 20 14" fill="none">
                    <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white truncate leading-none">
                  Aicy AI
                </h2>
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online · Guidance
                </p>
              </div>
            </div>

            {/* Messenger-Style Clean Minimal Icons */}
            <div className="flex items-center gap-1 shrink-0 text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-slate-600 dark:text-slate-300"
                title="Terms & Privacy"
                aria-label="Terms & Privacy"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                title="Minimize chat"
                aria-label="Minimize chat window"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center hover:text-rose-600"
                title="Close chat"
                aria-label="Close chat window"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Flow - Messenger Crisp Bubbles */}
          <div className="flex-1 overflow-y-auto space-y-2 p-2.5 bg-white dark:bg-[#18191a] select-text">
            {messages.map((m) => {
              const isMe = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[18px] px-3 py-2 leading-relaxed text-[12px] shadow-2xs ${
                      isMe
                        ? 'bg-[#0084ff] text-white rounded-br-[4px] font-normal'
                        : 'bg-[#f0f2f5] dark:bg-[#303030] text-[#050505] dark:text-[#e4e6eb] rounded-bl-[4px] font-normal'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                    {m.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-1">
                <div className="bg-[#f0f2f5] dark:bg-[#303030] rounded-[18px] rounded-bl-[4px] px-3 py-2 flex items-center gap-1.5 shadow-2xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:200ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Pills */}
          <div className="px-2.5 py-1.5 bg-[#f0f2f5]/60 dark:bg-[#242526]/80 border-t border-slate-200/80 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleQuickPrompt('Paano mag-file ng bagong case?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-[#3a3b3c] border border-slate-300 dark:border-transparent text-[10.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#4e4f50] transition-colors shrink-0 active:scale-95 shadow-2xs"
            >
              Paano mag-file ng case?
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt('Ano ang mga patakaran sa Data Privacy (RA 10173)?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-[#3a3b3c] border border-slate-300 dark:border-transparent text-[10.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#4e4f50] transition-colors shrink-0 active:scale-95 shadow-2xs"
            >
              Data Privacy (RA 10173)
            </button>
          </div>

          {/* Messenger Style Chat Input */}
          <form
            onSubmit={handleSend}
            className="bg-white dark:bg-[#242526] border-t border-slate-200 dark:border-white/10 p-2 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Aa"
              disabled={isLoading}
              className="flex-1 bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-3.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-500 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0084ff] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-7 h-7 rounded-full bg-[#0084ff] hover:bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center active:scale-95 transition-transform shrink-0 shadow-xs"
              title="Send question"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>

          {/* ========================================================= */}
          {/* 4 CORNER RESIZERS + 4 EDGE RESIZERS (Gaya ng Windows Browser) */}
          {/* ========================================================= */}

          {/* Bottom-Right Corner (SE) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'se')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute -bottom-1 -right-1 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 z-40 text-slate-400 hover:text-blue-600 active:text-blue-700 transition-colors"
            title="I-drag ang sulok para palakihin o paliitin (SE)"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="8" cy="8" r="1.3" />
              <circle cx="4" cy="8" r="1.3" />
              <circle cx="8" cy="4" r="1.3" />
            </svg>
          </div>

          {/* Bottom-Left Corner (SW) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'sw')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute -bottom-1 -left-1 w-6 h-6 cursor-sw-resize z-40 flex items-end justify-start p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
            title="I-drag ang sulok (SW)"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="2" cy="8" r="1.3" />
              <circle cx="6" cy="8" r="1.3" />
              <circle cx="2" cy="4" r="1.3" />
            </svg>
          </div>

          {/* Top-Right Corner (NE) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'ne')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute -top-1 -right-1 w-6 h-6 cursor-ne-resize z-40"
            title="I-resize (NE)"
          />

          {/* Top-Left Corner (NW) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'nw')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute -top-1 -left-1 w-6 h-6 cursor-nw-resize z-40"
            title="I-resize (NW)"
          />

          {/* Right Edge (E) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'e')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute top-4 bottom-4 -right-1 w-3 cursor-e-resize z-35 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
            title="I-resize lapad"
          />

          {/* Bottom Edge (S) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 's')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute -bottom-1 left-4 right-4 h-3 cursor-s-resize z-35 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
            title="I-resize taas"
          />

          {/* Left Edge (W) */}
          <div
            onPointerDown={(e) => handleResizeStart(e, 'w')}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            style={{ touchAction: 'none' }}
            className="absolute top-4 bottom-4 -left-1 w-3 cursor-w-resize z-35 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
            title="I-resize lapad"
          />
        </div>
      )}

      {/* Floating Messenger-Style Bubble / Chat Head (Draggable 60-120fps) */}
      <div
        ref={ballRef}
        onPointerDown={handleBallPointerDown}
        onPointerMove={handleBallPointerMove}
        onPointerUp={handleBallPointerUp}
        onPointerCancel={handleBallPointerUp}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9995,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'grab',
          willChange: 'transform',
        }}
        className="flex items-center gap-2 select-none active:cursor-grabbing"
      >
        {/* Minimized Pill Bar when minimized */}
        {isOpen && isMinimized && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-800/90 border border-white/20 text-white text-xs font-bold shadow-xl hover:bg-slate-900 active:scale-95 transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer"
          >
            {/* 3D EVE-Style Head Ball (Mini) */}
            <div className="w-5 h-5 rounded-full mascot-shell-head flex items-center justify-center p-0.5 overflow-hidden shadow-inner shrink-0">
              <div className="w-3.5 h-2.5 rounded-full mascot-visor-glass flex items-center justify-center gap-0.5">
                <svg className="w-1.5 h-1" viewBox="0 0 20 14" fill="none">
                  <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <svg className="w-1.5 h-1" viewBox="0 0 20 14" fill="none">
                  <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <span>Aicy AI</span>
            <Maximize2 className="w-3 h-3 text-slate-400" />
          </div>
        )}

        {/* Circular Chat Head — 3D EVE-Style Mascot Face (Zero SOS Text, Clean Cyan Glowing Eyes) */}
        <div
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full p-1 bg-slate-900/95 text-white shadow-2xl border-2 border-sky-400/70 dark:border-sky-500/80 flex items-center justify-center hover:shadow-sky-500/40 active:scale-95 transition-all duration-200 relative group backdrop-blur-md ${
            isOpen && !isMinimized ? 'ring-4 ring-sky-500/30' : ''
          }`}
          title="Aicy AI · Guidance Assistant (I-drag kahit saan)"
          aria-label="Toggle Aicy AI Guidance Assistant"
        >
          {isOpen && !isMinimized ? (
            <X className="w-6 h-6 text-white transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <>
              {/* 3D EVE-Style Pearl Head Sphere */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full mascot-shell-head flex items-center justify-center p-1 overflow-hidden pointer-events-none shadow-inner">
                {/* Top Gloss Specular Highlight */}
                <div className="absolute top-1 left-2 w-4 h-2 bg-white/90 rounded-full blur-[0.8px] transform -rotate-30 pointer-events-none" />

                {/* Deep Obsidian Black Visor */}
                <div className="relative w-9 h-7 rounded-full mascot-visor-glass flex items-center justify-center gap-1.5 overflow-hidden">
                  {/* Visor Glare Shine */}
                  <div className="absolute -top-1 -left-1 w-6 h-3 bg-white/30 blur-[1px] rounded-full transform -rotate-12 pointer-events-none" />

                  {/* Cute Glowing Cyan Smiling Eyes (Curved Arcs) */}
                  <svg className="w-3 h-2.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                    <path
                      d="M 2 12 Q 10 1 18 12"
                      stroke="#38BDF8"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_5px_rgba(56,189,248,0.95)]"
                    />
                  </svg>
                  <svg className="w-3 h-2.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                    <path
                      d="M 2 12 Q 10 1 18 12"
                      stroke="#38BDF8"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_5px_rgba(56,189,248,0.95)]"
                    />
                  </svg>
                </div>
              </div>

              {/* Online Emerald Status Dot */}
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm pointer-events-none" />
            </>
          )}
        </div>
      </div>

      {/* Terms and Privacy Modal */}
      <AicyTermsModal
        isOpen={showTermsModal}
        onAccept={() => {
          setTermsAccepted(true);
          setShowTermsModal(false);
          setIsOpen(true);
          setIsMinimized(false);
        }}
        onDecline={() => {
          setShowTermsModal(false);
        }}
      />
    </>
  );
};
