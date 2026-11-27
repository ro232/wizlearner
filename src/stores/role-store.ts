import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Who uses the site in this browser: a teacher („cadru”) or a parent („părinte”). It only decides
 * which menu and which dashboard are shown; every page stays open to everyone. Kept apart from the
 * worksheet store on purpose: the menu and the dashboards read it without touching the sheet engine.
 */
export type Role = 'cadru' | 'parinte';

/** The child's age or class, chosen by a parent on /panou/parinte. Never a name, never sent anywhere. */
export type ChildStage = 'grupa-mica' | 'grupa-mijlocie' | 'grupa-mare' | 'pregatitoare' | 'clasa-1' | 'clasa-2';

/** The level the sheets are made for (the same codes as SchoolLevel in curriculum/sheet.ts). */
export type StageLevel = 'presc' | 'CP' | 'I' | 'II';

export const CHILD_STAGES: readonly { id: ChildStage; label: string; level: StageLevel }[] = [
  { id: 'grupa-mica', label: 'Grupa mică', level: 'presc' },
  { id: 'grupa-mijlocie', label: 'Grupa mijlocie', level: 'presc' },
  { id: 'grupa-mare', label: 'Grupa mare', level: 'presc' },
  { id: 'pregatitoare', label: 'Clasa pregătitoare', level: 'CP' },
  { id: 'clasa-1', label: 'Clasa I', level: 'I' },
  { id: 'clasa-2', label: 'Clasa a II-a', level: 'II' },
];

export const ROLE_HOME: Record<Role, string> = { cadru: '/panou/cadru', parinte: '/panou/parinte' };

/** Anything that is not one of the two roles (an old value, a tampered one, null) is no role. */
export function cleanRole(value: unknown): Role | null {
  return value === 'cadru' || value === 'parinte' ? value : null;
}

export function cleanChildStage(value: unknown): ChildStage | null {
  return CHILD_STAGES.some((s) => s.id === value) ? (value as ChildStage) : null;
}

export function stageLevel(stage: ChildStage | null): StageLevel | null {
  return CHILD_STAGES.find((s) => s.id === stage)?.level ?? null;
}

interface RoleState {
  role: Role | null;
  childStage: ChildStage | null;
  /** True once the stored value has been read in this browser (never on the server). Not stored. */
  hydrated: boolean;
  setRole: (role: Role | null) => void;
  setChildStage: (stage: ChildStage | null) => void;
}

/**
 * localStorage that never throws (private windows, blocked site data, server rendering):
 * remembering the role is a convenience, never a requirement.
 */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const ROLE_STORAGE_KEY = 'wizlearner-role';

export const useRoleStore = create<RoleState>()(persist((set) => ({
  role: null,
  childStage: null,
  hydrated: false,
  // setState from outside goes through here too (see the merge below): only the two known roles are kept
  setRole: (role) => set({ role: cleanRole(role) }),
  setChildStage: (childStage) => set({ childStage: cleanChildStage(childStage) }),
}), {
  name: ROLE_STORAGE_KEY,
  version: 1,
  storage: createJSONStorage(() => safeStorage),
  partialize: (state) => ({ role: state.role, childStage: state.childStage }),
  // Whatever is in storage is read through cleanRole / cleanChildStage: unknown values become null.
  merge: (persisted, current) => {
    const stored = persisted && typeof persisted === 'object' ? (persisted as { role?: unknown; childStage?: unknown }) : {};
    // merge runs on every read of the storage, also when nothing is stored: that is when the store is ready
    return { ...current, role: cleanRole(stored.role), childStage: cleanChildStage(stored.childStage), hydrated: true };
  },
  // Read once after the first render (see StoreHydration): the server and the first client render
  // both show the menu without a role, so the HTML matches.
  skipHydration: true,
}));

/** Read the stored role (once, in the browser); the store is then marked as ready (see merge). */
export function hydrateRoleStore(): void {
  if (useRoleStore.getState().hydrated) return;
  void useRoleStore.persist.rehydrate();
}
