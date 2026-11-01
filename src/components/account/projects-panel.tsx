'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, FileText, Folder, FolderInput, Library, Pencil, Trash2, UserRound, Users } from 'lucide-react';
import type { SavedWorksheet } from '@/hooks/use-worksheets';
import { useWorksheetStore } from '@/stores/worksheet-store';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { PROJECT_LABELS, stashProject, type ProjectKind } from '@/lib/projects';

const ICONS: Record<ProjectKind, typeof FileText> = { sheet: FileText, workbook: Library, book: BookOpen, 'name-book': UserRound, group: Users };
const day = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

/** Open a project on the page that makes it. */
export function useOpenProject() {
  const router = useRouter();
  return (kind: ProjectKind, configuration: unknown) => {
    if (kind === 'sheet') {
      useWorksheetStore.setState({ config: { ...DEFAULT_CONFIG, ...(configuration as WorksheetConfig) } });
      router.push('/generator');
    } else {
      router.push(stashProject(kind, configuration));
    }
  };
}

/** Everything saved in the account, by folder, with open / rename / move / delete. */
export function ProjectsPanel({ projects, onUpdate, onDelete }: {
  projects: SavedWorksheet[];
  onUpdate: (id: string, patch: Partial<SavedWorksheet>) => void;
  onDelete: (id: string) => void;
}) {
  const open = useOpenProject();
  const [filter, setFilter] = useState<ProjectKind | 'all'>('all');
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'folder'; value: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const kinds = useMemo(() => Array.from(new Set(projects.map((p) => p.kind ?? 'sheet'))), [projects]);
  const folders = useMemo(() => Array.from(new Set(projects.map((p) => p.folder).filter(Boolean))) as string[], [projects]);
  const shown = projects.filter((p) => filter === 'all' || (p.kind ?? 'sheet') === filter);
  const groups = useMemo(() => {
    const by = new Map<string, SavedWorksheet[]>();
    for (const p of shown) {
      const k = p.folder || '';
      by.set(k, [...(by.get(k) ?? []), p]);
    }
    return [...by.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'ro')));
  }, [shown]);

  if (!projects.length) {
    return <p className="text-slate-600">Nimic salvat încă. Butonul „Salvează” din generator, din Caiete gata, din Caiet KDP sau de la caietul cu numele îl păstrează aici, ca să-l refaci oricând.</p>;
  }

  const commit = () => {
    if (!editing) return;
    const v = editing.value.trim();
    if (editing.field === 'name' && v) onUpdate(editing.id, { name: v.slice(0, 80) });
    if (editing.field === 'folder') onUpdate(editing.id, { folder: v ? v.slice(0, 60) : null });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Arată">
          {(['all', ...kinds] as const).map((k) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`h-9 px-3 rounded-full border-2 text-sm font-bold ${filter === k ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink hover:border-ink'}`}>
              {k === 'all' ? `Toate (${projects.length})` : PROJECT_LABELS[k]}
            </button>
          ))}
        </div>
      )}
      <datalist id="project-folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
      {groups.map(([folder, items]) => (
        <div key={folder || '-'}>
          {(folder || groups.length > 1) && (
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-700 mb-1">
              <Folder className="w-4 h-4" aria-hidden /> {folder || 'Fără dosar'}
            </h3>
          )}
          <ul className="divide-y divide-slate-100">
            {items.map((p) => {
              const kind = p.kind ?? 'sheet';
              const Icon = ICONS[kind];
              const isEditing = editing?.id === p.id;
              return (
                <li key={p.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <button type="button" onClick={() => open(kind, p.configuration)} className="flex-1 min-w-0 flex items-center gap-2 text-left text-slate-800 hover:text-blue-700">
                    <Icon className="w-4 h-4 shrink-0 text-pen" aria-hidden />
                    <span className="min-w-0">
                      <span className="font-semibold block truncate">{p.name}</span>
                      <span className="text-xs text-slate-500">{PROJECT_LABELS[kind]} · {day(p.updated_at)}</span>
                    </span>
                  </button>
                  {isEditing ? (
                    <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); commit(); }}>
                      <input autoFocus value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        list={editing.field === 'folder' ? 'project-folders' : undefined}
                        placeholder={editing.field === 'folder' ? 'ex. Grupa mare – octombrie' : 'Numele'}
                        aria-label={editing.field === 'folder' ? 'Dosarul' : 'Numele'}
                        className="h-9 px-3 rounded-lg border border-slate-300 text-sm flex-1 min-w-0" />
                      <button type="submit" className="h-9 px-3 rounded-lg bg-ink text-white text-sm font-bold">OK</button>
                      <button type="button" onClick={() => setEditing(null)} className="h-9 px-3 rounded-lg border border-slate-300 text-sm">Renunță</button>
                    </form>
                  ) : confirm === p.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      Ștergi „{p.name}”?
                      <button type="button" onClick={() => { onDelete(p.id); setConfirm(null); }} className="h-9 px-3 rounded-lg bg-red-600 text-white font-bold">Șterge</button>
                      <button type="button" onClick={() => setConfirm(null)} className="h-9 px-3 rounded-lg border border-slate-300">Nu</button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <button type="button" onClick={() => open(kind, p.configuration)} className="h-9 px-3 rounded-lg border-2 border-ink text-sm font-bold text-ink hover:bg-paper">Deschide</button>
                      <button type="button" onClick={() => setEditing({ id: p.id, field: 'name', value: p.name })} aria-label={`Redenumește ${p.name}`} title="Redenumește" className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-500" /></button>
                      <button type="button" onClick={() => setEditing({ id: p.id, field: 'folder', value: p.folder ?? '' })} aria-label={`Mută ${p.name} într-un dosar`} title="Mută într-un dosar" className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100"><FolderInput className="w-4 h-4 text-slate-500" /></button>
                      <button type="button" onClick={() => setConfirm(p.id)} aria-label={`Șterge ${p.name}`} title="Șterge" className="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100"><Trash2 className="w-4 h-4 text-slate-400" /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
