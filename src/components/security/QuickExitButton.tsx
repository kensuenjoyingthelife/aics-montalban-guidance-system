import React, { useEffect, useState, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { recordSecurityAudit } from '../../services/securityEngine';

/**
 * iPhone AssistiveTouch-Style Draggable Floating SOS Quick-Exit Ball
 * 
 * Features:
 * - On Mobile (< 768px):
 *   Renders as a floating circular RED assistive-touch button that students can drag and move anywhere
 *   along the screen edges just like the iOS AssistiveTouch home ball!
 *   Tapping it immediately executes Emergency Exit:
 *     1. Purges local/session storage auth tokens
 *     2. Triggers onTrigger / onSignOut
 *     3. Attempts window.close() (to exit tab/browser)
 *     4. Instantly navigates to Google Search home (or about:blank)
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
  // RENDER: MOBILE IPHONE ASSISTIVETOUCH BALL
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
          isDragging ? 'opacity-95 scale-105' : 'opacity-85'
        }`}
      >
        {/* Glowing Assistive Touch Orb */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 p-1 shadow-2xl shadow-rose-950/80 border-2 border-white/80 flex flex-col items-center justify-center cursor-move">
          {/* Outer Pulsing Ping Ring */}
          <span className="absolute inset-0 rounded-full bg-rose-400 opacity-40 animate-ping pointer-events-none" />

          {/* Inner AssistiveTouch Concentric Ring */}
          <div className="w-10 h-10 rounded-full border-2 border-white/60 bg-red-700/80 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-white text-base font-black leading-none">✕</span>
            <span className="text-[7.5px] font-black tracking-tighter text-white uppercase mt-0.5 leading-none">
              EXIT
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
