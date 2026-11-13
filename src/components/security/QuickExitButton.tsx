import React, { useEffect, useState, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { recordSecurityAudit } from '../../services/securityEngine';

/**
 * iPhone AssistiveTouch-Style Draggable Floating Mascot Head Quick-Exit Ball
 * 
 * Features:
 * - On Mobile (< 768px):
 *   Renders as a floating circular 3D EVE-style ROBOT MASCOT HEAD!
 *   Complete with glossy pearl shell, deep obsidian glass visor, glowing cyan eyes, and specular shine!
 *   Students can freely drag and place it anywhere along the phone screen edges.
 *   Tapping the Mascot Head executes Instant Emergency Exit:
 *     1. Purges local/session storage auth tokens
 *     2. Triggers onTrigger / onSignOut
 *     3. Attempts window.close() (to exit tab/browser)
 *     4. Instantly navigates to Google Search home
 * 
 * - On Desktop (>= 768px):
 *   Renders as a sleek, discrete top navbar pill button with Esc hotkey support.
 */

interface QuickExitButtonProps {
  onTrigger?: () => void;
  className?: string;
}

export const QuickExitButton: React.FC<QuickExitButtonProps> = ({ onTrigger, className = '' }) => {
  // Mobile AssistiveTouch Floating Coordinates
  const [pos, setPos] = useState({ x: 20, y: 160 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    posX: 20,
    posY: 160,
    hasMoved: false,
  });

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
      if (mobile) {
        // Initial right-edge snap position like iOS AssistiveTouch
        setPos({ x: window.innerWidth - 68, y: Math.max(120, window.innerHeight * 0.35) });
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const executeEmergencyExit = () => {
    try {
      recordSecurityAudit('QUICK_EXIT');
    } catch {}

    // Clear session & local storage
    try {
      sessionStorage.clear();
      localStorage.removeItem('student_auth_session');
      localStorage.removeItem('student_portal_user');
    } catch {}

    if (onTrigger) {
      try {
        onTrigger();
      } catch {}
    }

    // Try closing the window/tab directly (works on standalone PWA, WebViews, mobile web apps)
    try {
      window.close();
    } catch {}

    // Instant redirect to harmless Google search homepage
    window.location.replace('https://www.google.com');
  };

  // Keyboard Hotkey (Esc key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        executeEmergencyExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ==========================================
  // MOBILE ASSISTIVETOUCH TOUCH HANDLERS
  // ==========================================
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      posX: pos.x,
      posY: pos.y,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.startX;
    const deltaY = touch.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      dragStartRef.current.hasMoved = true;
    }

    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 70;

    const newX = Math.min(Math.max(10, dragStartRef.current.posX + deltaX), maxX);
    const newY = Math.min(Math.max(60, dragStartRef.current.posY + deltaY), maxY);

    setPos({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // If the student simply tapped without dragging, trigger the Emergency Escape!
    if (!dragStartRef.current.hasMoved) {
      executeEmergencyExit();
      return;
    }

    // Snap to nearest left or right edge like iOS AssistiveTouch
    const screenWidth = window.innerWidth;
    const snapX = pos.x < screenWidth / 2 ? 14 : screenWidth - 68;
    setPos((prev) => ({ ...prev, x: snapX }));
  };

  // ==========================================
  // RENDER: MOBILE IPHONE ASSISTIVETOUCH MASCOT HEAD BALL
  // ==========================================
  if (isMobile) {
    return (
      <div
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed z-[9999] select-none transition-transform duration-100 ease-out active:scale-95 ${
          isDragging ? 'opacity-95 scale-105' : 'opacity-90'
        }`}
      >
        {/* Floating Circle Container Shaped Like the 3D Robot Mascot Head */}
        <div className="relative w-14 h-14 rounded-full bg-slate-900/90 p-1 shadow-2xl shadow-sky-950/90 border-2 border-sky-400/80 flex items-center justify-center cursor-move backdrop-blur-sm">
          {/* Outer Pulsing Soft Cyan Aura */}
          <span className="absolute inset-0 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />

          {/* 3D EVE-Style Pearl Head Sphere */}
          <div className="relative w-12 h-12 rounded-full mascot-shell-head flex items-center justify-center p-1 overflow-hidden pointer-events-none">
            {/* Top Gloss Specular Highlight */}
            <div className="absolute top-1 left-2 w-4 h-2 bg-white/80 rounded-full blur-[0.8px] transform -rotate-30 pointer-events-none" />

            {/* Deep Obsidian Black Visor */}
            <div className="relative w-9 h-7 rounded-full mascot-visor-glass flex items-center justify-center gap-1.5 overflow-hidden">
              {/* Visor Glare Shine */}
              <div className="absolute -top-1 -left-1 w-6 h-3 bg-white/25 blur-[1px] rounded-full transform -rotate-12 pointer-events-none" />

              {/* Cute Glowing Cyan Smiling Eyes (Curved Arcs) */}
              <svg className="w-3 h-2.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                <path
                  d="M 2 12 Q 10 1 18 12"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_4px_rgba(56,189,248,0.9)]"
                />
              </svg>
              <svg className="w-3 h-2.5 overflow-visible" viewBox="0 0 20 14" fill="none">
                <path
                  d="M 2 12 Q 10 1 18 12"
                  stroke="#38BDF8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_4px_rgba(56,189,248,0.9)]"
                />
              </svg>
            </div>

            {/* Subtle "EXIT" Red Badge at bottom of head */}
            <span className="absolute bottom-0.5 px-1 py-[0.5px] rounded-full bg-rose-600/90 text-[6.5px] font-black text-white tracking-tight uppercase leading-none shadow-xs">
              ESC
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: DESKTOP SLEEK PILL
  // ==========================================
  return (
    <button
      type="button"
      onClick={executeEmergencyExit}
      title="Emergency Quick Exit (Hotkey: Esc)"
      className={`group px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400/50 shadow-lg shadow-rose-950/40 text-[11px] font-black tracking-wide flex items-center gap-1.5 transition-all active:scale-95 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-rose-300 animate-ping" />
      <LogOut className="w-3.5 h-3.5" />
      <span>Quick Exit [Esc]</span>
    </button>
  );
};
