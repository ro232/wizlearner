import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, expectPdfDownload, watchErrors } from './helpers';

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
    await page.getByRole('button', { name: 'M (versiunea completă)' }).click();
    await expect(page.getByText(/versiunea completă/i).first()).toBeVisible();
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
  await expect(page.getByText('Alfabetul de mână: 31 pagini')).toBeVisible();
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
