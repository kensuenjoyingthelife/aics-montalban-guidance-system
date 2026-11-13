import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { recordSecurityAudit } from '../../services/securityEngine';

/**
 * iPhone AssistiveTouch-Style Draggable Floating Mascot Head Quick-Exit Ball
 * 
 * Hardware-Accelerated (Zero-Lag, 60-120fps PointerEvents & Direct DOM Transform)
 * 
 * Features:
 * - Rendered ONLY inside Student Portal (after successful account creation / login).
 * - Smooth PointerEvents with pointer capture: zero lag, zero event drops, works flawlessly across all touch & mouse devices.
 * - Direct translate3d style transform updates during drag: does NOT re-render React on every touchmove pixel!
 * - Persists and remembers its position in localStorage so it NEVER resets or jumps back to its old place!
 * - Smooth CSS spring snap to the user's nearest screen edge (left or right) upon release.
 * - Intelligent tap vs. drag detection: Tapping triggers instant emergency exit; dragging cleanly repositions the ball.
 * - Desktop: Renders as a discrete top navbar pill with Esc hotkey support.
 */

interface QuickExitButtonProps {
  onTrigger?: () => void;
  className?: string;
}

const STORAGE_KEY = 'aics_sos_ball_position';
const BALL_SIZE = 56; // 56px (w-14 h-14)
const MARGIN = 12;

export const QuickExitButton: React.FC<QuickExitButtonProps> = ({ onTrigger, className = '' }) => {
  const [isMobile, setIsMobile] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);

  // Position stored in ref for direct, ultra-fast 120fps manipulation without React render cycles
  const currentPosRef = useRef<{ x: number; y: number }>({ x: 20, y: 160 });

  // Drag tracking state
  const dragRef = useRef<{
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
    origX: 20,
    origY: 160,
    hasMoved: false,
  });

  // Calculate safe boundary bounds
  const getBounds = useCallback(() => {
    const maxX = Math.max(MARGIN, window.innerWidth - BALL_SIZE - MARGIN);
    const maxY = Math.max(60, window.innerHeight - BALL_SIZE - MARGIN);
    return { minX: MARGIN, maxX, minY: 60, maxY };
  }, []);

  // Update physical DOM position instantly via hardware-accelerated transform
  const applyTransform = useCallback((x: number, y: number, withTransition = false) => {
    if (!ballRef.current) return;
    currentPosRef.current = { x, y };
    ballRef.current.style.transition = withTransition
      ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.2s ease'
      : 'none';
    ballRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  // Detect mobile & initialize saved or edge-snapped position
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);

      if (mobile) {
        const bounds = getBounds();
        let initX = bounds.maxX;
        let initY = Math.min(Math.max(bounds.minY, window.innerHeight * 0.4), bounds.maxY);

        // Load saved position from localStorage so it stays where student left it!
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
              // Clamp saved position within current window bounds
              initX = Math.min(Math.max(bounds.minX, parsed.x), bounds.maxX);
              initY = Math.min(Math.max(bounds.minY, parsed.y), bounds.maxY);
            }
          }
        } catch {}

        applyTransform(initX, initY, false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [applyTransform, getBounds]);

  const executeEmergencyExit = useCallback(() => {
    try {
      recordSecurityAudit('QUICK_EXIT');
    } catch {}

    // 1. Instantly purge all student credentials and sessions
    try {
      sessionStorage.clear();
      localStorage.removeItem('student_auth_session');
      localStorage.removeItem('student_portal_user');
      localStorage.removeItem('aics_student_cached');
    } catch {}

    // 2. Trigger parent signout callback
    if (onTrigger) {
      try {
        onTrigger();
      } catch {}
    }

    // 3. Attempt to close window (works on PWAs, Android/iOS home screen apps, WebViews)
    try {
      window.close();
    } catch {}

    // 4. Force replace navigation to Google search
    window.location.replace('https://www.google.com');
  }, [onTrigger]);

  // Desktop Esc Hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        executeEmergencyExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeEmergencyExit]);

  // =========================================================================
  // HIGH-PERFORMANCE 120FPS POINTER EVENT HANDLERS (POINTER CAPTURE ENGINE)
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    dragRef.current = {
      isDragging: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentPosRef.current.x,
      origY: currentPosRef.current.y,
      hasMoved: false,
    };

    if (ballRef.current) {
      ballRef.current.style.transition = 'none';
      ballRef.current.style.opacity = '1';
      ballRef.current.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || dragRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    // Movement threshold for drag recognition (prevent accidental jitters on tap)
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.hasMoved = true;
    }

    const bounds = getBounds();
    const newX = Math.min(Math.max(bounds.minX, dragRef.current.origX + deltaX), bounds.maxX);
    const newY = Math.min(Math.max(bounds.minY, dragRef.current.origY + deltaY), bounds.maxY);

    // Ultra-smooth zero-lag direct transform update
    applyTransform(newX, newY, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || dragRef.current.pointerId !== e.pointerId) return;

    const wasMoved = dragRef.current.hasMoved;
    dragRef.current.isDragging = false;
    dragRef.current.pointerId = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (ballRef.current) {
      ballRef.current.style.cursor = 'grab';
    }

    // CASE 1: Student tapped without moving -> Execute Emergency Exit!
    if (!wasMoved) {
      executeEmergencyExit();
      return;
    }

    // CASE 2: Student dragged the ball -> Snap cleanly to nearest screen edge (left or right)
    const bounds = getBounds();
    const currentX = currentPosRef.current.x;
    const currentY = currentPosRef.current.y;
    const screenCenter = window.innerWidth / 2;

    // Nearest edge snap
    const finalX = currentX < screenCenter ? bounds.minX : bounds.maxX;
    const finalY = Math.min(Math.max(bounds.minY, currentY), bounds.maxY);

    // Apply smooth spring snap animation
    applyTransform(finalX, finalY, true);

    // SAVE TO LOCAL STORAGE: Permanently remember where the student put the ball!
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: finalX, y: finalY }));
    } catch {}
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging && dragRef.current.pointerId === e.pointerId) {
      dragRef.current.isDragging = false;
      dragRef.current.pointerId = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // ==========================================
  // RENDER: MOBILE IPHONE ASSISTIVETOUCH MASCOT HEAD BALL
  // ==========================================
  if (isMobile) {
    return (
      <div
        ref={ballRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99999,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'grab',
          willChange: 'transform',
        }}
        className="select-none active:scale-95 transition-opacity duration-200"
        aria-label="SOS Quick Exit Mascot Button"
      >
        {/* Floating Circle Container Shaped Like the 3D Robot Mascot Head */}
        <div className="relative w-14 h-14 rounded-full bg-slate-900/90 p-1 shadow-2xl shadow-rose-950/70 border-2 border-rose-500/80 flex items-center justify-center backdrop-blur-md">
          {/* Subtle Outer Pulsing Soft Red/Cyan Warning Halo */}
          <span className="absolute inset-0 rounded-full bg-rose-500/25 animate-ping pointer-events-none" />

          {/* 3D EVE-Style Pearl Head Sphere */}
          <div className="relative w-12 h-12 rounded-full mascot-shell-head flex items-center justify-center p-1 overflow-hidden pointer-events-none shadow-inner">
            {/* Top Gloss Specular Highlight */}
            <div className="absolute top-1 left-2 w-4 h-2 bg-white/85 rounded-full blur-[0.8px] transform -rotate-30 pointer-events-none" />

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

            {/* Red "SOS" Badge at bottom of mascot head */}
            <span className="absolute bottom-0.5 px-1 py-[0.5px] rounded-full bg-rose-600 text-[6.5px] font-black text-white tracking-widest uppercase leading-none shadow-md border border-rose-400/40">
              SOS
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
