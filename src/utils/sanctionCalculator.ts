export interface FineCategorySpec {
  kategori: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';
  maksimumRupiah: number;
  labelRupiah: string;
  catatanPengganti: string;
}

export const FINE_CATEGORIES: FineCategorySpec[] = [
  {
    kategori: 'I',
    maksimumRupiah: 1_000_000,
    labelRupiah: 'Rp1.000.000',
    catatanPengganti: 'Penjara pengganti 1 hari (Lampiran III UU 1/2026) atau dapat diganti kerja sosial/pengawasan (Pasal 81)',
  },
  {
    kategori: 'II',
    maksimumRupiah: 10_000_000,
    labelRupiah: 'Rp10.000.000',
    catatanPengganti: 'Batas tertinggi denda yang dapat diganti kerja sosial/pengawasan; penjara pengganti maks 10 hari (Lampiran III UU 1/2026)',
  },
  {
    kategori: 'III',
    maksimumRupiah: 50_000_000,
    labelRupiah: 'Rp50.000.000',
    catatanPengganti: 'Wajib eksekusi penyitaan/lelang harta terlebih dahulu; penjara pengganti maks 50 hari (Rp1 jt/hari)',
  },
  {
    kategori: 'IV',
    maksimumRupiah: 200_000_000,
    labelRupiah: 'Rp200.000.000',
    catatanPengganti: 'Wajib penyitaan/lelang; penjara pengganti progresif maks 80 hari (Lampiran III UU 1/2026)',
  },
  {
    kategori: 'V',
    maksimumRupiah: 500_000_000,
    labelRupiah: 'Rp500.000.000',
    catatanPengganti: 'Wajib penyitaan/lelang; penjara pengganti progresif maks 140 hari (Lampiran III UU 1/2026)',
  },
  {
    kategori: 'VI',
    maksimumRupiah: 2_000_000_000,
    labelRupiah: 'Rp2.000.000.000',
    catatanPengganti: 'Penjara pengganti progresif maks 290 hari (Lampiran III UU 1/2026)',
  },
  {
    kategori: 'VII',
    maksimumRupiah: 5_000_000_000,
    labelRupiah: 'Rp5.000.000.000',
    catatanPengganti: 'Penjara pengganti progresif maks 410 hari (Lampiran III UU 1/2026)',
  },
  {
    kategori: 'VIII',
    maksimumRupiah: 50_000_000_000,
    labelRupiah: 'Rp50.000.000.000',
    catatanPengganti: 'Penjara pengganti dibatasi paling lama 2 tahun / 730 hari (Pasal 82 ayat 2 jo. Lampiran III UU 1/2026)',
  },
];

export type AncamanDasarTipe = 'penjara-tertentu' | 'seumur-hidup' | 'pidana-mati';

export type FaktorModifikasi =
  | 'normal'
  | 'percobaan' // Pasal 17: maks dikurangi 1/3 (atau 15 tahun jika mati/seumur hidup)
  | 'pembantuan' // Pasal 21: maks dikurangi 1/3 (atau 15 tahun jika mati/seumur hidup)
  | 'pengulangan' // Pasal 23: ditambah paling banyak 1/3
  | 'perbarengan'; // Pasal 127: perbuatan berbarengan, terberat + 1/3

export interface SanctionInput {
  ancamanDasarTipe: AncamanDasarTipe;
  penjaraMaksTahun: number;
  penjaraMinTahun?: number;
  kategoriDenda: FineCategorySpec['kategori'];
  faktor: FaktorModifikasi;
  adalahKorporasi?: boolean;
}

export interface SanctionCalculationResult {
  maksimalPenjaraBulan: number | null; // null berarti seumur hidup atau pidana mati tetap
  maksimalPenjaraLabel: string;
  minimalPenjaraBulan: number;
  maksimalDendaRupiah: number;
  maksimalDendaLabel: string;
  dasarHukum: string[];
  layakPidanaPengawasan: boolean;
  maksimalPengawasanBulan: number | null;
  layakKerjaSosialPotensial: boolean;
  catatanAlternatif: string[];
}

export interface SubstituteImprisonmentResult {
  days: number;
  cappedAtTwoYears: boolean;
  breakdown: string[];
}

export function formatRupiah(amount: number): string {
  return 'Rp' + amount.toLocaleString('id-ID');
}

export function formatDurationFromMonths(totalMonths: number): string {
  const rounded = Math.max(0, Math.round(totalMonths));
  const years = Math.floor(rounded / 12);
  const months = rounded % 12;
  if (years > 0 && months > 0) return `${years} tahun ${months} bulan`;
  if (years > 0) return `${years} tahun`;
  return `${months} bulan`;
}

/**
 * Menghitung pidana penjara pengganti denda secara progresif
 * berdasarkan Pasal 82 ayat (2) jo. Lampiran III UU No. 1 Tahun 2026:
 * - Di bawah / s.d. Kategori I (<= Rp1.000.000): 1 Hari
 * - Kategori I s.d. III (> Rp1.000.000 - Rp50.000.000): Rp1.000.000 / Hari (maks 50 hari)
 * - Di atas Kategori III s.d. V (> Rp50.000.000 - Rp500.000.000): Rp5.000.000 / Hari (+90 hari = 140 hari)
 * - Di atas Kategori V s.d. VI (> Rp500.000.000 - Rp2.000.000.000): Rp10.000.000 / Hari (+150 hari = 290 hari)
 * - Di atas Kategori VI (> Rp2.000.000.000): Rp25.000.000 / Hari
 * Batas maksimum mutlak: 2 tahun = 730 Hari.
 */
export function calculateSubstituteImprisonmentDays(fineRupiah: number): SubstituteImprisonmentResult {
  if (!Number.isFinite(fineRupiah) || fineRupiah <= 0) {
    return { days: 0, cappedAtTwoYears: false, breakdown: ['Tidak ada denda yang harus dikonversi.'] };
  }

  if (fineRupiah <= 1_000_000) {
    return {
      days: 1,
      cappedAtTwoYears: false,
      breakdown: [`Denda ${formatRupiah(fineRupiah)} (<= Kategori I Rp1.000.000): minimum 1 hari (Pasal 82 ayat 2 jo. Lampiran III UU 1/2026).`],
    };
  }

  let totalDays = 0;
  const breakdown: string[] = [];

  // Lapisan 1: Rp0 s.d. Rp50.000.000 (Kat. I - III) -> Rp1.000.000 / hari (maks 50 hari)
  const tier1Amount = Math.min(fineRupiah, 50_000_000);
  const tier1Days = Math.floor(tier1Amount / 1_000_000);
  totalDays += tier1Days;
  breakdown.push(
    `Lapisan Kat. I–III (${formatRupiah(tier1Amount)} ÷ Rp1.000.000/hari): ${tier1Days} hari`
  );

  // Lapisan 2: > Rp50.000.000 s.d. Rp500.000.000 (Kat. III - V) -> Rp5.000.000 / hari
  if (fineRupiah > 50_000_000) {
    const tier2Amount = Math.min(fineRupiah, 500_000_000) - 50_000_000;
    const tier2Days = Math.floor(tier2Amount / 5_000_000);
    if (tier2Days > 0) {
      totalDays += tier2Days;
      breakdown.push(
        `Lapisan Kat. III–V (${formatRupiah(tier2Amount)} ÷ Rp5.000.000/hari): ${tier2Days} hari`
      );
    }
  }

  // Lapisan 3: > Rp500.000.000 s.d. Rp2.000.000.000 (Kat. V - VI) -> Rp10.000.000 / hari
  if (fineRupiah > 500_000_000) {
    const tier3Amount = Math.min(fineRupiah, 2_000_000_000) - 500_000_000;
    const tier3Days = Math.floor(tier3Amount / 10_000_000);
    if (tier3Days > 0) {
      totalDays += tier3Days;
      breakdown.push(
        `Lapisan Kat. V–VI (${formatRupiah(tier3Amount)} ÷ Rp10.000.000/hari): ${tier3Days} hari`
      );
    }
  }

  // Lapisan 4: > Rp2.000.000.000 (di atas Kat. VI) -> Rp25.000.000 / hari
  if (fineRupiah > 2_000_000_000) {
    const tier4Amount = fineRupiah - 2_000_000_000;
    const tier4Days = Math.floor(tier4Amount / 25_000_000);
    if (tier4Days > 0) {
      totalDays += tier4Days;
      breakdown.push(
        `Lapisan > Kat. VI (${formatRupiah(tier4Amount)} ÷ Rp25.000.000/hari): ${tier4Days} hari`
      );
    }
  }

  const normalizedDays = Math.max(1, totalDays);
  const capped = normalizedDays > 730;
  const finalDays = Math.min(730, normalizedDays);

  if (capped) {
    breakdown.push(
      `Pembatasan Pasal 82 ayat (2) UU 1/2026: total ${normalizedDays} hari dibatasi paling lama 2 tahun (730 hari).`
    );
  }

  return {
    days: finalDays,
    cappedAtTwoYears: capped,
    breakdown,
  };
}

export function calculateSanction(input: SanctionInput): SanctionCalculationResult {
  const fineSpec = FINE_CATEGORIES.find((f) => f.kategori === input.kategoriDenda) ?? FINE_CATEGORIES[0];
  let maksDenda = fineSpec.maksimumRupiah;
  const dasarHukum: string[] = ['Pasal 79 UU No. 1 Tahun 2023 (Kategori Pidana Denda)'];
  const catatanAlternatif: string[] = [];

  if (input.adalahKorporasi) {
    if (maksDenda < 200_000_000) {
      maksDenda = 200_000_000;
    }
    dasarHukum.push('Pasal 121 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (Denda Korporasi minimal Kategori IV)');
    if (input.kategoriDenda === 'VIII') {
      catatanAlternatif.push(
        'Pasal 121 ayat (3) UU 1/2026: Jika Kategori VIII belum memadai, hakim dapat menjatuhkan denda hingga 10% keuntungan tahunan Korporasi tahun sebelumnya.'
      );
    }
  }

  let maksBulan: number | null = null;
  let maksLabel = '';
  const minBulan = Math.max(0, Math.round((input.penjaraMinTahun ?? 0) * 12));

  if (input.ancamanDasarTipe === 'pidana-mati' || input.ancamanDasarTipe === 'seumur-hidup') {
    if (input.faktor === 'percobaan' || input.faktor === 'pembantuan') {
      maksBulan = 15 * 12;
      maksLabel = '15 tahun (konversi ancaman mati/seumur hidup)';
      dasarHukum.push(
        input.faktor === 'percobaan'
          ? 'Pasal 17 ayat (3) UU No. 1 Tahun 2023 (Percobaan delik ancaman mati/seumur hidup maks 15 tahun)'
          : 'Pasal 21 ayat (3) UU No. 1 Tahun 2023 (Pembantuan delik ancaman mati/seumur hidup maks 15 tahun)'
      );
    } else {
      maksBulan = null;
      maksLabel =
        input.ancamanDasarTipe === 'pidana-mati'
          ? 'Pidana Mati (dengan masa percobaan 10 tahun sesuai Pasal 100 jo. UU 1/2026)'
          : 'Pidana Penjara Seumur Hidup (komutasi 20 thn setelah 10 thn sesuai Pasal 69 jo. UU 1/2026)';
      if (input.ancamanDasarTipe === 'pidana-mati') {
        dasarHukum.push(
          'Pasal 100 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (Pidana mati bersyarat masa percobaan 10 tahun sejak inkrah)'
        );
      }
    }
  } else {
    const baseMonths = Math.max(1, Math.round(input.penjaraMaksTahun * 12));
    if (input.faktor === 'percobaan') {
      maksBulan = Math.floor((baseMonths * 2) / 3);
      dasarHukum.push('Pasal 17 ayat (2) UU No. 1 Tahun 2023 (Percobaan: maks 2/3 ancaman pokok)');
    } else if (input.faktor === 'pembantuan') {
      maksBulan = Math.floor((baseMonths * 2) / 3);
      dasarHukum.push('Pasal 21 ayat (2) UU No. 1 Tahun 2023 (Pembantuan: maks 2/3 ancaman pokok)');
    } else if (input.faktor === 'pengulangan') {
      maksBulan = Math.min(240, Math.round(baseMonths + baseMonths / 3));
      dasarHukum.push('Pasal 23 & Pasal 69 UU No. 1 Tahun 2023 (Pemberatan pengulangan maks +1/3, batas umum maks 20 tahun)');
    } else if (input.faktor === 'perbarengan') {
      maksBulan = Math.min(240, Math.round(baseMonths + baseMonths / 3));
      dasarHukum.push('Pasal 127 UU No. 1 Tahun 2023 (Concursus realis: ancaman terberat ditambah 1/3)');
    } else {
      maksBulan = baseMonths;
    }
    maksLabel = formatDurationFromMonths(maksBulan);
  }

  // Evaluasi kelayakan pidana pengawasan (Pasal 75 <= 5 tahun & Pasal 76 UU 1/2026 masa pengawasan maks 3 tahun untuk first offender)
  const layakPengawasan = maksBulan !== null && maksBulan <= 60 && !input.adalahKorporasi;
  const maksimalPengawasanBulan = layakPengawasan && maksBulan !== null ? Math.min(maksBulan, 36) : null;
  if (layakPengawasan && maksimalPengawasanBulan !== null) {
    dasarHukum.push(
      'Pasal 75 & Pasal 76 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (Pidana Pengawasan maks 3 tahun bagi pelaku pertama kali)'
    );
    catatanAlternatif.push(
      `Memenuhi ambang Pasal 75 (ancaman <= 5 tahun); sesuai Pasal 76 jo. UU 1/2026, masa pidana pengawasan paling lama ${formatDurationFromMonths(maksimalPengawasanBulan)} (maks 3 tahun) khusus pelaku pertama kali.`
    );
  }

  // Evaluasi potensi pidana kerja sosial (Pasal 85: ancaman < 5 tahun = < 60 bulan dan hakim menjatuhkan <= 6 bulan)
  const layakKerjaSosial = maksBulan !== null && maksBulan < 60 && !input.adalahKorporasi;
  if (layakKerjaSosial) {
    dasarHukum.push('Pasal 85 UU No. 1 Tahun 2023 (Berpotensi Pidana Kerja Sosial jika vonis <= 6 bulan)');
    catatanAlternatif.push(
      'Memenuhi ambang ancaman < 5 tahun untuk Pidana Kerja Sosial apabila hakim berencana memutus <= 6 bulan penjara.'
    );
  }

  if (fineSpec.kategori === 'I' || fineSpec.kategori === 'II') {
    catatanAlternatif.push(
      'Denda Kategori I/II yang tidak dibayar dapat dikonversi ke kerja sosial, pengawasan, atau penjara pengganti progresif (Pasal 81–82 jo. Lampiran III UU 1/2026).'
    );
  } else {
    catatanAlternatif.push(
      'Denda di atas Kategori II wajib didahului penyitaan/lelang harta; jika tidak cukup, berlaku penjara pengganti progresif maks 2 tahun / 730 hari (Pasal 81–82 jo. Lampiran III UU 1/2026).'
    );
  }

  return {
    maksimalPenjaraBulan: maksBulan,
    maksimalPenjaraLabel: maksLabel,
    minimalPenjaraBulan: minBulan,
    maksimalDendaRupiah: maksDenda,
    maksimalDendaLabel: formatRupiah(maksDenda),
    dasarHukum,
    layakPidanaPengawasan: layakPengawasan,
    maksimalPengawasanBulan,
    layakKerjaSosialPotensial: layakKerjaSosial,
    catatanAlternatif,
  };
}
