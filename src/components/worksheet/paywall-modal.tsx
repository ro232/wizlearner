'use client';

import { Crown, Zap, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-7 animate-scale-in">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-lg">×</button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)' }}>
          <Crown className="w-7 h-7 text-orange-500" />
        </div>

        <h2 className="text-xl font-extrabold text-center text-slate-900 mb-2">Unlock Full Content</h2>
        <p className="text-sm text-center text-slate-500 mb-6">Get access to all letters, numbers, shapes, and premium features with a WorksheetWiz access code.</p>

        {/* Plans */}
        <div className="space-y-3 mb-6">
          <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">Starter</span>
              <Badge className="text-white text-xs" style={{ background: '#2E5C8A' }}>$4.99</Badge>
            </div>
            <ul className="space-y-1">
              {['Full A-Z + lowercase', 'Numbers 1-20', 'All shapes', 'Unlimited downloads'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-600"><Check className="w-3 h-3 text-blue-600 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">Full Access</span>
              <Badge className="text-white text-xs" style={{ background: '#E8913A' }}>$9.99</Badge>
            </div>
            <ul className="space-y-1">
              {['Everything in Starter', 'Math & Games', 'AI generator', 'Classroom mode'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-600"><Check className="w-3 h-3 text-orange-500 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button className="w-full h-12 rounded-xl text-white btn-premium font-semibold" style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}>
            <Zap className="w-4 h-4 mr-2" /> Enter Access Code
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl font-semibold text-orange-600 border-orange-300 hover:bg-orange-50">
            <ExternalLink className="w-4 h-4 mr-2" /> Get Code on Etsy
          </Button>
        </div>
      </div>
    </div>
  );
}
