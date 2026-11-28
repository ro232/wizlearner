import { expect, test, type Page } from '@playwright/test';
import { expectNoSidewaysScroll, expectPdfDownload, watchErrors } from './helpers';

/**
 * „Lecția literei” (lesson-panel.tsx) and „Grupuri de litere” in the letter picker. On the free plan
 * (a build without NEXT_PUBLIC_OPEN_ACCESS) the lesson's M is locked: the test takes C, a free letter,
 * whose sheet has the letter and its free syllables (ca, că, câ).
 */

const download = (page: Page) => page.getByRole('button', { name: /^Descarcă PDF/ }).last();
const pageCount = async (page: Page) => {
  const text = (await page.locator('[data-page-count]').textContent()) ?? '';
  return text === 'Iese o pagină' ? 1 : Number(/Ies (\d+)/.exec(text)?.[1]);
};
const letter = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).first();
const locked = async (page: Page, name: string) => (await page.getByRole('button', { name: `${name} (varianta completă)`, exact: true }).count()) > 0;

test.describe('lecția literei', () => {
  test('the ready-made lesson: a letter, a suggested sentence, a count, the PDF', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/generator?fisa=lectia-literei&clasa=CP');
    await page.locator('[data-ready]').waitFor();
    const panel = page.locator('[data-lesson-panel]');
    await expect(panel).toBeVisible();
    await expect(page.locator('[data-sheet-kind]').getByRole('button', { name: /Lecția literei/ })).toHaveAttribute('aria-pressed', 'true');
    const free = await locked(page, 'M');

    if (free) {
      await letter(page, 'C').click();
      await expect(letter(page, 'C')).toHaveAttribute('aria-pressed', 'true');
      await expect(panel.locator('[data-lesson-part="syll"]')).toContainText('CA CO CU CĂ CÂ');
      // the words of C load (on the free plan their letters past A–E keep them off the sheet)
      await expect(panel.locator('[data-lesson-word]').first()).toBeVisible();
    } else {
      await expect(letter(page, 'M')).toHaveAttribute('aria-pressed', 'true');
      await letter(page, 'P').click();
      await expect(letter(page, 'P')).toHaveAttribute('aria-pressed', 'true');
      // the words of P load (shortest first) and the sentence suggestions of P
      await expect(panel.locator('[data-lesson-word="pom"][aria-pressed="true"]')).toBeVisible();
      const suggestion = panel.locator('[data-sentence-suggestion]').first();
      const text = (await suggestion.textContent())!.trim();
      await suggestion.click();
      await expect(page.locator('#lesson-sentence')).toHaveValue(text);
      await expect(suggestion).toHaveAttribute('aria-pressed', 'true');
    }

    // more letter rows: the pages follow, and the download button says so
    const before = await pageCount(page);
    const more = panel.getByRole('button', { name: 'Mai multe rânduri pentru Litera' });
    for (let i = 0; i < 4; i++) await more.click();
    await expect(panel.locator('[data-lesson-part="letter"] output')).toHaveText('8');
    await expect(more).toBeDisabled();
    const moreSyll = panel.getByRole('button', { name: 'Mai multe rânduri pentru Silabe' });
    for (let i = 0; i < 5; i++) await moreSyll.click();
    await expect(panel.locator('[data-lesson-part="syll"] output')).toHaveText('6');
    await expect.poll(() => pageCount(page)).toBeGreaterThan(before);
    const after = await pageCount(page);
    await expect(download(page)).toHaveText(new RegExp(`\\(${after} (de )?pagini\\)`));
    // 0 takes a part off the sheet
    const fewer = panel.getByRole('button', { name: 'Mai puține rânduri pentru Litera' });
    for (let i = 0; i < 8; i++) await fewer.click();
    await expect(fewer).toBeDisabled();
    await expect.poll(() => pageCount(page)).toBeLessThan(after);
    await panel.getByRole('button', { name: 'Mai multe rânduri pentru Litera' }).click();
    await expectPdfDownload(page, () => download(page).click());
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });

  test('„Altă variantă” traces the next words; back to free letters', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/generator?fisa=lectia-literei&clasa=CP');
    await page.locator('[data-ready]').waitFor();
    await expect(page.locator('[data-lesson-panel]')).toBeVisible();
    test.skip(await locked(page, 'M'), 'free plan: the lesson of M is in the full version');
    await page.locator('[data-variant-button]').click();
    await expect(page.locator('[data-variant-note]')).toContainText('Varianta 2: aceeași lecție, alte cuvinte');
    // „Litere la alegere”: the picker chooses several letters again, with rows for each
    await page.locator('[data-sheet-kind]').getByRole('button', { name: /Litere la alegere/ }).click();
    await expect(page.locator('[data-lesson-panel]')).toHaveCount(0);
    await letter(page, 'A').click();
    await expect(page.locator('[data-item-rows] li')).toHaveCount(2);
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });
});

test('a group of letters in the free picker: chosen like a letter, with its own rows', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/generator');
  await page.locator('[data-ready]').waitFor();
  await page.getByRole('button', { name: 'De la zero' }).click();
  const groups = page.locator('[data-letter-groups]');
  await expect(groups.getByRole('button')).toHaveCount(8);
  const che = groups.getByRole('button', { name: /^Grupul CHE/ });
  if ((await che.getAttribute('aria-label'))?.includes('varianta completă')) {
    // free plan: CHE (with H) is in the full version, CE (C and E) is free
    await che.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await groups.getByRole('button', { name: 'Grupul CE', exact: true }).click();
    await expect(page.locator('[data-item-rows] li[data-item="CE"]')).toBeVisible();
  } else {
    await che.click();
    await expect(che).toHaveAttribute('aria-pressed', 'true');
    const row = page.locator('[data-item-rows] li[data-item="CHE"]');
    await expect(row).toBeVisible();
    const before = await pageCount(page);
    for (let i = 0; i < 6; i++) await row.getByRole('button', { name: 'Mai multe rânduri pentru CHE' }).click();
    await expect(row.locator('output')).toHaveText('7');
    await expect.poll(() => pageCount(page)).toBeGreaterThan(before);
    // small letters: the group follows the mode
    await page.getByRole('button', { name: /^a b/ }).click();
    await groups.getByRole('button', { name: 'Grupul che', exact: true }).click();
    await expect(page.locator('[data-item-rows] li[data-item="che"]')).toBeVisible();
  }
  await expectPdfDownload(page, () => download(page).click());
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});
