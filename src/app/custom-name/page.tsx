'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { THEME } from '@/lib/constants';

type StyleType = 'dashed' | 'dotted' | 'outline' | 'cursive';
type SizeType = 'small' | 'medium' | 'large';

const styleOptions: { value: StyleType; label: string }[] = [
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'outline', label: 'Outline' },
  { value: 'cursive', label: 'Cursive' },
];

const sizeOptions: { value: SizeType; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const getSizeClasses = (size: SizeType) => {
  switch (size) {
    case 'small':
      return 'w-12 h-16 text-lg';
    case 'large':
      return 'w-20 h-28 text-5xl';
    default:
      return 'w-16 h-20 text-3xl';
  }
};

const getStyleClasses = (style: StyleType) => {
  switch (style) {
    case 'dashed':
      return 'border-2 border-dashed';
    case 'dotted':
      return 'border-2 border-dotted';
    case 'outline':
      return 'border-2 border-solid';
    case 'cursive':
      return 'italic font-cursive';
    default:
      return 'border-2 border-solid';
  }
};

export default function CustomNamePage() {
  const [name, setName] = useState('');
  const [style, setStyle] = useState<StyleType>('dashed');
  const [size, setSize] = useState<SizeType>('medium');

  const nameLetters = useMemo(() => {
    return name.toUpperCase().split('').filter(char => /[A-Z]/.test(char));
  }, [name]);

  const handleDownloadPDF = () => {
    // Placeholder for PDF download functionality
    console.log('Download PDF:', { name, style, size });
    alert(`Downloading "${name}" worksheet with ${style} style and ${size} size`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: THEME.bg }}>
      <Navbar />

      <div className="flex-1">
        {/* Hero Section */}
        <div className="py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight"
              style={{
                background: 'linear-gradient(135deg, #2E5C8A, #E8913A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Create a Name Worksheet
            </h1>
            <p className="text-lg text-slate-600">
              Generate a personalized tracing worksheet for your child to practice their name
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Controls */}
            <div className="lg:col-span-1 space-y-8">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Child&apos;s Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your child's name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ outlineColor: THEME.primary }}
                />
              </div>

              {/* Style Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Letter Style
                </label>
                <div className="space-y-2">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStyle(option.value)}
                      className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all border-2 ${
                        style === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Letter Size
                </label>
                <div className="space-y-2">
                  {sizeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSize(option.value)}
                      className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all border-2 ${
                        size === option.value
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownloadPDF}
                disabled={nameLetters.length === 0}
                className="w-full text-white font-semibold py-3 rounded-xl btn-premium shadow-lg flex items-center justify-center gap-2"
                style={{
                  background: nameLetters.length > 0 ? 'linear-gradient(135deg, #E8913A, #d97706)' : '#ccc',
                  cursor: nameLetters.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </Button>
            </div>

            {/* Right Column: Live Preview */}
            <div className="lg:col-span-2">
              <Card className="p-8 bg-white sticky top-24">
                <h2 className="text-sm font-semibold text-slate-600 mb-6">Live Preview</h2>

                {nameLetters.length === 0 ? (
                  <div className="flex items-center justify-center h-80 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                    <p className="text-slate-400 text-center">
                      Enter a name above to see the preview
                    </p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 min-h-96 flex flex-col items-center justify-center">
                    <div className="grid grid-cols-4 gap-4 w-full">
                      {nameLetters.map((letter, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-center rounded-lg bg-white shadow-sm transition-all hover:shadow-md ${getSizeClasses(
                            size
                          )} ${getStyleClasses(style)}`}
                          style={{
                            borderColor:
                              style === 'cursive' ? 'transparent' : THEME.primary,
                            fontWeight: style === 'cursive' ? '400' : '600',
                            fontFamily:
                              style === 'cursive'
                                ? 'cursive'
                                : 'inherit',
                            color: THEME.primary,
                          }}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                    <p className="mt-8 text-sm text-slate-500">
                      {nameLetters.length} letter{nameLetters.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Upsell Banner */}
          <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-0 p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Unlock More Features
                </h3>
                <p className="text-slate-600">
                  Add personalized name headers to ALL your worksheets and access unlimited templates
                </p>
              </div>
              <Link href="/generator">
                <Button
                  className="text-white font-semibold px-6 py-3 rounded-xl whitespace-nowrap btn-premium shadow-md flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #2E5C8A, #1e40af)' }}
                >
                  Go to Generator
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
