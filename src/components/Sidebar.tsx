import {
  BookOpen,
  Bookmark,
  Calculator,
  FileSearch,
  GitCompareArrows,
  History,
  MessageSquareText,
  Scale,
  X,
} from 'lucide-react';
import type { ModuleId } from '../types/kuhp.ts';
import { MODULES } from '../data/presets.ts';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  bookmarkCount: number;
  historyCount: number;
  quota: { remaining: number; limit: number } | null;
  onOpenDrawer: (tab: 'bookmarks' | 'history' | 'corpus') => void;
}

const MODULE_ICONS: Record<ModuleId, React.ComponentType<{ className?: string }>> = {
  'bedah-pasal': FileSearch,
  komparator: GitCompareArrows,
  'simulator-kasus': Scale,
  'kalkulator-sanksi': Calculator,
  'diskusi-socratic': MessageSquareText,
};

export function Sidebar({
  activeModule,
  onSelectModule,
  mobileOpen,
  onCloseMobile,
  bookmarkCount,
  historyCount,
  quota,
  onOpenDrawer,
}: SidebarProps) {
  const sidebarBody = (
    <div className="flex h-full flex-col justify-between bg-white text-slate-900 dark:bg-[#111830] dark:text-slate-100">
      <div>
        {/* Brand Block */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#000080] text-[#FFD700]">
              <Scale className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block font-display text-base font-bold tracking-tight text-[#000080] dark:text-[#FFD700] whitespace-nowrap">
                Klinik KUHP
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                UU 1/2023 jo. UU 1/2026
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Modules */}
        <nav aria-label="Modul Riset Klinik KUHP" className="p-3 space-y-1">
          <p className="px-3 pb-1.5 pt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Modul Analisis Hukum
          </p>
          {MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod.id];
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  onSelectModule(mod.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#000080] text-white dark:bg-[#FFD700] dark:text-[#0B1020]'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#FFD700] dark:text-[#0B1020]' : 'text-slate-400'}`} />
                <span className="truncate">{mod.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Author Attribution & Bottom Utility Links */}
      <div>
        <div className="px-5 pb-2.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          Dibuat oleh : M Budi Mulyadi
        </div>
        <div className="border-t border-slate-200 p-3 space-y-1 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            onOpenDrawer('corpus');
            onCloseMobile();
          }}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <BookOpen className="h-4 w-4 text-slate-400" />
            Indeks Korpus UU
          </span>
          <span className="font-mono-tabular text-xs text-slate-400">624 Psl</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenDrawer('bookmarks');
            onCloseMobile();
          }}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Bookmark className="h-4 w-4 text-slate-400" />
            Bookmark
          </span>
          <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">{bookmarkCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenDrawer('history');
            onCloseMobile();
          }}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <History className="h-4 w-4 text-slate-400" />
            Riwayat Riset
          </span>
          <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">{historyCount}</span>
        </button>

        {quota && (
          <div className="mt-2 border-t border-slate-100 px-3 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Kuota Harian</span>
              <span className="font-mono-tabular font-medium text-slate-700 dark:text-slate-300">
                {quota.remaining}/{quota.limit}
              </span>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-68 lg:shrink-0 lg:border-r lg:border-slate-200 dark:lg:border-slate-800">
        {sidebarBody}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] border-r border-slate-200 dark:border-slate-800">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}
