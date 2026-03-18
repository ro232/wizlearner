'use client';

import React, { useState } from 'react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { CATEGORY_TABS, EMOJI_MAP, FREE_LIMITS, UPPERCASE_LETTERS, LOWERCASE_LETTERS, PAIRED_LETTERS, NUMBERS, SHAPES, THEME } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, RotateCcw, Printer, Download, Plus, X } from 'lucide-react';

interface GeneratorControlsProps {
  onShowPaywall: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
}

export function GeneratorControls({ onShowPaywall, onDownload, onPrint }: GeneratorControlsProps) {
  const {
    config,
    tier,
    setCategory,
    setLetterMode,
    toggleItem,
    addItems,
    removeAllItems,
    addCustomWord,
    setDifficulty,
    setFontStyle,
    setLetterSize,
    setVisibility,
    setBackgroundPattern,
    setGuideColor,
    setRowsPerPage,
    toggleGuideLines,
    toggleArrows,
    toggleEmoji,
    toggleReward,
    toggleFullPage,
    toggleLeftHanded,
    setChildName,
    resetConfig,
  } = useWorksheetStore();

  const [customWordInput, setCustomWordInput] = useState('');
  const [childNameInput, setChildNameInput] = useState(config.childName);

  // Determine free items based on tier and category
  const getFreeItems = (): string[] => {
    if (config.category === 'letters') {
      return tier === 'free' ? [...FREE_LIMITS.letters] : [...UPPERCASE_LETTERS];
    }
    if (config.category === 'numbers') {
      return tier === 'free' ? [...FREE_LIMITS.numbers] : [...NUMBERS];
    }
    if (config.category === 'shapes') {
      return tier === 'free' ? [...FREE_LIMITS.shapes] : [...SHAPES];
    }
    return [];
  };

  // Get all items for the current category
  const getAllItems = (): string[] => {
    if (config.category === 'letters') {
      if (config.letterMode === 'uppercase') return [...UPPERCASE_LETTERS];
      if (config.letterMode === 'lowercase') return [...LOWERCASE_LETTERS];
      if (config.letterMode === 'paired') return [...PAIRED_LETTERS];
    }
    if (config.category === 'numbers') return [...NUMBERS];
    if (config.category === 'shapes') return [...SHAPES];
    return [];
  };

  const allItems = getAllItems();
  const freeItems = getFreeItems();
  const isItemFree = (item: string) => freeItems.includes(item);

  // Handle adding all free items
  const handleAddAllFree = () => {
    addItems(freeItems);
  };

  // Handle adding custom word
  const handleAddCustomWord = () => {
    if (customWordInput.trim()) {
      addCustomWord(customWordInput.trim());
      setCustomWordInput('');
    }
  };

  // Handle item click with paywall check for locked items
  const handleItemClick = (item: string) => {
    if (!isItemFree(item) && tier === 'free') {
      onShowPaywall();
    } else {
      toggleItem(item);
    }
  };

  // Get emoji for letter
  const getEmoji = (item: string) => {
    if (config.letterMode === 'paired') {
      const letter = item[0];
      return EMOJI_MAP[letter] || '✨';
    }
    if (config.category === 'letters') {
      const letter = item.toUpperCase();
      return EMOJI_MAP[letter] || '✨';
    }
    return null;
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-6 overflow-y-auto max-h-screen">
      {/* Header with Controls */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetConfig}
            className="h-9 w-9 p-0"
            title="Reset all settings"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="h-9 w-9 p-0"
            title="Print worksheet"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="h-9 w-9 p-0"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Child's Name Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Child&apos;s Name</label>
        <input
          type="text"
          value={childNameInput}
          onChange={(e) => {
            setChildNameInput(e.target.value);
            setChildName(e.target.value);
          }}
          placeholder="Enter child's name"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Content Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_TABS.map((tab) => {
            const isLocked = tab.locked && tier === 'free';
            const isActive = config.category === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isLocked) {
                    onShowPaywall();
                  } else {
                    setCategory(tab.id);
                  }
                }}
                className={`relative p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  isActive
                    ? `border-current bg-opacity-10`
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={
                  isActive
                    ? {
                        borderColor: THEME.categories[tab.id as keyof typeof THEME.categories],
                        backgroundColor:
                          THEME.categories[tab.id as keyof typeof THEME.categories] + '15',
                      }
                    : {}
                }
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-xs font-medium text-center leading-tight text-slate-700">
                  {tab.label}
                </span>
                {isLocked && (
                  <div className="absolute top-1 right-1">
                    <Lock className="w-3 h-3 text-red-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Letter Mode Toggle (for letters category) */}
      {config.category === 'letters' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Letter Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: 'uppercase' as const, label: 'A B C', display: 'Uppercase' },
              { mode: 'lowercase' as const, label: 'a b c', display: 'Lowercase' },
              { mode: 'paired' as const, label: 'Aa Bb', display: 'Paired' },
            ].map(({ mode, label, display }) => (
              <button
                key={mode}
                onClick={() => setLetterMode(mode)}
                className={`p-2 rounded-lg border-2 transition-all text-center ${
                  config.letterMode === mode
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold">{label}</div>
                <div className="text-xs text-slate-600">{display}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Item Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Items ({config.selectedItems.length})
          </label>
        </div>
        <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
          {allItems.map((item) => {
            const isFree = isItemFree(item);
            const isSelected = config.selectedItems.includes(item);
            const emoji = getEmoji(item);

            return (
              <button
                key={item}
                onClick={() => handleItemClick(item)}
                disabled={!isFree && tier === 'free'}
                className={`relative p-2 rounded-lg border-2 transition-all aspect-square flex items-center justify-center text-sm font-bold ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : isFree
                      ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'
                      : 'border-slate-200 bg-slate-100 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex flex-col items-center">
                  {emoji && config.showLetterIcons && (
                    <span className="text-xs mb-0.5">{emoji}</span>
                  )}
                  <span>{item}</span>
                </div>
                {!isFree && tier === 'free' && (
                  <div className="absolute top-0.5 right-0.5">
                    <Lock className="w-3 h-3 text-amber-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Add All Free / Remove All Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddAllFree}
            className="flex-1 text-xs"
          >
            Add All Free
            {freeItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {freeItems.length}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={removeAllItems}
            className="flex-1 text-xs"
          >
            Remove All
          </Button>
        </div>
      </div>

      {/* Custom Word/Name Input */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Custom Word
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customWordInput}
            onChange={(e) => setCustomWordInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddCustomWord();
              }
            }}
            placeholder="e.g., CAT, DOG"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            size="sm"
            onClick={handleAddCustomWord}
            className="h-10 w-10 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {config.customWords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {config.customWords.map((word) => (
              <Badge
                key={word}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-slate-300"
                onClick={() => {
                  // This would need a removeCustomWord action in the store
                }}
              >
                {word}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Difficulty Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Quick Difficulty
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { difficulty: 'beginner' as const, icon: '🌱', label: 'Beginner' },
            { difficulty: 'intermediate' as const, icon: '🌿', label: 'Intermediate' },
            { difficulty: 'advanced' as const, icon: '🌳', label: 'Advanced' },
          ].map(({ difficulty, icon, label }) => (
            <button
              key={difficulty}
              onClick={() => setDifficulty(difficulty)}
              className={`p-2 rounded-lg border-2 transition-all text-center ${
                config.difficulty === difficulty
                  ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="text-lg">{icon}</div>
              <div className="text-xs mt-1 font-medium">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Style */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Font Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['dashed', 'dotted', 'outline', 'cursive'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setFontStyle(style)}
              className={`p-2 rounded-lg border-2 transition-all text-center capitalize ${
                config.fontStyle === style
                  ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="text-sm font-bold">{style}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Letter Size */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Letter Size
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setLetterSize(size)}
              className={`p-2 rounded-lg border-2 transition-all text-center capitalize ${
                config.letterSize === size
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div
                className="font-bold"
                style={{
                  fontSize: size === 'small' ? '14px' : size === 'medium' ? '18px' : '22px',
                }}
              >
                A
              </div>
              <div className="text-xs mt-1">{size}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rows Per Page */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Rows per Page
          </label>
          <Badge variant="secondary">{config.rowsPerPage}</Badge>
        </div>
        <input
          type="range"
          min="3"
          max="8"
          value={config.rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-600">
          <span>3</span>
          <span>8</span>
        </div>
      </div>

      {/* Tracing Visibility */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Tracing Visibility
          </label>
          <Badge variant="secondary">{config.tracingVisibility}</Badge>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={config.tracingVisibility}
          onChange={(e) => setVisibility(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-600">
          <span>Hard</span>
          <span>Easy</span>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Background Pattern
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { pattern: 'blank' as const, label: 'Blank' },
            { pattern: 'grid' as const, label: 'Grid' },
            { pattern: 'guides' as const, label: 'Writing Guides' },
            { pattern: 'patratele' as const, label: 'Pătrățele' },
            { pattern: 'dictando' as const, label: 'Dictando' },
            { pattern: 'lines' as const, label: 'Lines' },
          ].map(({ pattern, label }) => (
            <button
              key={pattern}
              onClick={() => setBackgroundPattern(pattern)}
              className={`p-2 rounded-lg border-2 transition-all text-center text-xs capitalize ${
                config.backgroundPattern === pattern
                  ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Line Color */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Guide Line Color
        </label>
        <div className="flex gap-3">
          {[
            { color: 'gray' as const, hex: '#9CA3AF' },
            { color: 'green' as const, hex: '#10B981' },
            { color: 'orange' as const, hex: '#F97316' },
            { color: 'purple' as const, hex: '#A855F7' },
          ].map(({ color, hex }) => (
            <button
              key={color}
              onClick={() => setGuideColor(color)}
              className={`w-8 h-8 rounded-full border-3 transition-all ${
                config.guideColor === color
                  ? 'border-slate-900 scale-110'
                  : 'border-slate-300'
              }`}
              style={{ backgroundColor: hex }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Toggle Switches */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        {[
          { label: 'Letter Icons (Emoji)', checked: config.showLetterIcons, onChange: toggleEmoji },
          {
            label: 'Directional Arrows',
            checked: config.showDirectionalArrows,
            onChange: toggleArrows,
          },
          { label: 'Guide Lines', checked: config.showGuideLines, onChange: toggleGuideLines },
          {
            label: 'Reward Section',
            checked: config.showRewardSection,
            onChange: toggleReward,
          },
          { label: 'Full Page Mode', checked: config.fullPageMode, onChange: toggleFullPage },
          {
            label: 'Left-handed Mode',
            checked: config.leftHandedMode,
            onChange: toggleLeftHanded,
          },
        ].map(({ label, checked, onChange }) => (
          <label
            key={label}
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={onChange}
              className="w-4 h-4 rounded border-slate-300 cursor-pointer"
            />
            <span className="text-sm font-medium text-slate-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
