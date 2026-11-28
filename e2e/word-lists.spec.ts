import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoSidewaysScroll, expectPdfDownload, watchErrors } from './helpers';

/**
 * „Cuvinte de trasat”: the ready-made lists and the two options (word-lists.tsx). On the free plan
 * (a build without NEXT_PUBLIC_OPEN_ACCESS) the words with letters of the full version are locked:
 * the test checks that, and fills the sheet with free words instead.
 */

const download = (page: Page) => page.getByRole('button', { name: /^Descarcă PDF/ }).last();
const pageCount = async (page: Page) => {
  const text = (await page.locator('[data-page-count]').textContent()) ?? '';
  return text === 'Iese o pagină' ? 1 : Number(/Ies (\d+)/.exec(text)?.[1]);
};
const expectTappable = async (locator: Locator) => {
  await expect.poll(async () => (await locator.boundingBox())?.height ?? 0, { message: 'at least 44 px tall' }).toBeGreaterThanOrEqual(44);
};

async function freshSheet(page: Page) {
  await page.goto('/generator');
  await page.locator('[data-ready]').waitFor();
  await page.getByRole('button', { name: 'De la zero' }).click();
}

test.describe('word lists', () => {
  test('a theme list goes on the sheet; the empty row and the filled row; the PDF', async ({ page }) => {
    const errors = watchErrors(page);
    await freshSheet(page);
    await page.getByRole('button', { name: 'Liste de cuvinte' }).click();
    await page.getByRole('button', { name: 'Pe teme', exact: true }).click();
    await page.locator('#word-list-pick').selectOption({ label: 'Toamna · 14 cuvinte' });
    const panel = page.locator('[data-word-list="toamna"]');
    await expect(panel.getByRole('button', { name: /^Adaugă frunză/ })).toBeVisible();
    await expectTappable(panel.getByRole('button', { name: /^Adaugă frunză/ }));
    const free = (await panel.locator('[data-locked]').count()) > 0;

    if (free) {
      // free plan: every word of the theme needs the full version → the plans window, nothing added
      await page.locator('[data-word-list-add]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('[data-word-limit]')).toContainText('Gratuit');
      for (const item of ['A', 'B']) await page.getByRole('button', { name: item, exact: true }).first().click();
      for (const word of ['bec', 'ac', 'cade', 'abac']) {
        await page.locator('#custom-word').fill(word);
        await page.locator('#custom-word').press('Enter');
      }
    } else {
      await page.locator('[data-word-list-add]').click();
      await expect(panel.getByRole('button', { name: /^Scoate / })).toHaveCount(14);
      await expect(page.locator('[data-word-list-add]')).toHaveText('Toate sunt pe fișă');
      await expect(page.locator('[data-word-limit]')).toHaveText('14 cuvinte pe fișă din 60.');
      // a chip tapped again takes the word off, a third tap puts it back (at the end)
      await panel.getByRole('button', { name: 'Scoate nor de pe fișă' }).click();
      await expect(panel.getByRole('button', { name: 'Adaugă nor' })).toBeVisible();
      await panel.getByRole('button', { name: 'Adaugă nor' }).click();
      await expect(panel.getByRole('button', { name: /^Scoate / })).toHaveCount(14);
    }

    const before = await pageCount(page);
    expect(before).toBeGreaterThan(1);
    const copy = page.locator('[data-word-option="copy"]');
    await expectTappable(page.locator('label', { has: copy }));
    await copy.check();
    // an empty row after each word: more pages, and the download button says so
    await expect.poll(() => pageCount(page)).toBeGreaterThan(before);
    const withCopy = await pageCount(page);
    await expect(download(page)).toHaveText(new RegExp(`\\(${withCopy} (de )?pagini\\)`));
    await page.locator('[data-word-option="fill"]').check();
    // the words repeat across their own rows: no new rows
    await expect.poll(() => pageCount(page)).toBe(withCopy);
    await expectPdfDownload(page, () => download(page).click());
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });

  test('the letters on the sheet come first; the limit of 60 words is shown', async ({ page }) => {
    const errors = watchErrors(page);
    await freshSheet(page);
    await page.getByRole('button', { name: 'B', exact: true }).first().click();
    await page.getByRole('button', { name: 'Liste de cuvinte' }).click();
    await expect(page.locator('[data-word-lists]').getByRole('button', { name: 'B', exact: true, pressed: true })).toBeVisible();
    await expect(page.locator('[data-word-list="B"]')).toBeVisible();
    test.skip((await page.locator('[data-word-list="B"] [data-locked]').count()) > 0, 'free plan: the lists are locked past A–E');
    await page.locator('[data-word-list-add]').click();
    await expect(page.locator('[data-word-limit]')).toHaveText('12 cuvinte pe fișă din 60.');
    await page.getByRole('button', { name: 'Pe teme', exact: true }).click();
    for (const theme of ['Primăvara', 'Vara', 'Fructe', 'Legume', 'Meserii']) {
      await page.locator('#word-list-pick').selectOption({ label: `${theme} · 15 cuvinte` });
      if (await page.locator('[data-word-list-add]').isDisabled()) break;
      await page.locator('[data-word-list-add]').click();
    }
    await expect(page.locator('[data-word-limit]')).toContainText('Fișa are deja 60 de cuvinte');
    await expect(page.locator('[data-word-max]')).toBeVisible();
    await expect(page.locator('[data-word-list-add]')).toBeDisabled();
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });
});
