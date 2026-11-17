import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Info, Scale } from 'lucide-react';
import { KUHP_CORPUS } from '../data/kuhpCorpus.ts';
import {
  FINE_CATEGORIES,
  calculateSanction,
  calculateSubstituteImprisonmentDays,
  formatDurationFromMonths,
  formatRupiah,
  type AncamanDasarTipe,
  type FaktorModifikasi,
  type FineCategorySpec,
} from '../utils/sanctionCalculator.ts';

const PRESET_ARTICLES = KUHP_CORPUS.filter((a) => typeof a.penjaraMaksBulan === 'number');

export function SanctionCalculatorView() {
  const [selectedPasal, setSelectedPasal] = useState<string>('Pasal 476');
  const [ancamanDasarTipe, setAncamanDasarTipe] = useState<AncamanDasarTipe>('penjara-tertentu');
  const [penjaraMaksTahun, setPenjaraMaksTahun] = useState<number>(5);
  const [penjaraMinTahun, setPenjaraMinTahun] = useState<number>(0);
  const [kategoriDenda, setKategoriDenda] = useState<FineCategorySpec['kategori']>('V');
  const [faktor, setFaktor] = useState<FaktorModifikasi>('normal');
  const [adalahKorporasi, setAdalahKorporasi] = useState<boolean>(false);
  const [customDendaRupiah, setCustomDendaRupiah] = useState<number>(6_000_000_000);

  const handleLoadPreset = (pasalName: string) => {
    setSelectedPasal(pasalName);
    const found = KUHP_CORPUS.find((a) => a.pasal === pasalName);
    if (!found) return;
    if (found.nomorAngka === 459) {
      setAncamanDasarTipe('pidana-mati');
      setPenjaraMaksTahun(20);
      setPenjaraMinTahun(0);
      setKategoriDenda('VI');
      return;
    }
    setAncamanDasarTipe('penjara-tertentu');
    if (found.penjaraMaksBulan) {
      setPenjaraMaksTahun(Number((found.penjaraMaksBulan / 12).toFixed(1)));
    }
    setPenjaraMinTahun(found.nomorAngka === 603 || found.nomorAngka === 604 ? 2 : 0);
    const katMatch = found.kategoriDenda?.match(/Kategori\s+(VIII|VII|VI|IV|V|III|II|I)/i);
    if (katMatch) {
      setKategoriDenda(katMatch[1].toUpperCase() as FineCategorySpec['kategori']);
    }
  };

  const result = useMemo(
    () =>
      calculateSanction({
        ancamanDasarTipe,
        penjaraMaksTahun,
        penjaraMinTahun,
        kategoriDenda,
        faktor,
        adalahKorporasi,
      }),
    [ancamanDasarTipe, penjaraMaksTahun, penjaraMinTahun, kategoriDenda, faktor, adalahKorporasi]
  );

  const substituteResult = useMemo(
    () => calculateSubstituteImprisonmentDays(customDendaRupiah),
    [customDendaRupiah]
  );

  return (
    <div className="space-y-8">
      {/* Header panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111830]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Kalkulator Sanksi &amp; Kategori Denda (UU 1/2023 jo. UU 1/2026)
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Hitung batas maksimum pidana penjara, Kategori Denda Pasal 79, batas pidana pengawasan Pasal 76 UU 1/2026
              (maks 3 tahun), serta penjara pengganti denda progresif Lampiran III UU 1/2026.
            </p>
          </div>
          <div className="w-full sm:w-64 shrink-0">
            <label
              htmlFor="preset-pasal-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Muat Parameter Pasal
            </label>
            <select
              id="preset-pasal-select"
              value={selectedPasal}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#000080] focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            >
              {PRESET_ARTICLES.map((art) => (
                <option key={art.pasal} value={art.pasal}>
                  {art.pasal} · {art.judul}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Controls */}
        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
          <div>
            <label
              htmlFor="ancaman-tipe"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Jenis Ancaman Pokok
            </label>
            <select
              id="ancaman-tipe"
              value={ancamanDasarTipe}
              onChange={(e) => setAncamanDasarTipe(e.target.value as AncamanDasarTipe)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#000080] focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            >
              <option value="penjara-tertentu">Pidana Penjara Waktu Tertentu</option>
              <option value="seumur-hidup">Pidana Penjara Seumur Hidup</option>
              <option value="pidana-mati">Pidana Mati (Percobaan 10 Tahun)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="penjara-maks"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Ancaman Maksimum Dasar (Tahun)
            </label>
            <input
              id="penjara-maks"
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              disabled={ancamanDasarTipe !== 'penjara-tertentu'}
              value={penjaraMaksTahun}
              onChange={(e) => setPenjaraMaksTahun(Math.max(0.5, Number(e.target.value) || 0.5))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-tabular text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#000080] focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:disabled:bg-slate-900 dark:focus:border-[#FFD700]"
            />
          </div>

          <div>
            <label
              htmlFor="kategori-denda"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Kategori Pidana Denda (Pasal 79)
            </label>
            <select
              id="kategori-denda"
              value={kategoriDenda}
              onChange={(e) => setKategoriDenda(e.target.value as FineCategorySpec['kategori'])}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#000080] focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            >
              {FINE_CATEGORIES.map((f) => (
                <option key={f.kategori} value={f.kategori}>
                  Kategori {f.kategori} — {f.labelRupiah}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="faktor-modifikasi"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Faktor Modifikasi Pemidanaan
            </label>
            <select
              id="faktor-modifikasi"
              value={faktor}
              onChange={(e) => setFaktor(e.target.value as FaktorModifikasi)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#000080] focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            >
              <option value="normal">Normal (Delik Selesai / Pelaku Tunggal)</option>
              <option value="percobaan">Percobaan — Maks 2/3 (Pasal 17)</option>
              <option value="pembantuan">Pembantuan — Maks 2/3 (Pasal 21)</option>
              <option value="pengulangan">Pengulangan / Residiv — +1/3 (Pasal 23)</option>
              <option value="perbarengan">Perbarengan / Concursus — +1/3 (Pasal 127)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="penjara-min"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Minimum Khusus (Tahun, jika ada)
            </label>
            <input
              id="penjara-min"
              type="number"
              min={0}
              max={15}
              step={0.5}
              value={penjaraMinTahun}
              onChange={(e) => setPenjaraMinTahun(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-tabular text-sm text-slate-900 focus:border-[#000080] focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            />
          </div>

          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700 whitespace-nowrap dark:text-slate-200">
              <input
                type="checkbox"
                checked={adalahKorporasi}
                onChange={(e) => setAdalahKorporasi(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#000080] focus:ring-[#000080]"
              />
              Korporasi (Ps. 121 · Min. Kat. IV)
            </label>
          </div>
        </div>
      </div>

      {/* Deterministic Result Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111830]">
        <div className="flex items-center gap-2.5">
          <Calculator className="h-5 w-5 text-[#000080] dark:text-[#FFD700]" />
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Hasil Kalkulasi Pemidanaan
          </h3>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 border-y border-slate-100 py-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Batas Maksimum Penjara</p>
            <p
              data-testid="calc-max-prison"
              className="mt-1 font-display font-mono-tabular text-lg font-bold text-[#000080] dark:text-[#FFD700]"
            >
              {result.maksimalPenjaraLabel}
            </p>
            {result.minimalPenjaraBulan > 0 && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                Min. khusus: {penjaraMinTahun} tahun
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Batas Maksimum Denda</p>
            <p
              data-testid="calc-max-fine"
              className="mt-1 font-display font-mono-tabular text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {result.maksimalDendaLabel}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Kategori {kategoriDenda} {adalahKorporasi ? '(Penyesuaian Korporasi)' : ''}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pidana Pengawasan (Ps. 75–76)</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <CheckCircle2
                className={`h-4 w-4 ${
                  result.layakPidanaPengawasan ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`}
              />
              {result.layakPidanaPengawasan && result.maksimalPengawasanBulan !== null
                ? `Maks. ${formatDurationFromMonths(result.maksimalPengawasanBulan)}`
                : 'Tidak Memenuhi Syarat'}
            </p>
            {result.layakPidanaPengawasan && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Pelaku pertama kali (UU 1/2026)
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pidana Kerja Sosial (Ps. 85)</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <CheckCircle2
                className={`h-4 w-4 ${
                  result.layakKerjaSosialPotensial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`}
              />
              {result.layakKerjaSosialPotensial ? 'Berpotensi (Ancaman < 5 Thn)' : 'Tidak Memenuhi Syarat'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              Dasar Hukum Kalkulasi
            </h4>
            <ul className="mt-2.5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              {result.dasarHukum.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#000080] dark:bg-[#FFD700]" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              Catatan Eksekusi &amp; Pidana Alternatif
            </h4>
            <ul className="mt-2.5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              {result.catatanAlternatif.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Lampiran III UU No. 1 Tahun 2026: Kalkulator Progresif Penjara Pengganti Denda */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111830]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-[#000080] dark:text-[#FFD700]" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Kalkulator Penjara Pengganti Denda (Pasal 82 jo. Lampiran III UU 1/2026)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konversi progresif apabila penyitaan/lelang harta tidak mencukupi (1 hari s.d. maks 2 tahun / 730 hari).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCustomDendaRupiah(result.maksimalDendaRupiah)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-[#000080] hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-[#FFD700] dark:hover:bg-slate-800"
          >
            Pakai Batas Kategori {kategoriDenda} ({result.maksimalDendaLabel})
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 border-t border-slate-100 pt-5 lg:grid-cols-2 dark:border-slate-800">
          <div className="space-y-3">
            <label
              htmlFor="custom-denda-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Nominal Pidana Denda yang Tidak Dibayar (Rupiah)
            </label>
            <input
              id="custom-denda-input"
              type="number"
              min={0}
              step={1_000_000}
              value={customDendaRupiah}
              onChange={(e) => setCustomDendaRupiah(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-slate-300 bg-[#F8F8F8] px-4 py-2.5 font-mono-tabular text-sm text-slate-900 focus:border-[#000080] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-100 dark:focus:border-[#FFD700]"
            />
            <div className="flex flex-wrap gap-2">
              {[50_000_000, 500_000_000, 2_000_000_000, 6_000_000_000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomDendaRupiah(preset)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono-tabular text-xs text-slate-700 hover:border-[#000080] dark:border-slate-700 dark:bg-[#0B1020] dark:text-slate-300 dark:hover:border-[#FFD700]"
                >
                  {formatRupiah(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F8F8F8] p-4 dark:border-slate-800 dark:bg-[#0B1020]">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Lama Pidana Penjara Pengganti
            </p>
            <p
              data-testid="calc-substitute-days"
              className="mt-1 font-display font-mono-tabular text-2xl font-bold text-[#000080] dark:text-[#FFD700]"
            >
              {substituteResult.days} Hari
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              {substituteResult.breakdown.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reference Table: Pasal 79 Kategori Denda */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#111830]">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Referensi Tabel Kategori Pidana Denda (Pasal 79 jo. Lampiran III UU 1/2026)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                <th className="px-6 py-3">Kategori</th>
                <th className="px-6 py-3 text-right">Batas Maksimum</th>
                <th className="px-6 py-3">Ketentuan Konversi &amp; Eksekusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {FINE_CATEGORIES.map((row) => (
                <tr
                  key={row.kategori}
                  className={
                    row.kategori === kategoriDenda
                      ? 'bg-[#000080]/5 dark:bg-[#FFD700]/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
                  }
                >
                  <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    Kategori {row.kategori}
                  </td>
                  <td className="px-6 py-3 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.labelRupiah}
                  </td>
                  <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{row.catatanPengganti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
