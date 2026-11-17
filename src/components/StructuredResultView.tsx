import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Copy,
  FileDown,
  FileText,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import type {
  AnalysisRecord,
  BedahKataKunciResult,
  BedahPasalResult,
  KomparatorResult,
  SimulatorKasusResult,
} from '../types/kuhp.ts';
import { LogicTreeView } from './LogicTreeView.tsx';
import {
  exportRecordAsDocx,
  exportRecordAsPDF,
  formatRecordAsMarkdown,
} from '../utils/exportDocument.ts';

interface StructuredResultViewProps {
  record: AnalysisRecord;
  isBookmarked: boolean;
  onToggleBookmark: (record: AnalysisRecord) => void;
  onInspectPasal?: (pasal: string) => void;
}

function BedahPasalBody({ data }: { data: BedahPasalResult }) {
  return (
    <div className="space-y-8">
      {/* Header Metadata (Zero-Pill clean typography) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{data.bukuBab}</span>
          <span aria-hidden="true">·</span>
          <span>{data.jenisDelik}</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          {data.pasalNomor} — {data.judulDelik}
        </h2>
        <p className="text-sm font-medium text-[#000080] dark:text-[#FFD700]">
          Ancaman Pidana: {data.ancamanPidana}
        </p>
      </div>

      {/* Bunyi Pasal Otentik */}
      <section aria-label="Bunyi Pasal Otentik" className="space-y-2.5">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Bunyi Pasal Otentik (UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026)
        </h3>
        <blockquote className="rounded-lg border border-slate-200 bg-[#F8F8F8] p-5 font-display text-sm leading-relaxed text-slate-800 whitespace-pre-line dark:border-slate-800 dark:bg-[#0B1020] dark:text-slate-200">
          {data.bunyiPasal}
        </blockquote>
      </section>

      {/* Tabel Unsur Objektif & Subjektif */}
      {data.unsur && data.unsur.length > 0 && (
        <section aria-label="Tabel Unsur Tindak Pidana" className="space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Bedah Unsur Objektif &amp; Subjektif
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <th className="px-4 py-3 whitespace-nowrap">Kategori Unsur</th>
                  <th className="px-4 py-3 whitespace-nowrap">Rumusan Elemen</th>
                  <th className="px-4 py-3">Uraian Yuridis</th>
                  <th className="px-4 py-3">Parameter Pembuktian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.unsur.map((u, idx) => (
                  <tr key={`${u.elemen}-${idx}`} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-medium text-[#000080] dark:text-[#FFD700] whitespace-nowrap">
                      {u.kategori}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{u.elemen}</td>
                    <td className="px-4 py-3 leading-relaxed text-slate-700 dark:text-slate-300">{u.uraian}</td>
                    <td className="px-4 py-3 leading-relaxed text-slate-600 dark:text-slate-400">{u.pembuktian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Logika Pohon */}
      <LogicTreeView nodes={data.logikaPohon} title="Logika Pohon Pembuktian Tindak Pidana" />

      {/* Penjelasan Otentik & Catatan Penerapan */}
      <section aria-label="Penjelasan Otentik" className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Penjelasan Otentik &amp; Catatan Penerapan
        </h3>
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line dark:text-slate-300">
          {data.penjelasanOtentik}
        </p>
        {data.catatanPenerapan && data.catatanPenerapan.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {data.catatanPenerapan.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono-tabular text-xs font-semibold text-[#000080] dark:text-[#FFD700] mt-0.5">
                  0{idx + 1}.
                </span>
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BedahKataKunciBody({
  data,
  onInspectPasal,
}: {
  data: BedahKataKunciResult;
  onInspectPasal?: (pasal: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Penelusuran Kata Kunci · {data.dasarKlasifikasi}
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Ikhtisar Kata Kunci: &ldquo;{data.kataKunci}&rdquo;
        </h2>
      </div>

      <section aria-label="Pengertian Yuridis" className="space-y-2.5">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Pengertian &amp; Ruang Lingkup Yuridis
        </h3>
        <p className="rounded-lg border border-slate-200 bg-[#F8F8F8] p-5 text-sm leading-relaxed text-slate-800 whitespace-pre-line dark:border-slate-800 dark:bg-[#0B1020] dark:text-slate-200">
          {data.pengertianYuridis}
        </p>
      </section>

      {data.daftarPasal && data.daftarPasal.length > 0 && (
        <section aria-label="Daftar Pasal Terkait" className="space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Pasal-Pasal yang Memuat &ldquo;{data.kataKunci}&rdquo; ({data.daftarPasal.length} Rujukan)
          </h3>
          <div className="space-y-3">
            {data.daftarPasal.map((item, idx) => (
              <article
                key={`${item.pasalNomor}-${idx}`}
                className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-[#0B1020]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-mono-tabular text-xs font-semibold text-[#000080] dark:text-[#FFD700]">
                      {item.pasalNomor}
                    </p>
                    <h4 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {item.judul}
                    </h4>
                  </div>
                  {onInspectPasal && (
                    <button
                      type="button"
                      onClick={() => onInspectPasal(item.pasalNomor)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#000080]/30 bg-[#000080]/5 px-3 py-1.5 text-xs font-semibold text-[#000080] hover:bg-[#000080] hover:text-white transition-colors whitespace-nowrap shrink-0 dark:border-[#FFD700]/40 dark:bg-[#FFD700]/10 dark:text-[#FFD700] dark:hover:bg-[#FFD700] dark:hover:text-[#0B1020]"
                    >
                      Bedah Pasal Ini
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <p className="mt-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {item.ringkasanIsi}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">Ancaman Pidana: </span>
                    <span className="text-slate-600 dark:text-slate-400">{item.ancamanPidana}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">Catatan Relevansi: </span>
                    <span className="text-slate-600 dark:text-slate-400">{item.catatanRelevansi}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.halPenting && data.halPenting.length > 0 && (
        <section
          aria-label="Hal Penting Lainnya"
          className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Hal-Hal Penting yang Perlu Diperhatikan
          </h3>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {data.halPenting.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono-tabular text-xs font-semibold text-[#000080] dark:text-[#FFD700] mt-0.5">
                  0{idx + 1}.
                </span>
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function KomparatorBody({ data }: { data: KomparatorResult }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>KUHP Baru: {data.pasalBaru}</span>
          <span aria-hidden="true">·</span>
          <span>KUHP Lama (WvS / UU 1/1946): {data.pasalLama}</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          {data.judulPerbandingan}
        </h2>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{data.ringkasanPergeseran}</p>
      </div>

      <section aria-label="Matriks Perbandingan" className="space-y-3">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Matriks Komparasi Norma &amp; Sanksi
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <th className="px-4 py-3 whitespace-nowrap">Aspek Perbandingan</th>
                <th className="px-4 py-3">UU 1/2023 jo. UU 1/2026 (Baru)</th>
                <th className="px-4 py-3">WvS jo. UU 1/1946 (Lama)</th>
                <th className="px-4 py-3">Implikasi Hukum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.tabelPerbandingan.map((row, idx) => (
                <tr key={idx} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.aspek}
                  </td>
                  <td className="px-4 py-3 leading-relaxed text-slate-800 dark:text-slate-200">{row.kuhpBaru}</td>
                  <td className="px-4 py-3 leading-relaxed text-slate-600 dark:text-slate-400">{row.kuhpLama}</td>
                  <td className="px-4 py-3 leading-relaxed text-[#000080] dark:text-[#FFD700]">
                    {row.implikasiHukum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-label="Asas Peralihan Pasal 3"
        className="rounded-lg border border-slate-200 bg-[#F8F8F8] p-5 dark:border-slate-800 dark:bg-[#0B1020]"
      >
        <h3 className="font-display text-sm font-semibold text-[#000080] dark:text-[#FFD700]">
          Implikasi Asas Peralihan (Pasal 3 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 · Lex Mitior)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{data.asasPeralihanPasal3}</p>
      </section>
    </div>
  );
}

function SimulatorKasusBody({ data }: { data: SimulatorKasusResult }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Rujukan Pasal: {data.pasalTerkait.join(' · ')}
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Analisis Kasus Pidana (Case Solver)
        </h2>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{data.ringkasanFakta}</p>
      </div>

      <section aria-label="Evaluasi Pemenuhan Unsur" className="space-y-3">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Pengujian Fakta Terhadap Unsur Pasal
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <th className="px-4 py-3">Unsur Delik</th>
                <th className="px-4 py-3">Fakta Terkait</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3">Analisis Yuridis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.evaluasiUnsur.map((ev, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{ev.unsur}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{ev.faktaKasus}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      {ev.statusPemenuhan === 'Terpenuhi' && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-300">Terpenuhi</span>
                        </>
                      )}
                      {ev.statusPemenuhan === 'Tidak Terpenuhi' && (
                        <>
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-red-700 dark:text-red-300">Tidak Terpenuhi</span>
                        </>
                      )}
                      {ev.statusPemenuhan === 'Perlu Pembuktian Lanjut' && (
                        <>
                          <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-amber-700 dark:text-amber-300">Perlu Pembuktian</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 leading-relaxed text-slate-700 dark:text-slate-300">{ev.analisis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LogicTreeView nodes={data.logikaPohonKasus} title="Alur Logika Pertanggungjawaban Pidana" />

      <div className="grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 md:grid-cols-2 dark:border-slate-800">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Alasan Pembenar / Pemaaf (Pasal 31–44)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {data.alasanPenghapusPidana}
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-[#000080] dark:text-[#FFD700]">
            Kualifikasi &amp; Kesimpulan Akademis
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{data.rekomendasiKualifikasi}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{data.kesimpulanAkademis}</p>
        </div>
      </div>
    </div>
  );
}

export function StructuredResultView({
  record,
  isBookmarked,
  onToggleBookmark,
  onInspectPasal,
}: StructuredResultViewProps) {
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatRecordAsMarkdown(record));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      await exportRecordAsDocx(record);
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#111830]">
      {/* Action Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span>Terverifikasi Korpus UU 1/2023 jo. UU 1/2026</span>
          <span aria-hidden="true" className="mx-2">·</span>
          <span className="font-mono-tabular">
            {new Date(record.createdAt).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(record)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              isBookmarked
                ? 'border-[#000080] bg-[#000080]/10 text-[#000080] dark:border-[#FFD700] dark:bg-[#FFD700]/15 dark:text-[#FFD700]'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            {isBookmarked ? 'Tersimpan' : 'Bookmark'}
          </button>

          <button
            type="button"
            onClick={() => exportRecordAsPDF(record)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileDown className="h-3.5 w-3.5" />
            Ekspor PDF
          </button>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={exportingDocx}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5" />
            {exportingDocx ? 'Menyiapkan...' : 'Ekspor DOCX'}
          </button>
        </div>
      </div>

      {/* Warning if not found in corpus */}
      {!record.result.ditemukanDalamKorpus && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Data tidak ditemukan dalam korpus UU</p>
            <p className="mt-0.5">
              Permintaan Anda di luar cakupan Pasal 1–624 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 atau tidak
              memiliki dasar ketentuan pidana yang terverifikasi.
            </p>
          </div>
        </div>
      )}

      {record.result.kind === 'bedah-pasal' && <BedahPasalBody data={record.result} />}
      {record.result.kind === 'bedah-kata-kunci' && (
        <BedahKataKunciBody data={record.result} onInspectPasal={onInspectPasal} />
      )}
      {record.result.kind === 'komparator' && <KomparatorBody data={record.result} />}
      {record.result.kind === 'simulator-kasus' && <SimulatorKasusBody data={record.result} />}
    </div>
  );
}
