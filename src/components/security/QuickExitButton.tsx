import React, { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { recordSecurityAudit } from '../../services/securityEngine';

/**
 * Emergency SOS Quick-Exit Shield
 * 
 * Protects students reporting bullying/abuse:
 * - If a bully or teacher unexpectedly approaches from behind, pressing ESC or clicking "Quick Exit"
 *   instantly cleans the session, logs out, and redirects immediately to a safe educational site (Google/DepEd).
 */

interface QuickExitButtonProps {
  onTrigger?: () => void;
  className?: string;
}

export const QuickExitButton: React.FC<QuickExitButtonProps> = ({ onTrigger, className = '' }) => {
  const executeEmergencyExit = () => {
    recordSecurityAudit('QUICK_EXIT');
    if (onTrigger) onTrigger();
    // Redirect to harmless safe Google/DepEd portal
    window.location.replace('https://www.google.com');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey: Pressing Escape key triggers immediate Quick Exit
      if (e.key === 'Escape') {
        executeEmergencyExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
