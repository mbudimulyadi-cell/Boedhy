import { useState } from 'react';
import { MessageSquareText, RotateCcw, Send } from 'lucide-react';
import type { SocraticTurn } from '../types/kuhp.ts';
import { MODULES } from '../data/presets.ts';

interface SocraticDiscussionViewProps {
  turns: SocraticTurn[];
  loading: boolean;
  error: string | null;
  onSendTurn: (text: string) => Promise<void>;
  onReset: () => void;
}

export function SocraticDiscussionView({
  turns,
  loading,
  error,
  onSendTurn,
  onReset,
}: SocraticDiscussionViewProps) {
  const [input, setInput] = useState('');
  const socraticConfig = MODULES.find((m) => m.id === 'diskusi-socratic')!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    await onSendTurn(trimmed);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#111830]">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Mode Diskusi Socratic — Penalaran Hukum Pidana
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            Uji argumentasi yuridis Anda. Dosen Socratic akan menantang premis Anda menggunakan teks UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026.
          </p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sesi Baru
          </button>
        )}
      </div>

      {/* Empty state with quick topics */}
      {turns.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#111830]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#000080]/10 text-[#000080] dark:bg-[#FFD700]/15 dark:text-[#FFD700]">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Mulai Dialog Akademis
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Ajukan tesis hukum atau pilih salah satu pemantik di bawah ini. Sistem akan mengevaluasi konsistensi
                argumen Anda terhadap norma UU 1/2023 jo. UU 1/2026 dan mengembalikan pertanyaan kritis.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {socraticConfig.quickExamples.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => onSendTurn(ex.query)}
                    disabled={loading}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-[#000080] hover:text-[#000080] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#FFD700] dark:hover:text-[#FFD700]"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {turns.map((turn, idx) => (
            <div
              key={`${turn.timestamp}-${idx}`}
              className={`rounded-xl border p-5 ${
                turn.role === 'user'
                  ? 'ml-auto max-w-3xl border-[#000080]/20 bg-[#000080]/5 dark:border-[#FFD700]/25 dark:bg-[#FFD700]/10'
                  : 'mr-auto max-w-4xl border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111830]'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {turn.role === 'user' ? 'Argumen Anda' : 'Pembimbing Socratic (UU 1/2023 jo. UU 1/2026)'}
                </span>
                <span className="font-mono-tabular">
                  {new Date(turn.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="mt-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-line dark:text-slate-100">
                {turn.content}
              </p>

              {turn.pertanyaanPemantik && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#0B1020]">
                  <p className="text-xs font-semibold text-[#000080] dark:text-[#FFD700]">
                    Pertanyaan Kritis Untuk Anda:
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                    {turn.pertanyaanPemantik}
                  </p>
                </div>
              )}

              {turn.rujukanPasal && turn.rujukanPasal.length > 0 && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Rujukan korpus: {turn.rujukanPasal.join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111830]"
      >
        <label htmlFor="socratic-input" className="sr-only">
          Tulis argumen atau tanggapan hukum Anda
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            id="socratic-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={socraticConfig.inputPlaceholder}
            className="flex-1 resize-y rounded-lg border border-slate-300 bg-[#F8F8F8] px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#000080] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#FFD700]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#000080] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A144A] disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-[#FFD700] dark:text-[#0B1020] dark:hover:bg-[#E5C100]"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Menelaah...' : 'Kirim Argumen'}
          </button>
        </div>
      </form>
    </div>
  );
}
