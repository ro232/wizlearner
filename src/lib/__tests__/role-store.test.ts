import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A localStorage for the tests (vitest runs in node); `broken` makes every call throw, like a blocked storage. */
function fakeStorage(broken = false) {
  const data = new Map<string, string>();
  const guard = () => {
    if (broken) throw new Error('storage blocked');
  };
  return {
    data,
    getItem: (k: string) => (guard(), data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => (guard(), void data.set(k, v)),
    removeItem: (k: string) => (guard(), void data.delete(k)),
  };
}

/** A fresh copy of the store, as a newly opened page has it. */
async function freshStore() {
  vi.resetModules();
  return import('@/stores/role-store');
}

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal('window', { localStorage: storage });
});
afterEach(() => vi.unstubAllGlobals());

const stored = (key: string) => JSON.parse(storage.data.get(key) ?? 'null') as { state: Record<string, unknown>; version: number } | null;

describe('role store', () => {
  it('starts with no role and is not ready before the storage is read', async () => {
    const { useRoleStore } = await freshStore();
    expect(useRoleStore.getState().role).toBeNull();
    expect(useRoleStore.getState().childStage).toBeNull();
    expect(useRoleStore.getState().hydrated).toBe(false);
  });

  it('sets and changes the role', async () => {
    const { useRoleStore } = await freshStore();
    useRoleStore.getState().setRole('cadru');
    expect(useRoleStore.getState().role).toBe('cadru');
    useRoleStore.getState().setRole('parinte');
    expect(useRoleStore.getState().role).toBe('parinte');
    useRoleStore.getState().setRole(null);
    expect(useRoleStore.getState().role).toBeNull();
  });

  it('remembers the role and the child’s class in this browser', async () => {
    const first = await freshStore();
    first.hydrateRoleStore();
    first.useRoleStore.getState().setRole('parinte');
    first.useRoleStore.getState().setChildStage('grupa-mare');
    expect(stored(first.ROLE_STORAGE_KEY)?.state).toEqual({ role: 'parinte', childStage: 'grupa-mare' });

    // the next visit: nothing before the storage is read (so the server HTML matches), everything after
    const second = await freshStore();
    expect(second.useRoleStore.getState().role).toBeNull();
    second.hydrateRoleStore();
    expect(second.useRoleStore.getState()).toMatchObject({ role: 'parinte', childStage: 'grupa-mare', hydrated: true });

    second.useRoleStore.getState().setRole('cadru');
    const third = await freshStore();
    third.hydrateRoleStore();
    expect(third.useRoleStore.getState().role).toBe('cadru');
  });

  it('is ready after reading an empty storage, still with no role', async () => {
    const { useRoleStore, hydrateRoleStore } = await freshStore();
    hydrateRoleStore();
    expect(useRoleStore.getState()).toMatchObject({ role: null, childStage: null, hydrated: true });
    // reading alone writes nothing
    expect(storage.data.size).toBe(0);
  });

  it.each([['admin'], ['CADRU'], [''], [1], [true], [{ role: 'cadru' }], [['parinte']], [undefined]])('an invalid stored role (%j) becomes no role', async (bad) => {
    const { ROLE_STORAGE_KEY } = await freshStore();
    storage.data.set(ROLE_STORAGE_KEY, JSON.stringify({ state: { role: bad, childStage: 'clasa-9' }, version: 1 }));
    const { useRoleStore, hydrateRoleStore } = await freshStore();
    hydrateRoleStore();
    expect(useRoleStore.getState()).toMatchObject({ role: null, childStage: null, hydrated: true });
  });

  it('an invalid role given to setRole becomes no role', async () => {
    const { useRoleStore } = await freshStore();
    useRoleStore.getState().setRole('cadru');
    useRoleStore.getState().setRole('director' as never);
    expect(useRoleStore.getState().role).toBeNull();
    useRoleStore.getState().setChildStage('clasa-4' as never);
    expect(useRoleStore.getState().childStage).toBeNull();
  });

  it('unreadable storage (not JSON) does not break the page', async () => {
    const { ROLE_STORAGE_KEY } = await freshStore();
    storage.data.set(ROLE_STORAGE_KEY, '{not json');
    const { useRoleStore, hydrateRoleStore } = await freshStore();
    expect(() => hydrateRoleStore()).not.toThrow();
    expect(useRoleStore.getState().role).toBeNull();
    useRoleStore.getState().setRole('parinte');
    expect(useRoleStore.getState().role).toBe('parinte');
  });

  it('a storage that throws never breaks the role: it works for this visit', async () => {
    storage = fakeStorage(true);
    vi.stubGlobal('window', { localStorage: storage });
    const { useRoleStore, hydrateRoleStore } = await freshStore();
    expect(() => hydrateRoleStore()).not.toThrow();
    expect(() => useRoleStore.getState().setRole('cadru')).not.toThrow();
    expect(useRoleStore.getState().role).toBe('cadru');
  });

  it('maps the child’s age or class to the level of the sheets', async () => {
    const { CHILD_STAGES, stageLevel, cleanRole, ROLE_HOME } = await freshStore();
    expect(CHILD_STAGES.map((s) => s.label)).toEqual(['Grupa mică', 'Grupa mijlocie', 'Grupa mare', 'Clasa pregătitoare', 'Clasa I', 'Clasa a II-a']);
    expect(CHILD_STAGES.map((s) => stageLevel(s.id))).toEqual(['presc', 'presc', 'presc', 'CP', 'I', 'II']);
    expect(stageLevel(null)).toBeNull();
    expect(cleanRole('cadru')).toBe('cadru');
    expect(cleanRole('parinte')).toBe('parinte');
    expect(cleanRole('părinte')).toBeNull();
    expect(ROLE_HOME).toEqual({ cadru: '/panou/cadru', parinte: '/panou/parinte' });
  });
});
