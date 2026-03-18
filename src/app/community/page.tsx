'use client';

import { useState } from 'react';
// import Link from 'next/link';
import { Star, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { THEME } from '@/lib/constants';

type CategoryId = 'all' | 'letters' | 'numbers' | 'shapes' | 'math' | 'seasonal';

const categories: { id: CategoryId; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: THEME.primary },
  { id: 'letters', label: 'Letters', color: THEME.categories.letters },
  { id: 'numbers', label: 'Numbers', color: THEME.categories.numbers },
  { id: 'shapes', label: 'Shapes', color: THEME.categories.shapes },
  { id: 'math', label: 'Math', color: THEME.categories.math },
  { id: 'seasonal', label: 'Seasonal', color: '#EC4899' },
];

const mockTemplates = [
  {
    id: 1,
    name: 'Alphabet Starter Pack',
    creator: 'Sarah Chen',
    rating: 4.8,
    downloads: 2341,
    category: 'letters' as const,
    gradient: `linear-gradient(135deg, ${THEME.categories.letters}, #60a5fa)`,
  },
  {
    id: 2,
    name: 'Numbers 1-10 Fun',
    creator: 'Mike Johnson',
    rating: 4.9,
    downloads: 1856,
    category: 'numbers' as const,
    gradient: `linear-gradient(135deg, ${THEME.categories.numbers}, #34d399)`,
  },
  {
    id: 3,
    name: 'Holiday Letters',
    creator: 'Emily Rodriguez',
    rating: 4.7,
    downloads: 1203,
    category: 'seasonal' as const,
    gradient: `linear-gradient(135deg, #EC4899, #f472b6)`,
  },
  {
    id: 4,
    name: 'Math Basics Bundle',
    creator: 'David Park',
    rating: 4.6,
    downloads: 987,
    category: 'math' as const,
    gradient: `linear-gradient(135deg, ${THEME.categories.math}, #fb923c)`,
  },
  {
    id: 5,
    name: 'Shape Recognition Fun',
    creator: 'Jessica Lee',
    rating: 5.0,
    downloads: 1654,
    category: 'shapes' as const,
    gradient: `linear-gradient(135deg, ${THEME.categories.shapes}, #a78bfa)`,
  },
  {
    id: 6,
    name: 'Cursive Intro Letters',
    creator: 'Tom Wilson',
    rating: 4.5,
    downloads: 823,
    category: 'letters' as const,
    gradient: `linear-gradient(135deg, ${THEME.categories.letters}, #3b82f6)`,
  },
  {
    id: 7,
    name: 'Counting Coloring Mix',
    creator: 'Lisa Anderson',
    rating: 4.8,
    downloads: 1432,
    category: 'numbers' as const,
    gradient: `linear-gradient(135deg, ${THEME.categories.numbers}, #10b981)`,
  },
  {
    id: 8,
    name: 'Spring Activities Pack',
    creator: 'Chris Martinez',
    rating: 4.7,
    downloads: 1122,
    category: 'seasonal' as const,
    gradient: `linear-gradient(135deg, #EC4899, #db2777)`,
  },
];

const sortOptions = [
  { id: 'popular', label: 'Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'toprated', label: 'Top Rated' },
];

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [sortBy, setSortBy] = useState('popular');

  const filteredTemplates = selectedCategory === 'all'
    ? mockTemplates
    : mockTemplates.filter((t) => t.category === selectedCategory);

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.id - a.id;
      case 'toprated':
        return b.rating - a.rating;
      default:
        return b.downloads - a.downloads;
    }
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: THEME.bg }}>
      <Navbar />

      <div className="flex-1">
        {/* Hero Section */}
        <div className="py-16 px-4 sm:px-6 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 text-slate-900">
              Community Templates
            </h1>
            <p className="text-xl text-slate-600">
              Discover and share worksheet configurations created by educators worldwide
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          {/* Category Filter */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">
              Category
            </h2>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    selectedCategory === cat.id
                      ? 'text-white shadow-lg'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  style={{
                    background: selectedCategory === cat.id ? cat.color : undefined,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-semibold text-slate-600">
              Showing {sortedTemplates.length} template{sortedTemplates.length !== 1 ? 's' : ''}
            </h3>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2"
                style={{ outlineColor: THEME.primary }}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {sortedTemplates.map((template) => (
              <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Color Header */}
                <div
                  className="h-24 rounded-t-2xl"
                  style={{ background: template.gradient }}
                />

                {/* Content */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                      {template.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{template.creator}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5"
                        style={{
                          fill: i < Math.floor(template.rating) ? THEME.accent : '#e2e8f0',
                          color: i < Math.floor(template.rating) ? THEME.accent : '#e2e8f0',
                        }}
                      />
                    ))}
                    <span className="text-xs text-slate-600 ml-1">
                      {template.rating}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Download className="w-3.5 h-3.5" />
                    <span>{template.downloads.toLocaleString()} downloads</span>
                  </div>

                  {/* Category Badge */}
                  <Badge
                    className="w-fit text-xs font-medium"
                    style={{
                      backgroundColor: `${template.category === 'seasonal' ? '#EC4899' : THEME.categories[template.category as keyof typeof THEME.categories]}20`,
                      color: template.category === 'seasonal' ? '#EC4899' : THEME.categories[template.category as keyof typeof THEME.categories],
                      border: 'none',
                    }}
                  >
                    {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                  </Badge>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 text-xs font-medium py-2 rounded-lg"
                      style={{
                        background: THEME.primary,
                        color: 'white',
                      }}
                    >
                      Use Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Share CTA Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Share Your Template
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Have a great worksheet configuration? Share it with the WorksheetWiz community and help other educators discover new ways to engage their students.
            </p>
            <Button
              className="text-white font-semibold px-8 py-3 rounded-xl btn-premium shadow-lg"
              style={{ background: 'linear-gradient(135deg, #E8913A, #d97706)' }}
            >
              Submit Your Template
            </Button>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
