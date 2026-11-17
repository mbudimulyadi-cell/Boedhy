import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Menu,
  Moon,
  Send,
  Sun,
} from 'lucide-react';
import type {
  AnalysisRecord,
  BookmarkItem,
  ModuleId,
  SocraticTurn,
} from './types/kuhp.ts';
import { MODULES, SEED_HISTORY_RECORDS } from './data/presets.ts';
import { validatePasalInput } from './data/kuhpCorpus.ts';
import {
  runBedahPasalLocal,
  runKomparatorLocal,
  runSimulatorKasusLocal,
  runSocraticTurnLocal,
} from './utils/legalAnalysisEngine.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { ProgressiveLoadingState } from './components/ProgressiveLoadingState.tsx';
import { StructuredResultView } from './components/StructuredResultView.tsx';
import { SanctionCalculatorView } from './components/SanctionCalculatorView.tsx';
import { SocraticDiscussionView } from './components/SocraticDiscussionView.tsx';
import { BookmarksHistoryDrawer } from './components/BookmarksHistoryDrawer.tsx';

const STORAGE_KEYS = {
  HISTORY: 'klinik_kuhp_history_v2',
  BOOKMARKS: 'klinik_kuhp_bookmarks_v2',
  THEME: 'klinik_kuhp_theme_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('bedah-pasal');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEYS.THEME) === 'dark';
  });

  const [history, setHistory] = useState<AnalysisRecord[]>(() =>
    readStorage<AnalysisRecord[]>(STORAGE_KEYS.HISTORY, SEED_HISTORY_RECORDS)
  );
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    readStorage<BookmarkItem[]>(STORAGE_KEYS.BOOKMARKS, [])
  );

  const [activeRecord, setActiveRecord] = useState<AnalysisRecord | null>(
    () => SEED_HISTORY_RECORDS[0] ?? null
  );
  const [queryInput, setQueryInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationSuggestions, setValidationSuggestions] = useState<
    { pasal: string; judul: string }[]
  >([]);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const [socraticTurns, setSocraticTurns] = useState<SocraticTurn[]>([]);
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [socraticError, setSocraticError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'bookmarks' | 'history' | 'corpus'>('bookmarks');

  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      window.localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookmarks]);

  useEffect(() => {
    fetch('/api/kuhp/quota')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.remaining === 'number') {
          setQuota({ remaining: data.remaining, limit: data.limit });
        }
      })
      .catch(() => {});
  }, []);

  const currentModuleConfig = useMemo(
    () => MODULES.find((m) => m.id === activeModule) ?? MODULES[0],
    [activeModule]
  );

  const handleSelectModule = (modId: ModuleId) => {
    setActiveModule(modId);
    setErrorMsg(null);
    setNoticeMsg(null);
    setValidationSuggestions([]);
    const match = history.find((h) => h.module === modId) ?? null;
    setActiveRecord(match);
  };

  const runAnalysis = async (customQuery?: string, targetModule?: ModuleId) => {
    const mod = targetModule ?? activeModule;
    const rawQuery = (customQuery ?? queryInput).trim();
    if (!rawQuery) {
      const modConf = MODULES.find((m) => m.id === mod);
      const fallbackExample = modConf?.quickExamples[0]?.query;
      if (!fallbackExample) {
        setNoticeMsg('Silakan ketik kata kunci, nomor pasal, atau kronologi kasus untuk memulai telaah.');
        return;
      }
      setQueryInput(fallbackExample);
      return runAnalysis(fallbackExample, mod);
    }

    setErrorMsg(null);
    setNoticeMsg(null);
    setValidationSuggestions([]);

    if (mod === 'bedah-pasal' || mod === 'komparator') {
      const check = validatePasalInput(rawQuery, mod);
      if (!check.valid) {
        setNoticeMsg(check.message ?? 'Nomor pasal di luar Pasal 1–624 UU No. 1 Tahun 2023.');
        setValidationSuggestions(
          check.suggestions.map((s) => ({ pasal: s.pasal, judul: s.judul }))
        );
        return;
      }
      if (check.message) {
        setNoticeMsg(check.message);
      }
    }

    if (targetModule && targetModule !== activeModule) {
      setActiveModule(targetModule);
    }

    const computeLocalResult = () =>
      mod === 'komparator'
        ? runKomparatorLocal(rawQuery)
        : mod === 'simulator-kasus'
        ? runSimulatorKasusLocal(rawQuery)
        : runBedahPasalLocal(rawQuery);

    setLoading(true);
    try {
      const res = await fetch('/api/kuhp/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: mod,
          query: rawQuery,
        }),
      });

      let result = computeLocalResult();
      if (res.ok) {
        const payload = await res.json();
        if (payload.quota && typeof payload.quota.remaining === 'number') {
          setQuota({ remaining: payload.quota.remaining, limit: payload.quota.limit });
        }
        if (payload.result) {
          result = payload.result;
        }
      }

      const derivedTitle =
        result.kind === 'bedah-pasal'
          ? `${result.pasalNomor} — ${result.judulDelik}`
          : result.kind === 'bedah-kata-kunci'
          ? `Ikhtisar Kata Kunci: ${result.kataKunci}`
          : result.kind === 'komparator'
          ? result.judulPerbandingan
          : `Analisis Kasus (${result.pasalTerkait.slice(0, 2).join(', ') || 'UU 1/2023'})`;

      const newRecord: AnalysisRecord = {
        id: `rec-${Date.now()}`,
        module: mod,
        query: rawQuery,
        title: derivedTitle,
        createdAt: Date.now(),
        result,
      };

      setActiveRecord(newRecord);
      setHistory((prev) => [newRecord, ...prev].slice(0, 30));
    } catch {
      const result = computeLocalResult();
      const derivedTitle =
        result.kind === 'bedah-pasal'
          ? `${result.pasalNomor} — ${result.judulDelik}`
          : result.kind === 'bedah-kata-kunci'
          ? `Ikhtisar Kata Kunci: ${result.kataKunci}`
          : result.kind === 'komparator'
          ? result.judulPerbandingan
          : `Analisis Kasus (${result.pasalTerkait.slice(0, 2).join(', ') || 'UU 1/2023'})`;

      const newRecord: AnalysisRecord = {
        id: `rec-${Date.now()}`,
        module: mod,
        query: rawQuery,
        title: derivedTitle,
        createdAt: Date.now(),
        result,
      };
      setActiveRecord(newRecord);
      setHistory((prev) => [newRecord, ...prev].slice(0, 30));
    } finally {
      setLoading(false);
    }
  };

  const handleSendSocraticTurn = async (text: string) => {
    setSocraticError(null);
    const userTurn: SocraticTurn = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const nextTurns = [...socraticTurns, userTurn];
    setSocraticTurns(nextTurns);
    setSocraticLoading(true);

    const simplifiedMessages = nextTurns.map((t) => ({ role: t.role, content: t.content }));

    try {
      const res = await fetch('/api/kuhp/socratic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: simplifiedMessages }),
      });

      let reply = runSocraticTurnLocal(simplifiedMessages);
      if (res.ok) {
        const payload = await res.json();
        if (payload.quota && typeof payload.quota.remaining === 'number') {
          setQuota({ remaining: payload.quota.remaining, limit: payload.quota.limit });
        }
        if (payload.reply) {
          reply = payload.reply;
        }
      }

      const assistantTurn: SocraticTurn = {
        role: 'assistant',
        content: reply.tanggapan,
        rujukanPasal: reply.rujukanPasal,
        pertanyaanPemantik: reply.pertanyaanPemantik,
        timestamp: Date.now(),
      };
      setSocraticTurns((prev) => [...prev, assistantTurn]);
    } catch {
      const reply = runSocraticTurnLocal(simplifiedMessages);
      const assistantTurn: SocraticTurn = {
        role: 'assistant',
        content: reply.tanggapan,
        rujukanPasal: reply.rujukanPasal,
        pertanyaanPemantik: reply.pertanyaanPemantik,
        timestamp: Date.now(),
      };
      setSocraticTurns((prev) => [...prev, assistantTurn]);
    } finally {
      setSocraticLoading(false);
    }
  };

  const handleToggleBookmark = (record: AnalysisRecord) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.record.id === record.id);
      if (exists) {
        return prev.filter((b) => b.record.id !== record.id);
      }
      const pasalRef =
        record.result.kind === 'bedah-pasal'
          ? record.result.pasalNomor
          : record.result.kind === 'bedah-kata-kunci'
          ? `Kata Kunci: ${record.result.kataKunci}`
          : record.result.kind === 'komparator'
          ? `${record.result.pasalBaru} vs ${record.result.pasalLama}`
          : record.result.pasalTerkait.join(', ');
      const item: BookmarkItem = {
        id: `bm-${Date.now()}`,
        module: record.module,
        title: record.title,
        pasalRef,
        note: '',
        createdAt: Date.now(),
        record,
      };
      return [item, ...prev];
    });
  };

  const isCurrentBookmarked = Boolean(
    activeRecord && bookmarks.some((b) => b.record.id === activeRecord.id)
  );

  const isQueryBasedModule =
    activeModule === 'bedah-pasal' ||
    activeModule === 'komparator' ||
    activeModule === 'simulator-kasus';

  return (
    <div className="flex min-h-screen bg-[#F8F8F8] text-slate-900 dark:bg-[#0B1020] dark:text-slate-100">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        bookmarkCount={bookmarks.length}
        historyCount={history.length}
        quota={quota}
        onOpenDrawer={(tab) => {
          setDrawerTab(tab);
          setDrawerOpen(true);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xs sm:px-6 dark:border-slate-800 dark:bg-[#111830]/95">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka navigasi modul"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden font-display font-bold text-[#000080] sm:inline whitespace-nowrap dark:text-[#FFD700]">
                Klinik KUHP
              </span>
              <span aria-hidden="true" className="hidden text-slate-300 sm:inline dark:text-slate-700">
                /
              </span>
              <h1 className="truncate font-display text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-100">
                {currentModuleConfig.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDrawerTab('bookmarks');
                setDrawerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>Bookmark ({bookmarks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-4 w-4 text-[#FFD700]" /> : <Moon className="h-4 w-4 text-[#000080]" />}
            </button>
          </div>
        </header>

        {/* Central Minimalist Research Canvas */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {isQueryBasedModule && (
              <>
                {/* Query Composer Card */}
                <section
                  aria-label={`Panel Input ${currentModuleConfig.label}`}
                  className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#111830]"
                >
                  <div className="space-y-1">
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                      {currentModuleConfig.shortTitle}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {currentModuleConfig.description}
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      runAnalysis();
                    }}
                    className="mt-5 space-y-4"
                  >
                    <div
                      className={
                        activeModule === 'simulator-kasus'
                          ? 'space-y-3'
                          : 'flex flex-col gap-3 sm:flex-row sm:items-stretch'
                      }
                    >
                      <label htmlFor="kuhp-query-input" className="sr-only">
                        Input kueri hukum
                      </label>
                      {activeModule === 'simulator-kasus' ? (
                        <textarea
                          id="kuhp-query-input"
                          rows={4}
                          value={queryInput}
                          onChange={(e) => setQueryInput(e.target.value)}
                          placeholder={currentModuleConfig.inputPlaceholder}
                          className="w-full resize-y rounded-lg border border-slate-300 bg-[#F8F8F8] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#000080] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#FFD700]"
                        />
                      ) : (
                        <input
                          id="kuhp-query-input"
                          type="text"
                          value={queryInput}
                          onChange={(e) => setQueryInput(e.target.value)}
                          placeholder={currentModuleConfig.inputPlaceholder}
                          className="flex-1 rounded-lg border border-slate-300 bg-[#F8F8F8] px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#000080] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#FFD700]"
                        />
                      )}

                      {activeModule !== 'simulator-kasus' && (
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#000080] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A144A] disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-[#FFD700] dark:text-[#0B1020] dark:hover:bg-[#E5C100]"
                        >
                          <Send className="h-4 w-4" />
                          {loading ? 'Memproses...' : currentModuleConfig.submitLabel}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Contoh cepat:</span>
                        {currentModuleConfig.quickExamples.map((ex) => (
                          <button
                            key={ex.label}
                            type="button"
                            onClick={() => {
                              setQueryInput(ex.query);
                              runAnalysis(ex.query);
                            }}
                            disabled={loading}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#000080] hover:text-[#000080] transition-colors dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-300 dark:hover:border-[#FFD700] dark:hover:text-[#FFD700]"
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>

                      {activeModule === 'simulator-kasus' && (
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#000080] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A144A] disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-[#FFD700] dark:text-[#0B1020] dark:hover:bg-[#E5C100]"
                        >
                          <Send className="h-4 w-4" />
                          {loading ? 'Memproses...' : currentModuleConfig.submitLabel}
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Notice message & suggested articles (non-error soft guidance) */}
                  {noticeMsg && !errorMsg && (
                    <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                      <p>{noticeMsg}</p>
                      {validationSuggestions.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {validationSuggestions.map((s) => (
                            <button
                              key={s.pasal}
                              type="button"
                              onClick={() => {
                                setQueryInput(s.pasal);
                                runAnalysis(s.pasal);
                              }}
                              className="rounded-md border border-sky-300 bg-white px-2.5 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-[#111830] dark:text-sky-200"
                            >
                              {s.pasal} · {s.judul}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback alert only if unexpected */}
                  {errorMsg && (
                    <div
                      role="alert"
                      className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    </div>
                  )}
                </section>

                {/* Results / Loading / Empty Stage */}
                {loading ? (
                  <ProgressiveLoadingState query={queryInput} />
                ) : activeRecord && activeRecord.module === activeModule ? (
                  <StructuredResultView
                    record={activeRecord}
                    isBookmarked={isCurrentBookmarked}
                    onToggleBookmark={handleToggleBookmark}
                    onInspectPasal={(pasal) => {
                      setQueryInput(pasal);
                      runAnalysis(pasal, 'bedah-pasal');
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111830]">
                    <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      Siap Melakukan Telaah {currentModuleConfig.label}
                    </p>
                    <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-600 dark:text-slate-400">
                      Masukkan nomor pasal, kata kunci delik, atau pilih salah satu contoh cepat di atas untuk
                      menghasilkan analisis terstruktur yang terikat 100% pada teks UU No. 1 Tahun 2023 jo. UU No. 1
                      Tahun 2026.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeModule === 'kalkulator-sanksi' && <SanctionCalculatorView />}

            {activeModule === 'diskusi-socratic' && (
              <SocraticDiscussionView
                turns={socraticTurns}
                loading={socraticLoading}
                error={socraticError}
                onSendTurn={handleSendSocraticTurn}
                onReset={() => {
                  setSocraticTurns([]);
                  setSocraticError(null);
                }}
              />
            )}
          </div>
        </main>

        {/* Subtle Author Attribution Footer */}
        <footer className="border-t border-slate-200 bg-white/60 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#111830]/60 dark:text-slate-400">
          <p>
            Aplikasi ini dibuat oleh <span className="font-medium text-slate-700 dark:text-slate-200">M. Budi Mulyadi</span>{' '}
            · Referensi: UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 &amp; WvS jo. UU No. 1 Tahun 1946
          </p>
        </footer>
      </div>

      <BookmarksHistoryDrawer
        open={drawerOpen}
        initialTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
        bookmarks={bookmarks}
        history={history}
        onSelectRecord={(rec) => {
          setActiveModule(rec.module);
          setActiveRecord(rec);
          setErrorMsg(null);
        }}
        onRemoveBookmark={(id) => setBookmarks((prev) => prev.filter((b) => b.id !== id))}
        onRemoveHistory={(id) => setHistory((prev) => prev.filter((h) => h.id !== id))}
        onClearHistory={() => setHistory([])}
        onInspectCorpusPasal={(pasal, targetMod = 'bedah-pasal') => {
          setQueryInput(pasal);
          runAnalysis(pasal, targetMod);
        }}
      />
    </div>
  );
}
