'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type Toast = (message: string, options?: { error?: boolean }) => void;
const ToastContext = createContext<Toast>(() => undefined);

/** A small confirmation that slides up at the bottom and leaves on its own. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<{ text: string; id: number; error: boolean } | null>(null);
  const show = useCallback<Toast>((text, options) => {
    const id = Date.now();
    const error = Boolean(options?.error);
    setMessage({ text, id, error });
    // an error stays a little longer: it is something to read, not just a confirmation
    setTimeout(() => setMessage((m) => (m?.id === id ? null : m)), error ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live={message?.error ? 'assertive' : 'polite'} className="fixed inset-x-0 bottom-24 lg:bottom-6 z-[60] flex justify-center pointer-events-none px-4">
        {message && (
          <div key={message.id} role={message.error ? 'alert' : 'status'}
            className={`toast-in pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 font-bold ${message.error ? 'bg-red-700 text-white shadow-[4px_4px_0_#1F2A44]' : 'bg-ink text-white shadow-[4px_4px_0_#F2B632]'}`}>
            {message.error ? <AlertCircle className="w-5 h-5 shrink-0" aria-hidden /> : <CheckCircle2 className="w-5 h-5 shrink-0 text-pencil" aria-hidden />} {message.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Toast {
  return useContext(ToastContext);
}
