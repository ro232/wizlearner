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
  if (phone) await page.getByRole('button', { name: 'Deschide meniul' }).click();
  for (const name of ['Fișe', 'Caiete gata', 'Fișa cu numele', 'Pentru grupă', 'Caiet KDP', 'Prețuri']) {
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
  }
});

test('no page scrolls sideways at any common width', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc-chrome', 'one browser is enough: this checks the layout, not the engine');
  test.slow();
  for (const width of [320, 360, 390, 768, 810, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/generator', '/caiete', '/nume', '/grupa', '/book', '/fise', '/preturi', '/cont']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(extra, `${path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(1);
    }
  }
});
