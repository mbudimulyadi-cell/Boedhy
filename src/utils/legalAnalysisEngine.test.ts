import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runBedahPasalLocal,
  runKomparatorLocal,
  runSimulatorKasusLocal,
  runSocraticTurnLocal,
} from './legalAnalysisEngine.ts';

test('runBedahPasalLocal handles keyword "Pembunuhan" with pengertian, multiple articles, and halPenting', () => {
  const res = runBedahPasalLocal('Pembunuhan');
  assert.equal(res.kind, 'bedah-kata-kunci');
  assert.equal(res.ditemukanDalamKorpus, true);
  assert.ok(res.pengertianYuridis.length > 40);
  assert.ok(res.daftarPasal.some((p) => p.pasalNomor === 'Pasal 458'));
  assert.ok(res.daftarPasal.some((p) => p.pasalNomor === 'Pasal 459'));
  assert.ok(res.daftarPasal.some((p) => p.pasalNomor === 'Pasal 460'));
  assert.ok(res.halPenting.some((h) => h.includes('UU No. 1 Tahun 2026')));
});

test('runBedahPasalLocal dissects Pasal 458 including UU 1/2026 Penjelasan ayat (1)', () => {
  const res = runBedahPasalLocal('Pasal 458');
  assert.equal(res.kind, 'bedah-pasal');
  assert.equal(res.ditemukanDalamKorpus, true);
  assert.ok(res.penjelasanOtentik.includes('UU No. 1 Tahun 2026'));
  assert.ok(res.unsur.length >= 4);
  assert.ok(res.logikaPohon.length >= 3);
});

test('runKomparatorLocal compares KUHP Baru and KUHP Lama using keyword only ("Pembunuhan" & "Berita Bohong")', () => {
  const murderComp = runKomparatorLocal('Pembunuhan');
  assert.equal(murderComp.kind, 'komparator');
  assert.equal(murderComp.ditemukanDalamKorpus, true);
  assert.ok(murderComp.pasalBaru.includes('Pasal 458'));
  assert.ok(murderComp.pasalLama.includes('338'));
  assert.ok(murderComp.tabelPerbandingan.length >= 4);

  const hoaxComp = runKomparatorLocal('Berita Bohong');
  assert.equal(hoaxComp.kind, 'komparator');
  assert.equal(hoaxComp.ditemukanDalamKorpus, true);
  assert.ok(hoaxComp.pasalBaru.includes('Pasal 263'));
  assert.ok(hoaxComp.pasalLama.includes('14 UU No. 1 Tahun 1946'));
});

test('runSimulatorKasusLocal evaluates curat+percobaan+penyertaan and noodweer chronologies accurately', () => {
  const curat = runSimulatorKasusLocal(
    'Pada pukul 02.00 WIB, A dan B mencongkel jendela rumah C yang sedang berlibur dan mengambil laptop serta perhiasan senilai Rp25 juta, lalu tertangkap satpam kompleks sebelum keluar pagar.'
  );
  assert.equal(curat.kind, 'simulator-kasus');
  assert.equal(curat.ditemukanDalamKorpus, true);
  assert.ok(curat.pasalTerkait.some((p) => p.includes('477')));
  assert.ok(curat.pasalTerkait.some((p) => p.includes('Pasal 17')));
  assert.ok(curat.pasalTerkait.some((p) => p.includes('Pasal 20')));

  const noodweer = runSimulatorKasusLocal(
    'D dihadang oleh E yang membawa pisau di gang sepi dan hendak menusuknya. Karena panik dan tidak ada jalan lari, D merebut besi di dekatnya lalu memukul tangan E hingga patah.'
  );
  assert.ok(noodweer.pasalTerkait.some((p) => p.includes('Pasal 34')));
  assert.ok(noodweer.alasanPenghapusPidana.includes('Pasal 34'));
});

test('runSocraticTurnLocal produces progressive grounded Socratic prompts without external failures', () => {
  const r1 = runSocraticTurnLocal([
    {
      role: 'user',
      content: 'Bagaimana hubungan antara Pasal 1 ayat (1) dan Pasal 2 UU 1/2023 serta Pasal 66 ayat (6) UU 1/2026?',
    },
  ]);
  assert.ok(r1.tanggapan.includes('Pasal 2'));
  assert.ok(r1.rujukanPasal.length >= 2);
  assert.ok(r1.pertanyaanPemantik.length > 20);
});
