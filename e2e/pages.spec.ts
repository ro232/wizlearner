import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, watchErrors } from './helpers';

const PAGES = ['/', '/generator', '/caiete', '/nume', '/grupa', '/book', '/fise', '/fise/litera-m', '/fise/litera-m-de-mana', '/preturi', '/cont', '/auth/login', '/confidentialitate', '/termeni'];

for (const path of PAGES) {
  test(`${path} opens cleanly`, async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto(path, { waitUntil: 'networkidle' });
    expect(res?.status(), 'status').toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeAttached();
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });
}

test('an unknown page answers 404', async ({ page }) => {
  const res = await page.goto('/nu-exista-asa-ceva');
  expect(res?.status()).toBe(404);
});

test('menu reaches every tool', async ({ page }) => {
  await page.goto('/');
  const phone = (page.viewportSize()?.width ?? 1000) < 1024;
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  const link = (name: string) => nav.getByRole('link', { name: new RegExp(`^${name}`) }).first();
  if (phone) {
    await page.getByRole('button', { name: 'Deschide meniul' }).click();
    for (const name of ['Fișe', 'Pe programă', 'Pentru grupă', 'Planificare', 'Planșe și diplome', 'Fișa cu numele', 'Caiete gata', 'Fișe gratuite', 'Prețuri']) {
      await expect(link(name)).toBeVisible();
    }
    return;
  }
  for (const name of ['Fișe', 'Pe programă', 'Prețuri']) await expect(link(name)).toBeVisible();
  const groups = { 'Pentru clasă': ['Pentru grupă', 'Planificare', 'Planșe și diplome', 'Temă pentru părinți'], 'Pentru părinți': ['Fișa cu numele', 'Caiete gata', 'Fișe gratuite'] };
  for (const [group, names] of Object.entries(groups)) {
    const button = nav.getByRole('button', { name: group });
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    for (const name of names) await expect(link(name)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
  }
});

test('a menu group works with the keyboard alone', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1000) < 1024, 'the groups open as buttons on a computer screen');
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Pentru clasă' });
  await button.focus();
  await page.keyboard.press('ArrowDown');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: /^Pentru grupă/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('link', { name: /^Planificare/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/planificare$/);
  await expect(page.getByRole('button', { name: 'Pentru clasă' })).toHaveAttribute('aria-expanded', 'false');
});

test('the KDP notebook is reachable from the footer, not the main menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Caiet KDP' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' }).getByRole('link', { name: 'Caiet KDP' })).toHaveCount(0);
});

test('no page scrolls sideways at any common width', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc-chrome', 'one browser is enough: this checks the layout, not the engine');
  test.slow();
  for (const width of [320, 360, 390, 768, 810, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/generator', '/caiete', '/nume', '/grupa', '/planse', '/programa', '/planificare', '/book', '/fise', '/preturi', '/cont']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(extra, `${path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(1);
    }
  }
});
