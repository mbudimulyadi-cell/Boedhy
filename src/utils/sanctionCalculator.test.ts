import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSanction,
  calculateSubstituteImprisonmentDays,
  formatDurationFromMonths,
} from './sanctionCalculator.ts';

test('formatDurationFromMonths formats years and months cleanly', () => {
  assert.equal(formatDurationFromMonths(18), '1 tahun 6 bulan');
  assert.equal(formatDurationFromMonths(60), '5 tahun');
  assert.equal(formatDurationFromMonths(6), '6 bulan');
});

test('percobaan reduces maximum imprisonment to 2/3 per Pasal 17 ayat (2)', () => {
  const res = calculateSanction({
    ancamanDasarTipe: 'penjara-tertentu',
    penjaraMaksTahun: 15,
    kategoriDenda: 'V',
    faktor: 'percobaan',
  });
  assert.equal(res.maksimalPenjaraBulan, 120); // 10 tahun
  assert.equal(res.maksimalPenjaraLabel, '10 tahun');
  assert.equal(res.layakPidanaPengawasan, false);
});

test('percobaan of death penalty converts to max 15 years per Pasal 17 ayat (3)', () => {
  const res = calculateSanction({
    ancamanDasarTipe: 'pidana-mati',
    penjaraMaksTahun: 20,
    kategoriDenda: 'VI',
    faktor: 'percobaan',
  });
  assert.equal(res.maksimalPenjaraBulan, 180);
  assert.ok(res.dasarHukum.some((d) => d.includes('Pasal 17 ayat (3)')));
});

test('pengulangan increases max penalty by 1/3 capped at 20 years', () => {
  const res = calculateSanction({
    ancamanDasarTipe: 'penjara-tertentu',
    penjaraMaksTahun: 18,
    kategoriDenda: 'IV',
    faktor: 'pengulangan',
  });
  assert.equal(res.maksimalPenjaraBulan, 240); // capped at 20 tahun
});

test('delik <= 5 years qualifies for Pidana Pengawasan capped at 3 years per Pasal 76 UU 1/2026', () => {
  const res5 = calculateSanction({
    ancamanDasarTipe: 'penjara-tertentu',
    penjaraMaksTahun: 5,
    kategoriDenda: 'V',
    faktor: 'normal',
  });
  assert.equal(res5.layakPidanaPengawasan, true);
  assert.equal(res5.maksimalPengawasanBulan, 36); // Pasal 76 UU 1/2026 cap: 3 tahun
  assert.equal(res5.layakKerjaSosialPotensial, false); // Pasal 85 requires "kurang dari 5 tahun"

  const res2 = calculateSanction({
    ancamanDasarTipe: 'penjara-tertentu',
    penjaraMaksTahun: 2,
    kategoriDenda: 'III',
    faktor: 'normal',
  });
  assert.equal(res2.layakPidanaPengawasan, true);
  assert.equal(res2.maksimalPengawasanBulan, 24);
  assert.equal(res2.layakKerjaSosialPotensial, true);
});

test('korporasi enforces minimum Kategori IV denda per Pasal 121 and notes 10% profit on Kategori VIII', () => {
  const res = calculateSanction({
    ancamanDasarTipe: 'penjara-tertentu',
    penjaraMaksTahun: 3,
    kategoriDenda: 'II',
    faktor: 'normal',
    adalahKorporasi: true,
  });
  assert.equal(res.maksimalDendaRupiah, 200_000_000);

  const resVIII = calculateSanction({
    ancamanDasarTipe: 'penjara-tertentu',
    penjaraMaksTahun: 20,
    kategoriDenda: 'VIII',
    faktor: 'normal',
    adalahKorporasi: true,
  });
  assert.ok(resVIII.catatanAlternatif.some((c) => c.includes('10%')));
});

test('Lampiran III UU 1/2026 calculates progressive substitute imprisonment accurately', () => {
  assert.equal(calculateSubstituteImprisonmentDays(500_000).days, 1);
  assert.equal(calculateSubstituteImprisonmentDays(50_000_000).days, 50);
  assert.equal(calculateSubstituteImprisonmentDays(500_000_000).days, 140);
  assert.equal(calculateSubstituteImprisonmentDays(2_000_000_000).days, 290);
  // Verifikasi contoh resmi Lampiran III UU No. 1 Tahun 2026: Rp6.000.000.000 = 50 + 90 + 150 + 160 = 450 Hari
  const sixBillion = calculateSubstituteImprisonmentDays(6_000_000_000);
  assert.equal(sixBillion.days, 450);
  assert.equal(sixBillion.cappedAtTwoYears, false);
  // Batas maksimal 2 tahun (730 Hari) per Pasal 82 ayat (2)
  const fiftyBillion = calculateSubstituteImprisonmentDays(50_000_000_000);
  assert.equal(fiftyBillion.days, 730);
  assert.equal(fiftyBillion.cappedAtTwoYears, true);
});
