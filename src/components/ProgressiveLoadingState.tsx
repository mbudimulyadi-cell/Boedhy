import { useEffect, useState } from 'react';
import { BookOpenCheck, Scale } from 'lucide-react';

const GROUNDING_STEPS = [
  'Menelusuri korpus otentik UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026...',
  'Memverifikasi rumusan pasal, ayat, dan penjelasan resmi...',
  'Menyusun pemetaan unsur objektif, subjektif, dan logika hukum...',
];

export function ProgressiveLoadingState({ query }: { query: string }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev < GROUNDING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1100);
    return () => window.clearInterval(timer);
  }, [query]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#111830]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#000080]/20 bg-[#000080]/5 text-[#000080] dark:border-[#FFD700]/30 dark:bg-[#FFD700]/10 dark:text-[#FFD700]">
          <Scale className="h-5 w-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Melakukan Grounding Korpus Hukum
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 truncate">
              Objek telaah: <span className="font-medium text-slate-900 dark:text-slate-100">{query}</span>
            </p>
          </div>

          <ol className="space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            {GROUNDING_STEPS.map((step, idx) => {
              const isActive = idx === stepIndex;
              const isDone = idx < stepIndex;
              return (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono-tabular text-xs ${
                      isDone
                        ? 'border-[#000080] bg-[#000080] text-white dark:border-[#FFD700] dark:bg-[#FFD700] dark:text-[#0B1020]'
                        : isActive
                        ? 'border-[#000080] text-[#000080] dark:border-[#FFD700] dark:text-[#FFD700]'
                        : 'border-slate-300 text-slate-400 dark:border-slate-700 dark:text-slate-500'
                    }`}
                  >
                    {isDone ? <BookOpenCheck className="h-3 w-3" /> : idx + 1}
                  </span>
                  <span
                    className={
                      isActive || isDone
                        ? 'font-medium text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
