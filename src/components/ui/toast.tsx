'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type Toast = (message: string) => void;
const ToastContext = createContext<Toast>(() => undefined);

/** A small confirmation that slides up at the bottom and leaves on its own. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  const show = useCallback<Toast>((text) => {
    const id = Date.now();
    setMessage({ text, id });
    setTimeout(() => setMessage((m) => (m?.id === id ? null : m)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 bottom-24 lg:bottom-6 z-[60] flex justify-center pointer-events-none px-4">
        {message && (
          <div key={message.id} className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl bg-ink text-white px-4 py-3 font-bold shadow-[4px_4px_0_#F2B632]">
            <CheckCircle2 className="w-5 h-5 text-pencil" aria-hidden /> {message.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Toast {
  return useContext(ToastContext);
}
