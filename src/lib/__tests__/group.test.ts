import { describe, expect, it } from 'vitest';
import { buildGroupPages, parseNames, MAX_CHILDREN } from '@/lib/worksheet/group';
import { THEMES } from '@/lib/themes';
import { hasIcon } from '@/lib/hints/icons';
import { opsOutside } from './bounds';

describe('group sheets', () => {
  it('reads a pasted class list', () => {
    expect(parseNames('1. Ana Popescu\n2) ştefan\n\nAna Popescu, Maria-Ioana ; Luca')).toEqual(['Ana Popescu', 'ștefan', 'Maria-Ioana', 'Luca']);
    expect(parseNames(Array.from({ length: 60 }, (_, i) => `Copil ${i}`).join('\n'))).toHaveLength(MAX_CHILDREN);
  });

  it('every theme word has a picture', () => {
    for (const t of THEMES) for (const w of t.words) expect(hasIcon(w.emoji), `${t.id} ${w.word}`).toBe(true);
  });

  for (const theme of THEMES) {
    for (const letterMode of ['uppercase', 'paired'] as const) {
      it(`fits one child on one A4 page: ${theme.id}, ${letterMode}`, () => {
        const { pages, perChild } = buildGroupPages({
          names: ['Ana', 'Maria-Magdalena Ionescu'],
          themeId: theme.id,
          letters: ['A', 'M'],
          letterMode,
          difficulty: 'beginner',
        });
        expect(perChild).toEqual([1, 1]);
        for (const p of pages) expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 })).toEqual([]);
      });
    }
  }
});
