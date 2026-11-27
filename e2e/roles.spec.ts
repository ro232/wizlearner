import { expect, test, type Page } from '@playwright/test';
import { expectNoSidewaysScroll, expectPdfDownload, watchErrors } from './helpers';

/**
 * Two journeys on the same site: a teacher („cadru”) and a parent („părinte”). The role is chosen
 * on the home page, kept in this browser and changes the menu and the dashboard, never what can be opened.
 */
const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Navigare principală' });
/** The menu is a row of links on a computer and opens from a button below 1024 px. */
const narrow = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

async function openMenu(page: Page) {
  if (narrow(page)) await page.getByRole('button', { name: 'Deschide meniul' }).click();
}
async function closeMenu(page: Page) {
  if (narrow(page)) await page.getByRole('button', { name: 'Închide meniul' }).click();
}
const navLink = (page: Page, name: string) => mainNav(page).getByRole('link', { name: new RegExp(`^${name}`) }).first();

async function expectMenu(page: Page, shown: string[], hidden: string[]) {
  await openMenu(page);
  for (const name of shown) await expect(navLink(page, name), name).toBeVisible();
  for (const name of hidden) await expect(mainNav(page).getByRole('link', { name: new RegExp(`^${name}$`) }), name).toHaveCount(0);
  await closeMenu(page);
}

/** „Schimbă: cadru didactic / părinte”: in the bar on a computer, at the end of the phone menu. */
async function switchRole(page: Page, to: 'cadru' | 'parinte' | 'none') {
  if (narrow(page)) {
    await page.getByRole('button', { name: 'Deschide meniul' }).click();
    await expect(page.locator('[data-role-switch-mobile]').getByRole('heading', { name: 'Schimbă: cadru didactic / părinte' })).toBeVisible();
    await page.locator(`[data-role-switch-mobile] [data-role-option="${to}"]`).click();
  } else {
    const button = page.locator('[data-role-switch]');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#rol-menu')).toContainText('Schimbă: cadru didactic / părinte');
    await page.locator(`#rol-menu [data-role-option="${to}"]`).click();
  }
}

const TEACHER_MENU = ['Panou', 'Fișe de lucru', 'Grupa mea', 'Planificare', 'Programa'];
const PARENT_MENU = ['Panou', 'Fișă cu nume', 'Caiete', 'Fișe pe vârste'];

test.describe('role', () => {
  test('the home page offers the two roles; with none chosen the menu is the usual one', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: /Sunt educatoare \/ învățătoare/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sunt părinte/ })).toBeVisible();
    await expect(page.locator('[data-role-switch], [data-role-switch-mobile]')).toHaveCount(0);
    await expectMenu(page, ['Fișe', 'Pe programă', 'Prețuri'], ['Panou', 'Grupa mea', 'Fișă cu nume']);
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });

  test('„Sunt educatoare / învățătoare” opens the teacher’s dashboard and menu', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt educatoare \/ învățătoare/ }).click();
    await expect(page).toHaveURL(/\/panou\/cadru$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Panoul cadrului didactic' })).toBeVisible();
    await expectMenu(page, TEACHER_MENU, ['Pe programă', 'Fișă cu nume']);

    const main = page.getByRole('main');
    for (const [name, href] of [['Fișă pentru toată grupa', '/grupa'], ['Fișe după programă', '/programa'], ['Planificare', '/planificare'], ['Caiete', '/caiete'], ['Planșe și diplome', '/planse'], ['Caută fișe', '/cauta']]) {
      await expect(main.getByRole('link', { name: new RegExp(`^${name}`) }).first(), name).toHaveAttribute('href', href);
    }
    // not built yet: shown, labelled „În curând”, and not links
    for (const name of ['Tema săptămânii', 'Teme trimise părinților']) {
      const card = page.locator('[data-soon-card]').filter({ hasText: name });
      await expect(card).toContainText('În curând');
      await expect(main.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
    }
    await expect(page.getByRole('heading', { name: 'Grupele mele' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fișe recente' })).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoSidewaysScroll(page);

    // the role is remembered: a new visit to the home page still has the teacher's menu
    await page.goto('/', { waitUntil: 'networkidle' });
    await expectMenu(page, TEACHER_MENU, ['Pe programă']);
    expect(errors.filter((e) => !/RSC payload/.test(e))).toEqual([]);
  });

  test('„Sunt părinte” opens the parent’s dashboard and menu, without school paperwork', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt părinte/ }).click();
    await expect(page).toHaveURL(/\/panou\/parinte$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Fișe pentru copilul tău' })).toBeVisible();
    await expectMenu(page, PARENT_MENU, ['Grupa mea', 'Planificare', 'Programa', 'Pe programă']);

    // first the age or the class; clasa a III-a and a IV-a are only announced
    for (const name of ['Grupa mică', 'Grupa mijlocie', 'Grupa mare', 'Clasa pregătitoare', 'Clasa I', 'Clasa a II-a']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByText('Clasele a III-a și a IV-a: în lucru')).toBeVisible();
    await expect(page.locator('[data-dash-card]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Clasa I', exact: true }).click();
    await expect(page.getByRole('link', { name: /^Fișă cu numele copilului/ })).toHaveAttribute('href', '/nume');
    await expect(page.getByRole('link', { name: /^Caiete de lucru/ })).toHaveAttribute('href', '/caiete');
    await expect(page.getByRole('link', { name: /^Fișe pe teme/ })).toHaveAttribute('href', '/fise-de-lucru/clasa-1');

    // no „competențe”, „planificare”, „programă” in what a parent is shown: the page and the menu
    const school = /competen|planific|program/i;
    expect(await page.getByRole('main').innerText()).not.toMatch(school);
    await openMenu(page);
    if (!narrow(page)) await mainNav(page).getByRole('button', { name: 'Toate uneltele' }).click();
    expect(await mainNav(page).innerText()).not.toMatch(school);
    await page.keyboard.press('Escape');

    // the choice is remembered and can be changed
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('[data-chosen-stage]')).toHaveText('Clasa I');
    await page.getByRole('button', { name: 'Schimbă vârsta' }).click();
    await page.getByRole('button', { name: 'Grupa mare', exact: true }).click();
    await expect(page.getByRole('link', { name: /^Fișe pe teme/ })).toHaveAttribute('href', '/fise-de-lucru/gradinita');
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });

  test('the switch changes the menu and, on a dashboard, the dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt educatoare \/ învățătoare/ }).click();
    await expect(page).toHaveURL(/\/panou\/cadru$/);
    await expectMenu(page, TEACHER_MENU, ['Fișă cu nume']);

    await switchRole(page, 'parinte');
    await expect(page).toHaveURL(/\/panou\/parinte$/);
    await expectMenu(page, PARENT_MENU, ['Grupa mea', 'Programa']);

    // anywhere else only the menu changes: the page stays
    await page.goto('/preturi', { waitUntil: 'networkidle' });
    await switchRole(page, 'cadru');
    await expect(page).toHaveURL(/\/preturi$/);
    await expectMenu(page, TEACHER_MENU, ['Fișă cu nume']);

    // „Fără rol”: the usual menu again, and the switch is gone
    await switchRole(page, 'none');
    await expectMenu(page, ['Fișe', 'Pe programă', 'Prețuri'], ['Panou']);
    await expect(page.locator('[data-role-switch], [data-role-switch-mobile]')).toHaveCount(0);
  });

  test('„Toate uneltele” keeps every tool one click away, with the keyboard too', async ({ page }) => {
    test.skip(narrow(page), 'the group opens as a button on a computer screen; the phone menu lists its links');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt educatoare \/ învățătoare/ }).click();
    await expect(page).toHaveURL(/\/panou\/cadru$/);
    const button = mainNav(page).getByRole('button', { name: 'Toate uneltele' });
    await button.focus();
    await page.keyboard.press('ArrowDown');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav-toate [data-nav-item]').first()).toBeFocused();
    for (const name of ['Generator de fișe', 'Caută fișe', 'Fișe gratuite', 'Fișa cu numele', 'Caiete gata', 'Pentru grupă', 'Planșe și diplome', 'Prețuri']) {
      await expect(page.locator('#nav-toate [data-nav-item]').filter({ hasText: name }).first(), name).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
  });

  test('a parent downloads a name sheet in at most three clicks', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt părinte/ }).click();
    await expect(page).toHaveURL(/\/panou\/parinte$/);

    // from the dashboard: the age, the card, the download (typing the name is not a click)
    let clicks = 0;
    await page.getByRole('button', { name: 'Grupa mare', exact: true }).click();
    clicks++;
    await page.getByRole('link', { name: /^Fișă cu numele copilului/ }).click();
    clicks++;
    await expect(page).toHaveURL(/\/nume$/);
    await page.getByLabel(/Numele/).first().fill('Ștefan');
    const download = await expectPdfDownload(page, () => page.getByRole('button', { name: /^Descarcă PDF/ }).click());
    clicks++;
    expect(clicks).toBeLessThanOrEqual(3);
    expect(download.suggestedFilename()).toMatch(/^Liniatura/);
    expect(errors).toEqual([]);
  });

  // The pages search engines send people to: never hidden, never redirected, whoever is looking.
  const SEO_PAGES = ['/fise-de-lucru', '/fise-de-lucru/gradinita', '/fise-de-lucru/clasa-1/litere-de-mana', '/fise', '/fise/litera-m', '/programa', '/programa/clasa-pregatitoare'];

  test('the pages from search engines open normally with no role', async ({ page }) => {
    for (const path of SEO_PAGES) {
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status(), path).toBe(200);
      expect(new URL(page.url()).pathname, path).toBe(path);
      await expect(page.locator('h1').first(), path).toBeVisible();
      await expect(page.getByRole('main'), path).toBeVisible();
      await expect(page.locator('[data-role-switch], [data-role-switch-mobile]'), path).toHaveCount(0);
    }
    await expectMenu(page, ['Fișe', 'Pe programă'], ['Panou']);
  });

  test('… and with a role too: a parent still opens the programme pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt părinte/ }).click();
    await expect(page).toHaveURL(/\/panou\/parinte$/);
    for (const path of SEO_PAGES) {
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status(), path).toBe(200);
      expect(new URL(page.url()).pathname, path).toBe(path);
      await expect(page.locator('h1').first(), path).toBeVisible();
    }
  });

  test('a dashboard opened directly works without a role and does not choose one', async ({ page }) => {
    for (const path of ['/panou/cadru', '/panou/parinte']) {
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status(), path).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('[data-role-switch], [data-role-switch-mobile]')).toHaveCount(0);
      await expectNoSidewaysScroll(page);
    }
  });

  test('an unknown role left in the browser is ignored', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/preturi');
    await page.evaluate(() => localStorage.setItem('wizlearner-role', JSON.stringify({ state: { role: 'director', childStage: 'clasa-9' }, version: 1 })));
    await page.goto('/panou/parinte', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-role-switch], [data-role-switch-mobile]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Grupa mare', exact: true })).toBeVisible();
    expect(errors.filter((e) => !/RSC payload/.test(e))).toEqual([]);
  });
});

test.describe('generator by role', () => {
  const group = (page: Page, id: string) => page.locator(`details[data-group="${id}"]`);

  test('a first visit starts with a filled example sheet, ready to download', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/generator');
    await page.locator('[data-ready]').waitFor();
    await expect(page.locator('[data-quick-start="example"]')).toBeVisible();
    await expect(page.getByText('Fișa e goală')).toHaveCount(0);
    await expectPdfDownload(page, () => page.getByRole('button', { name: /^Descarcă PDF/ }).last().click());
    // the settings come in four groups; „Avansat” starts closed
    for (const id of ['continut', 'nivel', 'aspect']) await expect(group(page, id)).toHaveAttribute('open', '');
    await expect(group(page, 'avansat')).not.toHaveAttribute('open', '');
    await group(page, 'avansat').locator('summary').click();
    await expect(page.getByLabel('Pentru stângaci')).toBeVisible();
    await expectNoSidewaysScroll(page);
    expect(errors).toEqual([]);
  });

  test('the example never replaces a sheet kept in the browser, not even an emptied one', async ({ page }) => {
    await page.goto('/generator');
    await page.locator('[data-ready]').waitFor();
    await expect(page.locator('[data-quick-start="example"]')).toBeVisible();
    await page.getByRole('button', { name: 'De la zero' }).click();
    await expect(page.locator('[data-quick-start="empty"]')).toBeVisible();
    await page.reload();
    await page.locator('[data-ready]').waitFor();
    await expect(page.locator('[data-quick-start="empty"]')).toBeVisible();
    // a sheet of the visitor's own stays as it was
    await page.getByRole('button', { name: 'Cifrele 1–5' }).click();
    await expect(page.getByRole('button', { name: 'Scoate 3' })).toBeVisible();
    await page.reload();
    await page.locator('[data-ready]').waitFor();
    await expect(page.getByRole('button', { name: 'Scoate 3' })).toBeVisible();
    await expect(page.locator('[data-quick-start]')).toHaveCount(0);
  });

  test('a sheet asked for in the address wins over the example', async ({ page }) => {
    await page.goto('/generator?item=math:add&clasa=CP');
    await page.locator('[data-ready]').waitFor();
    await expect(page.getByText('Pe fișă', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scoate Adunări' })).toBeVisible();
    await expect(page.locator('[data-quick-start]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Scoate A', exact: true })).toHaveCount(0);
  });

  test('for a parent „Nivel” starts closed too, and names the class, not the programme', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Sunt părinte/ }).click();
    await expect(page).toHaveURL(/\/panou\/parinte$/);
    await page.goto('/generator');
    await page.locator('[data-ready]').waitFor();
    await expect(group(page, 'continut')).toHaveAttribute('open', '');
    await expect(group(page, 'aspect')).toHaveAttribute('open', '');
    await expect(group(page, 'nivel')).not.toHaveAttribute('open', '');
    await expect(group(page, 'avansat')).not.toHaveAttribute('open', '');
    await group(page, 'nivel').locator('summary').click();
    await expect(group(page, 'nivel')).toHaveAttribute('open', '');
    await expect(group(page, 'nivel').getByText('Clasa copilului')).toBeVisible();
    await expect(group(page, 'nivel').getByText(/programă|competenț/i)).toHaveCount(0);
  });
});
