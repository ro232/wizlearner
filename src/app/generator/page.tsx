'use client';

import { useState } from 'react';
import { Eye, Download } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeneratorControls } from '@/components/worksheet/generator-controls';
import { WorksheetPreview } from '@/components/worksheet/worksheet-preview';
import { SheetContentBar } from '@/components/worksheet/sheet-content-bar';
import { PaywallModal } from '@/components/worksheet/paywall-modal';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { generateWorksheetPDF } from '@/lib/pdf/generate-pdf';

export default function GeneratorPage() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const config = useWorksheetStore((s) => s.config);
  const tier = useWorksheetStore((s) => s.tier);

  // Calculate estimated pages
  const sizes: Record<string, number> = { small: 8, medium: 5, large: 3 };
  const itemsPerRow = sizes[config.letterSize] || 5;
  const totalRows = Math.ceil(config.selectedItems.length / itemsPerRow);
  const estimatedPages = Math.max(1, Math.ceil(totalRows / config.rowsPerPage));

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      generateWorksheetPDF(config, tier);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen noise-bg" style={{ background: '#F8FAFC' }}>
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <Navbar />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Controls */}
          <div className="lg:w-[46%] space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <GeneratorControls
              onShowPaywall={() => setShowPaywall(true)}
              onDownload={handleDownloadPDF}
              onPrint={handlePrint}
            />
          </div>

          {/* RIGHT: Preview */}
          <div className="lg:w-[54%] lg:sticky lg:top-20 lg:self-start space-y-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {/* Sheet content bar */}
            <SheetContentBar />

            {/* Live preview */}
            <Card className="border-0 shadow-xl overflow-hidden rounded-2xl">
              <CardHeader className="py-3.5 px-5 border-b glass" style={{ background: 'rgba(248,250,252,0.8)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF', color: '#2E5C8A' }}>
                      <Eye className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Live Preview</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-medium text-slate-500">Real-time</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex justify-center" style={{ background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)' }}>
                <WorksheetPreview config={config} />
              </CardContent>
            </Card>

            {/* Download button */}
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="w-full h-14 rounded-2xl text-white shadow-xl btn-premium font-bold text-base disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}
            >
              <Download className="w-5 h-5 mr-2" />
              {isGenerating ? 'Generating...' : `Download PDF ${config.selectedItems.length > 0 && estimatedPages > 1 ? `(${estimatedPages} pages)` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
