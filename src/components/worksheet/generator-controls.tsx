'use client';

import React, { useState } from 'react';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { CATEGORY_TABS, NUMBERS, SHAPES, THEME } from '@/lib/constants';
import { isItemAllowed } from '@/lib/access';
import { isWordAllowed } from '@/lib/worksheet/layout';
import { uppercaseLetters, lowercaseLetters, pairedLetters, hintFor } from '@/lib/glyphs/data';
import { PATTERN_IDS, PATTERN_ICONS, PATTERN_LABELS, isPatternId } from '@/lib/glyphs/patterns';
import { COUNT_RANGES, DOT_SHAPES, DOT_SHAPE_LABELS } from '@/lib/worksheet/activities';
import { Button } from '@/components/ui/button';
import { Lock, RotateCcw, Plus, X, ChevronDown, UserRound } from 'lucide-react';

interface GeneratorControlsProps {
  onShowPaywall: () => void;
}

const SHAPE_LABELS: Record<string, string> = {
  circle: 'cerc', square: 'pătrat', triangle: 'triunghi', rectangle: 'dreptunghi', oval: 'oval',
  diamond: 'romb', star: 'stea', heart: 'inimă', hexagon: 'hexagon', pentagon: 'pentagon',
};

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">{children}</span>
      {right}
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`p-2 rounded-lg border-2 transition-all text-center ${active ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, onChange, left, right }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; left: string; right: string }) {
  return (
    <div>
      <SectionLabel right={<span className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{value}</span>}>{label}</SectionLabel>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
      <div className="flex justify-between text-xs text-slate-500"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

export function GeneratorControls({ onShowPaywall }: GeneratorControlsProps) {
  const {
    config, tier, setCategory, setAlphabet, setLetterMode, toggleItem, addItems, removeAllItems,
    addCustomWord, removeCustomWord, setDifficulty, setFontStyle, setLetterSize, setVisibility,
    setBackgroundPattern, setGuideColor, setRowsPerPage, setRepetitionsPerItem, toggleGuideLines,
    toggleArrows, toggleStartDots, toggleEmoji, toggleReward, toggleFullPage, toggleLeftHanded,
    toggleFillPage, setChildName, resetConfig,
  } = useWorksheetStore();

  const [wordInput, setWordInput] = useState('');
  const alphabet = config.alphabet ?? 'ro';

  const allItems: string[] = (() => {
    switch (config.category) {
      case 'letters':
        return config.letterMode === 'lowercase' ? lowercaseLetters(alphabet) : config.letterMode === 'paired' ? pairedLetters(alphabet) : uppercaseLetters(alphabet);
      case 'numbers':
        return [...NUMBERS];
      case 'shapes':
        return [...SHAPES];
      case 'prewrite':
        return [...PATTERN_IDS];
      case 'games':
        return [...uppercaseLetters(alphabet).map((l) => `find:${l}`), ...COUNT_RANGES, ...DOT_SHAPES.map((d) => `dots:${d}`)];
      default:
        return [];
    }
  })();

  const isFree = (item: string) => isItemAllowed(item, config.category, tier);
  const usable = allItems.filter(isFree);

  const handleItemClick = (item: string) => {
    if (!isFree(item)) onShowPaywall();
    else toggleItem(item);
  };

  const addWord = (word: string, isName = false) => {
    const w = word.trim();
    if (!w) return;
    if (!isName && !isWordAllowed(w, tier)) {
      onShowPaywall();
      return;
    }
    addCustomWord(w);
  };

  const nameAdded = !!config.childName.trim() && config.customWords.includes(config.childName.trim());
  const pickTitle = { letters: 'Alege literele', numbers: 'Alege cifrele', shapes: 'Alege formele', prewrite: 'Alege exercițiile', games: 'Alege jocurile' }[config.category as 'letters'] ?? 'Alege';

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-5 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-900">Fișa ta</h2>
        <Button variant="outline" size="sm" onClick={resetConfig} className="h-9 gap-1.5 text-xs" title="Pornește de la zero">
          <RotateCcw className="w-3.5 h-3.5" /> De la zero
        </Button>
      </div>

      {/* 1. What we practise */}
      <div>
        <SectionLabel>Ce exersăm</SectionLabel>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CATEGORY_TABS.map((tab) => {
            const active = config.category === tab.id;
            const color = THEME.categories[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                aria-pressed={active}
                className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${active ? '' : 'border-slate-200 hover:border-slate-300'}`}
                style={active ? { borderColor: color, backgroundColor: `${color}15` } : {}}
              >
                <span className="text-xl" aria-hidden>{tab.icon}</span>
                <span className="text-xs font-medium text-center leading-tight text-slate-700">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {config.category === 'letters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <SectionLabel>Alfabet</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={alphabet === 'ro'} onClick={() => setAlphabet('ro')}><div className="text-sm font-bold">Română</div><div className="text-[11px] text-slate-500">cu Ă Â Î Ș Ț</div></Choice>
              <Choice active={alphabet === 'en'} onClick={() => setAlphabet('en')}><div className="text-sm font-bold">Engleză</div><div className="text-[11px] text-slate-500">A–Z</div></Choice>
            </div>
          </div>
          <div>
            <SectionLabel>Litere</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <Choice active={config.letterMode === 'uppercase'} onClick={() => setLetterMode('uppercase')}><div className="text-sm font-bold">A B</div><div className="text-[11px] text-slate-500">mari</div></Choice>
              <Choice active={config.letterMode === 'lowercase'} onClick={() => setLetterMode('lowercase')}><div className="text-sm font-bold">a b</div><div className="text-[11px] text-slate-500">mici</div></Choice>
              <Choice active={config.letterMode === 'paired'} onClick={() => setLetterMode('paired')}><div className="text-sm font-bold">Aa</div><div className="text-[11px] text-slate-500">perechi</div></Choice>
            </div>
          </div>
        </div>
      )}

      {/* 2. Which items */}
      <div>
        <SectionLabel right={<span className="text-xs text-slate-500">{config.selectedItems.length} alese</span>}>{pickTitle}</SectionLabel>
        {config.category === 'games' ? (
          <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            {[
              { title: 'Găsește litera', text: 'O grilă de litere: copilul o colorează pe cea cerută.', items: allItems.filter((i) => i.startsWith('find:')), cols: 'grid-cols-8 sm:grid-cols-11', show: (i: string) => i.slice(5) },
              { title: 'Numără și scrie', text: 'Imagini de numărat și căsuța pentru număr.', items: [...COUNT_RANGES] as string[], cols: 'grid-cols-2', show: (i: string) => `1–${i.slice(6)}` },
              { title: 'Unește punctele', text: 'Puncte numerotate care se transformă într-un desen.', items: DOT_SHAPES.map((d) => `dots:${d}`), cols: 'grid-cols-3 sm:grid-cols-6', show: (i: string) => DOT_SHAPE_LABELS[i.slice(5) as keyof typeof DOT_SHAPE_LABELS] },
            ].map((group) => (
              <div key={group.title}>
                <div className="font-extrabold text-ink">{group.title}</div>
                <div className="text-xs text-slate-600 mb-2">{group.text} O pagină pentru fiecare.</div>
                <div className={`grid gap-1.5 ${group.cols}`}>
                  {group.items.map((item) => {
                    const free = isFree(item);
                    const selected = config.selectedItems.includes(item);
                    return (
                      <button key={item} type="button" onClick={() => handleItemClick(item)} aria-pressed={selected}
                        aria-label={`${group.title}: ${group.show(item)}${free ? '' : ' (versiunea completă)'}`}
                        className={`relative min-h-[2.5rem] px-1 rounded-lg border-2 text-sm font-bold ${selected ? 'border-blue-500 bg-blue-50 text-blue-700' : free ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-300' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
                        {group.show(item)}
                        {!free && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className={`grid gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 ${config.category === 'prewrite' || config.category === 'shapes' ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-6 sm:grid-cols-7 lg:grid-cols-8'}`}>
          {allItems.map((item) => {
            const free = isFree(item);
            const selected = config.selectedItems.includes(item);
            const hint = config.category === 'letters' && config.showLetterIcons ? hintFor(item, alphabet) : undefined;
            const label = isPatternId(item) ? PATTERN_LABELS[alphabet][item] : config.category === 'shapes' ? SHAPE_LABELS[item] ?? item : item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleItemClick(item)}
                aria-pressed={selected}
                aria-label={free ? label : `${label} (versiunea completă)`}
                className={`relative min-h-[3rem] p-1 rounded-lg border-2 transition-all flex flex-col items-center justify-center text-sm font-bold ${
                  selected ? 'border-blue-500 bg-blue-50 text-blue-700' : free ? 'border-slate-300 bg-white text-slate-700 hover:border-blue-300' : 'border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                {hint && <span className="text-[11px] leading-none mb-0.5" aria-hidden>{hint.emoji}</span>}
                {isPatternId(item) ? (
                  <>
                    <span className="text-base leading-none" aria-hidden>{PATTERN_ICONS[item]}</span>
                    <span className="text-[10px] font-medium leading-tight text-center mt-1">{label}</span>
                  </>
                ) : config.category === 'shapes' ? (
                  <span className="text-[11px] font-medium">{label}</span>
                ) : (
                  <span>{item}</span>
                )}
                {!free && <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-600" aria-hidden />}
              </button>
            );
          })}
        </div>
        )}
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => addItems(usable)} className="flex-1 text-xs">
            {tier === 'free' ? `Adaugă toate gratuite (${usable.length})` : `Adaugă toate (${usable.length})`}
          </Button>
          <Button size="sm" variant="outline" onClick={removeAllItems} className="flex-1 text-xs" disabled={config.selectedItems.length === 0}>
            Golește
          </Button>
        </div>
      </div>

      {/* 3. Child's name and words */}
      <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
        <div>
          <label htmlFor="child-name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            <UserRound className="w-3.5 h-3.5" aria-hidden /> Numele copilului
          </label>
          <div className="flex gap-2">
            <input
              id="child-name"
              type="text"
              value={config.childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="ex. Ștefan"
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" variant="outline" className="h-10 text-xs whitespace-nowrap" disabled={!config.childName.trim() || nameAdded} onClick={() => addWord(config.childName, true)}>
              {nameAdded ? 'Adăugat' : 'Trasează-l'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Apare în antetul fișei. Cu „Trasează-l” devine și rând de scris.</p>
        </div>
        {/* Games draw their own page: no extra words to trace there. */}
        <div className={config.category === 'games' ? 'hidden' : undefined}>
          <label htmlFor="custom-word" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Cuvinte de trasat</label>
          <div className="flex gap-2">
            <input
              id="custom-word"
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addWord(wordInput);
                  setWordInput('');
                }
              }}
              placeholder={alphabet === 'ro' ? 'ex. MAMA, toamna' : 'e.g. CAT'}
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" onClick={() => { addWord(wordInput); setWordInput(''); }} className="h-10 w-10 p-0" aria-label="Adaugă cuvântul">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {config.customWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {config.customWords.map((word) => (
                <button key={word} type="button" onClick={() => removeCustomWord(word)} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-red-400 hover:bg-red-50" aria-label={`Scoate ${word}`}>
                  {word} <X className="w-3 h-3" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Level (not used by the games) */}
      <div className={config.category === 'games' ? 'hidden' : undefined}>
        <SectionLabel>Nivel</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['beginner', '🌱', 'Început', 'cu mult ajutor'],
            ['intermediate', '🌿', 'Mijlociu', 'ajutor parțial'],
            ['advanced', '🌳', 'Avansat', 'mai mult singur'],
          ] as const).map(([d, icon, label, sub]) => (
            <Choice key={d} active={config.difficulty === d} onClick={() => setDifficulty(d)}>
              <div className="text-lg" aria-hidden>{icon}</div>
              <div className="text-xs font-semibold">{label}</div>
              <div className="text-[10px] text-slate-500">{sub}</div>
            </Choice>
          ))}
        </div>
      </div>

      {/* 5. Everything else */}
      <details className="group rounded-xl border border-slate-200">
        <summary className="flex items-center justify-between cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700">
          Mai multe opțiuni
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-4 pb-4 space-y-5">
          <div>
            <SectionLabel>Stil de trasare</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {([['dashed', 'Liniuțe'], ['dotted', 'Puncte'], ['outline', 'Contur']] as const).map(([v, l]) => (
                <Choice key={v} active={config.fontStyle === v} onClick={() => setFontStyle(v)}><span className="text-sm">{l}</span></Choice>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Mărimea literelor</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {([['small', 'Mici', 14], ['medium', 'Medii', 18], ['large', 'Mari', 22]] as const).map(([v, l, px]) => (
                <Choice key={v} active={config.letterSize === v} onClick={() => setLetterSize(v)}>
                  <div className="font-bold" style={{ fontSize: px }}>A</div>
                  <div className="text-[11px]">{l}</div>
                </Choice>
              ))}
            </div>
          </div>
          <Slider label="Rânduri pe pagină" value={config.rowsPerPage} min={3} max={8} onChange={setRowsPerPage} left="3" right="8" />
          <Slider label="Rânduri pentru fiecare" value={config.repetitionsPerItem} min={1} max={5} onChange={setRepetitionsPerItem} left="1" right="5" />
          <Slider label="Cât de vizibil e modelul" value={config.tracingVisibility} min={1} max={10} onChange={setVisibility} left="abia se vede" right="foarte clar" />
          <div>
            <SectionLabel>Fundal</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {([['guides', 'Liniatură'], ['dictando', 'Dictando'], ['patratele', 'Pătrățele'], ['lines', 'Linii'], ['grid', 'Grilă'], ['blank', 'Alb']] as const).map(([v, l]) => (
                <Choice key={v} active={config.backgroundPattern === v} onClick={() => setBackgroundPattern(v)}><span className="text-xs">{l}</span></Choice>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Culoarea liniilor</SectionLabel>
            <div className="flex gap-3">
              {([['gray', '#9CA3AF', 'gri'], ['green', '#10B981', 'verde'], ['orange', '#F97316', 'portocaliu'], ['purple', '#A855F7', 'mov']] as const).map(([c, hex, name]) => (
                <button key={c} type="button" onClick={() => setGuideColor(c)} aria-label={`Linii ${name}`} aria-pressed={config.guideColor === c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${config.guideColor === c ? 'border-slate-900 scale-110' : 'border-slate-300'}`} style={{ backgroundColor: hex }} />
              ))}
            </div>
          </div>
          <div className="space-y-1 pt-3 border-t border-slate-200">
            {([
              ['Imagini lângă litere', config.showLetterIcons, toggleEmoji],
              ['Săgeți de direcție', config.showDirectionalArrows, toggleArrows],
              ['Puncte de start numerotate', config.showStartDots !== false, toggleStartDots],
              ['Liniatură', config.showGuideLines, toggleGuideLines],
              ['Umple pagina cu repetiții', config.fillPage !== false, toggleFillPage],
              ['Stelele de recompensă', config.showRewardSection, toggleReward],
              ['Fără antet (doar rânduri)', config.fullPageMode, toggleFullPage],
              ['Pentru stângaci', config.leftHandedMode, toggleLeftHanded],
            ] as [string, boolean, () => void][]).map(([label, checked, onChange]) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-slate-300 cursor-pointer" />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
