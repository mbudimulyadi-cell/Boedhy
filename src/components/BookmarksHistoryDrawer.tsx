import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bookmark, History, Search, Trash2, X } from 'lucide-react';
import type { AnalysisRecord, BookmarkItem, ModuleId } from '../types/kuhp.ts';
import { KUHP_CORPUS } from '../data/kuhpCorpus.ts';

interface BookmarksHistoryDrawerProps {
  open: boolean;
  initialTab: 'bookmarks' | 'history' | 'corpus';
  onClose: () => void;
  bookmarks: BookmarkItem[];
  history: AnalysisRecord[];
  onSelectRecord: (record: AnalysisRecord) => void;
  onRemoveBookmark: (id: string) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
  onInspectCorpusPasal: (pasal: string, targetModule?: ModuleId) => void;
}

export function BookmarksHistoryDrawer({
  open,
  initialTab,
  onClose,
  bookmarks,
  history,
  onSelectRecord,
  onRemoveBookmark,
  onRemoveHistory,
  onClearHistory,
  onInspectCorpusPasal,
}: BookmarksHistoryDrawerProps) {
  const [tab, setTab] = useState<'bookmarks' | 'history' | 'corpus'>(initialTab);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  const activeTab = tab;

  const filteredBookmarks = useMemo(() => {
    const q = search.toLowerCase();
    return bookmarks.filter(
      (b) => b.title.toLowerCase().includes(q) || b.pasalRef.toLowerCase().includes(q)
    );
  }, [bookmarks, search]);

  const filteredHistory = useMemo(() => {
    const q = search.toLowerCase();
    return history.filter(
      (h) => h.title.toLowerCase().includes(q) || h.query.toLowerCase().includes(q)
    );
  }, [history, search]);

  const filteredCorpus = useMemo(() => {
    const q = search.toLowerCase();
    return KUHP_CORPUS.filter(
      (c) =>
        c.pasal.toLowerCase().includes(q) ||
        c.judul.toLowerCase().includes(q) ||
        c.kataKunci.some((k) => k.toLowerCase().includes(q)) ||
        (c.wvsPadanan && c.wvsPadanan.toLowerCase().includes(q))
    );
  }, [search]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manajemen Bookmark, Riwayat, dan Korpus UU 1/2023"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[1px]"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111830]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Pustaka &amp; Riwayat Riset
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel pustaka"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Tab Controls */}
        <div className="border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-[#0B1020]">
            <button
              type="button"
              onClick={() => setTab('bookmarks')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'bookmarks'
                  ? 'bg-white text-[#000080] shadow-xs dark:bg-[#111830] dark:text-[#FFD700]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Bookmark ({bookmarks.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-[#000080] shadow-xs dark:bg-[#111830] dark:text-[#FFD700]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Riwayat ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('corpus')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'corpus'
                  ? 'bg-white text-[#000080] shadow-xs dark:bg-[#111830] dark:text-[#FFD700]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Korpus ({KUHP_CORPUS.length})
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pasal, judul delik, atau topik..."
              aria-label="Cari di pustaka dan riwayat"
              className="w-full rounded-lg border border-slate-200 bg-[#F8F8F8] py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#000080] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeTab === 'bookmarks' && (
            <>
              {filteredBookmarks.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Belum ada pasal atau analisis yang di-bookmark. Klik tombol &ldquo;Bookmark&rdquo; pada hasil
                  analisis untuk menyimpannya di sini.
                </p>
              ) : (
                filteredBookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRecord(b.record);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-xs font-medium text-[#000080] dark:text-[#FFD700]">{b.pasalRef}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{b.title}</p>
                      <p className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                        {new Date(b.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(b.id)}
                      aria-label={`Hapus bookmark ${b.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {filteredHistory.length > 0 && (
                <div className="flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Bersihkan Semua Riwayat
                  </button>
                </div>
              )}
              {filteredHistory.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Riwayat riset masih kosong.
                </p>
              ) : (
                filteredHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRecord(h);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{h.module}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{h.title}</p>
                      <p className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                        {new Date(h.createdAt).toLocaleString('id-ID')}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveHistory(h.id)}
                      aria-label={`Hapus riwayat ${h.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'corpus' && (
            <div className="space-y-3">
              {filteredCorpus.map((art) => (
                <div
                  key={art.pasal}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono-tabular text-xs font-semibold text-[#000080] dark:text-[#FFD700]">
                        {art.pasal}
                        {art.diubahOlehUU2026 ? ' · Penyesuaian UU 1/2026' : ''}
                        {art.wvsPadanan ? ` · Padanan ${art.wvsPadanan}` : ''}
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {art.judul}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onInspectCorpusPasal(art.pasal, 'bedah-pasal');
                        onClose();
                      }}
                      className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#000080] hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:text-[#FFD700] dark:hover:bg-slate-800"
                    >
                      Bedah
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {art.bunyi}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
