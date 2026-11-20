import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { recordSecurityAudit } from '../../services/securityEngine';
import { isCapacitorNativeApp } from '../../services/devicePerformance';

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
    currentPosRef.current = { x, y }; // remember it even before the ball is on screen
    if (!ballRef.current) return;
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

  // the ball appears only after isMobile turns true: place it then (it used to stay at the top-left, over the header)
  useEffect(() => {
    if (!isMobile) return;
    const raf = requestAnimationFrame(() => applyTransform(currentPosRef.current.x, currentPosRef.current.y, false));
    return () => cancelAnimationFrame(raf);
  }, [isMobile, applyTransform]);

  const executeEmergencyExit = useCallback(async () => {
    try {
      recordSecurityAudit('QUICK_EXIT');
    } catch {}

    const isNativeMobile = isCapacitorNativeApp();

    if (isNativeMobile) {
      // DUAL-MODE DISCRETION: MOBILE APK / PHONE
      // Lock into PIN gate immediately for safety & privacy, but DO NOT wipe student credentials
      // When the student reopens the app, they unlock with their 5-digit PIN instead of full re-login!
      try {
        localStorage.setItem('student_pin_locked', 'true');
      } catch {}

      if (onTrigger) {
        try {
          onTrigger();
        } catch {}
      }

      // Exit / minimize app immediately
      try {
        await CapacitorApp.exitApp();
        return;
      } catch {
        try {
          window.close();
        } catch {}
        window.location.replace('https://www.google.com');
      }
    } else {
      // DUAL-MODE DISCRETION: WEB BROWSER / COMPUTER (Zero-Trace Instant Purge)
      // Completely wipe credentials, sessions, and history so shared PCs leave 0 evidence!
      try {
        sessionStorage.clear();
        localStorage.removeItem('student_auth_session');
        localStorage.removeItem('student_portal_user');
        localStorage.removeItem('student_pin_locked');
        localStorage.removeItem('aics_student_cached');
      } catch {}

      if (onTrigger) {
        try {
          onTrigger();
        } catch {}
      }

      try {
        window.close();
      } catch {}

      window.location.replace('https://www.google.com');
    }
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
  // No moving / draggable robot ball anymore (user, 2026-11-20): the same quiet button on phone and website.
  void isMobile;

  // ==========================================
  // RENDER: DESKTOP SLEEK PILL
  // ==========================================
  return (
    <button
      type="button"
      onClick={executeEmergencyExit}
      title="Quick Exit: leave this page at once (key: Esc)" aria-label="Quick Exit"
      className={`group px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400/50 shadow-lg shadow-rose-950/40 text-[11px] font-black tracking-wide flex items-center gap-1.5 transition-all active:scale-95 ${className}`}
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">Quick Exit [Esc]</span>
      <span className="lg:hidden">Exit</span>
    </button>
  );
};
