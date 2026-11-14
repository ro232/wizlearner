import { AlertTriangle } from 'lucide-react';

/** Stays next to the button after a failed download (the toast leaves after a few seconds). */
export function DownloadError({ message, className = '' }: { message: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 ${className}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
