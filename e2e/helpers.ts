import { expect, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/** Collect page errors and console errors (fonts, analytics and the like excluded). */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|fonts\.g|posthog|Failed to load resource|supabase/i.test(t)) return;
    errors.push(`console: ${t}`);
  });
  return errors;
}

/** Nothing on the page sticks out to the side (no sideways scrolling on a phone). */
export async function expectNoSidewaysScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra, 'the page scrolls sideways').toBeLessThanOrEqual(1);
}

/** Click and wait for the download; check it is a real, non-empty PDF. */
export async function expectPdfDownload(page: Page, click: () => Promise<unknown>): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 45_000 }), click()]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  const bytes = await readFile(path!);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length, 'PDF too small to hold a page').toBeGreaterThan(3_000);
  return download;
}

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 700;
