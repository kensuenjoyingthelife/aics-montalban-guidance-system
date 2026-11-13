import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (errorCode: string) => void;
          'expired-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
          size?: 'normal' | 'flexible' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface CloudflareTurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (err: string) => void;
  onExpire?: () => void;
  theme?: 'auto' | 'light' | 'dark';
  className?: string;
}

export const CloudflareTurnstile: React.FC<CloudflareTurnstileProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let script = document.getElementById('cf-turnstile-script') as HTMLScriptElement | null;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size: 'flexible',
          callback: (token: string) => {
            onVerify(token);
          },
          'error-callback': (code: string) => {
            if (onError) onError(code);
          },
          'expired-callback': () => {
            if (onExpire) onExpire();
          },
        });
        widgetIdRef.current = id;
      } catch (e) {
        console.warn('Turnstile render warning:', e);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
      script.async = true;
      script.defer = true;
      window.onTurnstileLoad = () => {
        renderWidget();
      };
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        renderWidget();
      } else {
        const prev = window.onTurnstileLoad;
        window.onTurnstileLoad = () => {
          if (prev) prev();
          renderWidget();
        };
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  return (
    <div className={`flex justify-center my-3 min-h-[65px] ${className}`}>
      {/* 100% Pure Official Cloudflare Turnstile Box */}
      <div ref={containerRef} className="w-full max-w-[300px]" />
    </div>
  );
};
