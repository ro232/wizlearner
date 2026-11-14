import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, expectPdfDownload, isPhone, watchErrors } from './helpers';

const download = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Descarcă PDF/ }).last();

test.describe('generator', () => {
  test('a ready-made start, then the PDF', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/generator');
    await page.getByRole('button', { name: 'Litera săptămânii' }).click();
    await expect(page.getByText('Pe fișă')).toBeVisible();
    await expectPdfDownload(page, () => download(page).click());
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });

  test('letters, levels and trace styles change the sheet without errors', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/generator');
    await page.getByRole('button', { name: 'A', exact: true }).first().click();
    for (const level of ['Mijlociu', 'Avansat', 'Început']) await page.getByRole('button', { name: new RegExp(`^${level}`) }).click();
    await page.getByRole('button', { name: /Literele de trasat: Puncte/ }).click();
    await page.getByRole('button', { name: 'Dese', exact: true }).click();
    await page.getByRole('button', { name: /de mână/ }).first().click();
    await expect(page.getByText(/rând|rânduri/).first()).toBeVisible();
    await expectPdfDownload(page, () => download(page).click());
    expect(errors).toEqual([]);
  });

  test('a locked letter opens the plans, not a broken sheet', async ({ page }) => {
    await page.goto('/generator');
    const locked = page.getByRole('button', { name: 'M (varianta completă)' });
    await locked.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/varianta completă/i).first()).toBeVisible();
    // a real dialog: the close button is big enough to tap, Tab stays inside, Escape closes, focus goes back
    const close = dialog.getByRole('button', { name: 'Închide' });
    // (polled: the window grows into place for a moment)
    await expect.poll(async () => Math.min((await close.boundingBox())!.width, (await close.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(locked).toBeFocused();
    // … and a click outside closes it too
    await locked.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(dialog).toHaveCount(0);
  });

  test('the name can be corrected after „Trasează-l” without emptying the sheet', async ({ page }) => {
    await page.goto('/generator');
    await page.getByLabel('Numele copilului').fill('Stefanut');
    await page.getByRole('button', { name: 'Trasează-l' }).click();
    await page.getByLabel('Numele copilului').fill('Ștefănuț');
    await expect(page.getByRole('button', { name: 'Scoate Ștefănuț' }).first()).toBeVisible();
    await expect(page.getByText(/Nu apar pe fișă/)).toHaveCount(0);
    await expect(download(page)).toBeEnabled();
  });

  test('the example word in the box can be traced for free; math has no „Trasează-l”', async ({ page }) => {
    await page.goto('/generator');
    const box = page.getByLabel('Cuvinte de trasat');
    const example = ((await box.getAttribute('placeholder')) ?? '').replace(/^ex\.\s*/, '').split(',')[0].trim();
    await box.fill(example);
    await box.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Scoate ${example}` }).first()).toBeVisible();
    await page.getByRole('button', { name: /Matematică/ }).first().click();
    await page.getByRole('button', { name: /^Adunări 3/ }).click();
    await page.getByLabel('Numele copilului').fill('Ada');
    await expect(page.getByRole('button', { name: 'Trasează-l' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Scoate Adunări' })).toBeVisible();
  });

  test('the download button is on screen without scrolling', async ({ page }, info) => {
    test.skip(info.project.name !== 'pc-chrome', 'layout check for a laptop screen');
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/generator');
    await page.getByRole('button', { name: 'A', exact: true }).first().click();
    await expect(page.getByText('Pe fișă')).toBeVisible();
    await expect.poll(async () => (await download(page).boundingBox())!.y + (await download(page).boundingBox())!.height).toBeLessThanOrEqual(768);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('on a phone, „Vezi fișa” leads to the sheet that just changed', async ({ page }) => {
    test.skip(!isPhone(page), 'phones only');
    await page.goto('/generator');
    const letter = page.getByRole('button', { name: 'A', exact: true }).first();
    await letter.scrollIntoViewIfNeeded();
    await letter.click();
    const see = page.getByRole('button', { name: /Vezi fișa/ });
    await expect(see).toBeVisible();
    await expect(see).toContainText('Fișa s-a schimbat');
    await see.click();
    await expect(page.locator('section[aria-label="Previzualizare"] canvas')).toBeInViewport();
    await expect(see).toHaveCount(0);
  });

  test('a broken value left in the browser does not break the page', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/preturi');
    await page.evaluate(() => localStorage.setItem('wizlearner-last-sheet', JSON.stringify({ state: { config: { customWords: null, selectedItems: null, childName: null } }, version: 1 })));
    await page.goto('/generator');
    await expect(page.getByRole('heading', { name: 'Fișa ta' })).toBeVisible();
    await page.getByRole('button', { name: 'Litera săptămânii' }).click();
    await expect(page.getByText('Pe fișă')).toBeVisible();
    // leaving /preturi while it still preloads its links logs cancelled requests: not errors of the page
    expect(errors.filter((e) => !/RSC payload/.test(e))).toEqual([]);
  });

  test('without the font no broken PDF is made: a clear message instead', async ({ page }) => {
    await page.route('**/fonts/*.ttf', (r) => r.abort());
    await page.goto('/generator');
    await page.getByRole('button', { name: /Matematică/ }).first().click();
    await page.getByRole('button', { name: /^Scăderi/ }).click();
    let downloaded = false;
    page.on('download', () => (downloaded = true));
    await download(page).click();
    await expect(page.getByRole('alert').filter({ hasText: /fontul/ }).first()).toBeVisible();
    await expect(download(page)).toBeEnabled();
    expect(downloaded).toBe(false);
  });

  test('math: every exercise type, a new set, answers, the PDF', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/generator');
    await page.getByRole('button', { name: /Matematică/ }).first().click();
    for (const t of [/^Compară numerele/, /^Adunări 3/, /^Scăderi/, /^Completează șirul/]) await page.getByRole('button', { name: t }).click();
    await page.getByRole('button', { name: /Alte exerciții/ }).click();
    await page.getByLabel('Pagină cu răspunsuri').check();
    await expect(page.getByText(/pagini/).first()).toBeVisible();
    await expectPdfDownload(page, () => download(page).click());
    expect(errors).toEqual([]);
  });
});

test('ready-made workbook: handwriting, free pages download', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/caiete');
  await page.getByRole('button', { name: /Alfabetul de mână/ }).click();
  await page.getByRole('button', { name: /^Mijlociu/ }).click();
  await expect(page.getByText('Alfabetul de mână: 31 de pagini')).toBeVisible();
  await expectPdfDownload(page, () => page.getByRole('button', { name: /^Descarcă/ }).click());
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test('name sheet', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/nume');
  await page.getByLabel(/Numele/).first().fill('Ștefan');
  await expectPdfDownload(page, () => page.getByRole('button', { name: /^Descarcă PDF/ }).click());
  expect(errors).toEqual([]);
});

test('name workbook on a narrow phone: nothing sticks out, the plans window can be closed', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/nume');
  await page.getByLabel(/Numele/).first().fill('Ștefănuț');
  await page.getByRole('button', { name: /Caietul cu numele/ }).click();
  await expect(page.getByRole('button', { name: /^Descarcă caietul \(\d+ (de )?pagini\)/ })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole('button', { name: /^Descarcă caietul/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const panel = (await dialog.boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(360);
  expect(panel.y + panel.height).toBeLessThanOrEqual(740);
  await expect(dialog.getByRole('button', { name: 'Închide' })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Închide' }).click();
  await expect(dialog).toHaveCount(0);
  await expectNoSidewaysScroll(page);
});

test('group: the pasted list survives a look at the prices and a reload', async ({ page }) => {
  const names = Array.from({ length: 25 }, (_, i) => `Copil ${String.fromCharCode(65 + i)}`);
  await page.goto('/grupa');
  await page.getByLabel('Grupa', { exact: true }).fill('Grupa mare Fluturașii');
  await page.locator('#names').fill(names.join('\n'));
  // the free plan says what the button really downloads
  await expect(page.getByRole('button', { name: /^Descarcă fișele primilor 3 copii \(\d+ pagini\)/ })).toBeVisible();
  await expect(page.getByText(/Toată grupa \(25 de copii\) face parte din varianta completă/)).toBeVisible();
  await page.goto('/preturi');
  await page.goBack();
  await expect(page.locator('#names')).toHaveValue(names.join('\n'));
  await expect(page.getByLabel('Grupa', { exact: true })).toHaveValue('Grupa mare Fluturașii');
  await page.reload();
  await expect(page.locator('#names')).toHaveValue(names.join('\n'));
  await page.getByRole('button', { name: 'Golește lista' }).click();
  await page.reload();
  await expect(page.locator('#names')).toHaveValue('');
});

test('group: a list pasted from a spreadsheet, namesakes, the week of the plan', async ({ page }) => {
  await page.goto('/grupa');
  await page.locator('#names').fill('1\tPopescu Ana\t5 ani\n2\tIonescu Luca\t5 ani\n3\tPopescu Ana\t6 ani');
  await expect(page.getByRole('button', { name: /^Popescu Ana:/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^Ionescu Luca:/ })).toHaveCount(1);
  await expect(page.getByText('2 copii cu același nume: Popescu Ana')).toBeVisible();
  // Monday to Friday, also after the clock change at the end of October
  await expect(page.locator('select[aria-label="Alege săptămâna"] option', { hasText: 'Săpt. 10 ·' })).toHaveText('Săpt. 10 · 9–13 noiembrie');
});

test('the sign-in page explains itself', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/auth/login?error=auth');
  await expect(page.getByRole('alert').filter({ hasText: 'Linkul de autentificare nu mai e valabil' })).toBeVisible();
  await page.goto('/auth/login?reason=save&next=/generator');
  await expect(page.getByRole('status').filter({ hasText: 'Intră în cont ca să salvezi' })).toBeVisible();
  await expect(page.getByText(/Secure/)).toHaveCount(0);
  expect(errors.filter((e) => !/RSC payload/.test(e))).toEqual([]);
});

test('group sheets for three children', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/grupa');
  await page.locator('textarea').first().fill('Ana\nȘtefan\nMaria-Ioana');
  await expectPdfDownload(page, () => page.getByRole('button', { name: /^Descarcă/ }).first().click());
  expect(errors).toEqual([]);
});

test('KDP book interior', async ({ page }) => {
  test.slow();
  const errors = watchErrors(page);
  await page.goto('/book');
  await expectPdfDownload(page, () => page.getByRole('button', { name: /PDF interior/ }).click());
  expect(errors).toEqual([]);
});

test('free sheet page download', async ({ page }) => {
  await page.goto('/fise/litera-m');
  await expectPdfDownload(page, () => page.getByRole('button', { name: /Descarcă PDF gratuit/ }).click());
});
