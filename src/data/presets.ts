import type { AnalysisRecord, ModuleId } from '../types/kuhp.ts';

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  shortTitle: string;
  description: string;
  inputPlaceholder: string;
  submitLabel: string;
  quickExamples: { label: string; query: string }[];
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'bedah-pasal',
    label: 'Bedah Pasal',
    shortTitle: 'Pembedah Pasal & Kata Kunci (UU 1/2023 jo. UU 1/2026)',
    description:
      'Masukkan nomor pasal untuk membedah unsur objektif/subjektif dan logika pohon, atau masukkan kata kunci topik (mis. "Pembunuhan") untuk menelusuri seluruh pasal terkait, pengertian yuridis, dan ketentuan pentingnya.',
    inputPlaceholder:
      'Masukkan nomor pasal (mis. Pasal 458) atau kata kunci delik (mis. Pembunuhan, Pencurian, Berita Bohong)...',
    submitLabel: 'Bedah Pasal',
    quickExamples: [
      { label: 'Kata Kunci · Pembunuhan', query: 'Pembunuhan' },
      { label: 'Pasal 458 · Pembunuhan', query: 'Pasal 458' },
      { label: 'Pasal 476 · Pencurian', query: 'Pasal 476' },
      { label: 'Pasal 263 · Berita Bohong', query: 'Pasal 263' },
    ],
  },
  {
    id: 'komparator',
    label: 'Komparator KUHP',
    shortTitle: 'KUHP Baru (UU 1/2023 jo. UU 1/2026) vs KUHP Lama (WvS jo. UU 1/1946)',
    description:
      'Cukup tuliskan kata kunci (mis. "Pembunuhan", "Pencurian", "Berita Bohong") atau nomor pasal untuk mencari ketentuan di KUHP Baru dan KUHP Lama sekaligus membandingkan rumusan, sanksi, dan asas lex mitior (Pasal 3).',
    inputPlaceholder:
      'Masukkan kata kunci (mis. Pembunuhan, Pencurian, Berita Bohong) atau nomor pasal...',
    submitLabel: 'Bandingkan Norma',
    quickExamples: [
      { label: 'Kata Kunci · Pembunuhan', query: 'Pembunuhan' },
      { label: 'Kata Kunci · Pencurian', query: 'Pencurian' },
      { label: 'Kata Kunci · Berita Bohong', query: 'Berita Bohong' },
      { label: 'Pasal 411 vs 284 WvS (Perzinaan)', query: 'Pasal 411 UU 1/2023 vs Pasal 284 WvS' },
    ],
  },
  {
    id: 'simulator-kasus',
    label: 'Simulator Kasus',
    shortTitle: 'Case Solver & Analisis Unsur',
    description:
      'Uji kronologi peristiwa terhadap pemenuhan unsur tindak pidana, penyertaan, percobaan, serta alasan pembenar/pemaaf berdasarkan UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026.',
    inputPlaceholder:
      'Tuliskan kronologi kasus secara objektif (siapa, perbuatan, niat, waktu/tempat, akibat)...',
    submitLabel: 'Analisis Kasus',
    quickExamples: [
      {
        label: 'Kasus Pencurian Malam Hari dengan Pembongkaran',
        query:
          'Pada pukul 02.00 WIB, A dan B mencongkel jendela rumah C yang sedang berlibur dan mengambil laptop serta perhiasan senilai Rp25 juta, lalu tertangkap satpam kompleks sebelum keluar pagar.',
      },
      {
        label: 'Kasus Pembelaan Terpaksa (Noodweer)',
        query:
          'D dihadang oleh E yang membawa pisau di gang sepi dan hendak menusuknya. Karena panik dan tidak ada jalan lari, D merebut besi di dekatnya lalu memukul tangan E hingga patah.',
      },
      {
        label: 'Kasus Penggelapan Kendaraan Sewaan',
        query:
          'F menyewa mobil milik rental G selama 3 hari dengan perjanjian tertulis, namun pada hari ke-4 F menggadaikan mobil tersebut kepada pihak ketiga tanpa seizin pemiliknya.',
      },
    ],
  },
  {
    id: 'kalkulator-sanksi',
    label: 'Kalkulator Sanksi',
    shortTitle: 'Simulasi Pemidanaan, Denda & Lampiran III UU 1/2026',
    description:
      'Hitung ancaman pidana maksimum, Kategori Denda I–VIII (Pasal 79), batas pidana pengawasan (Pasal 76 jo. UU 1/2026), serta konversi progresif penjara pengganti denda (Pasal 82 jo. Lampiran III UU 1/2026).',
    inputPlaceholder: 'Cari pasal untuk mengisi parameter otomatis (contoh: Pasal 476)...',
    submitLabel: 'Hitung Sanksi',
    quickExamples: [
      { label: 'Pasal 476 · Pencurian (5 thn / Kat. V)', query: 'Pasal 476' },
      { label: 'Pasal 486 · Penggelapan (4 thn / Kat. IV)', query: 'Pasal 486' },
      { label: 'Pasal 459 · Pembunuhan Berencana', query: 'Pasal 459' },
    ],
  },
  {
    id: 'diskusi-socratic',
    label: 'Diskusi Socratic',
    shortTitle: 'Bimbingan Penalaran Hukum Kritis',
    description:
      'Latih ketajaman legal reasoning Anda bersama pembimbing Socratic yang menantang argumentasi Anda berdasarkan teks otentik UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026.',
    inputPlaceholder:
      'Ajukan tesis, argumen hukum, atau topik diskusi (contoh: Apa dampak perubahan Pasal 76 dan 82 dalam UU 1/2026?)...',
    submitLabel: 'Kirim Argumen',
    quickExamples: [
      {
        label: 'Mengapa Pasal 2 mengakui Living Law?',
        query: 'Bagaimana hubungan antara Pasal 1 ayat (1) dan Pasal 2 UU 1/2023 serta Pasal 66 ayat (6) UU 1/2026?',
      },
      {
        label: 'Penyesuaian Pidana Penjara Pengganti (UU 1/2026)',
        query: 'Bagaimana mekanisme progresif penjara pengganti denda pada Pasal 82 jo. Lampiran III UU 1/2026?',
      },
      {
        label: 'Kesengajaan pada Pasal 458 (Penjelasan UU 1/2026)',
        query: 'Mengapa Penjelasan Pasal 458 ayat (1) dalam UU 1/2026 menegaskan unsur kesengajaan mematikan?',
      },
    ],
  },
];

export const SEED_HISTORY_RECORDS: AnalysisRecord[] = [
  {
    id: 'seed-pasal-476',
    module: 'bedah-pasal',
    query: 'Pasal 476',
    title: 'Bedah Pasal 476 — Tindak Pidana Pencurian',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    result: {
      kind: 'bedah-pasal',
      pasalNomor: 'Pasal 476 UU No. 1 Tahun 2023',
      bukuBab: 'Buku Kedua · Bab XXIV (Tindak Pidana Terhadap Harta Benda)',
      judulDelik: 'Pencurian Biasa',
      bunyiPasal:
        'Setiap Orang yang mengambil suatu Barang yang sebagian atau seluruhnya milik orang lain, dengan maksud untuk memiliki secara melawan hukum, dipidana karena pencurian, dengan pidana penjara paling lama 5 (lima) tahun atau pidana denda paling banyak kategori V.',
      jenisDelik: 'Delik Biasa (Bukan Aduan) · Delik Materiil/Formil (Mengambil) · Kesengajaan (Dolus)',
      ancamanPidana: 'Pidana penjara paling lama 5 tahun ATAU pidana denda paling banyak Kategori V (Rp500.000.000)',
      unsur: [
        {
          kategori: 'Objektif (Actus Reus)',
          elemen: 'Setiap Orang',
          uraian: 'Subjek hukum pelaku tindak pidana (natuurlijke persoon atau korporasi sesuai konteks).',
          pembuktian: 'Identitas pelaku dan kecakapan pertanggungjawaban pidana (Pasal 36–44).',
        },
        {
          kategori: 'Objektif (Actus Reus)',
          elemen: 'Mengambil',
          uraian: 'Memindahkan suatu barang dari tempat asalnya ke dalam penguasaan nyata pelaku sehingga pemilik kehilangan kendali.',
          pembuktian: 'Keterangan saksi, rekaman pengawas, dan penguasaan fisik barang.',
        },
        {
          kategori: 'Objektif (Actus Reus)',
          elemen: 'Suatu Barang yang Sebagian atau Seluruhnya Milik Orang Lain',
          uraian:
            'Objek berwujud maupun tidak berwujud bernilai ekonomis (termasuk daya listrik/data tertentu menurut Penjelasan) yang dimiliki pihak lain.',
          pembuktian: 'Bukti kepemilikan korban dan fakta bukan barang tak bertuan (res nullius).',
        },
        {
          kategori: 'Subjektif (Mens Rea)',
          elemen: 'Dengan Maksud untuk Memiliki',
          uraian: 'Kesengajaan sebagai maksud (opzet als oogmerk) untuk menguasai barang seolah-olah pemilik sah.',
          pembuktian: 'Tindakan memindahtangankan, menjual, atau menyembunyikan barang.',
        },
        {
          kategori: 'Sifat Melawan Hukum',
          elemen: 'Secara Melawan Hukum',
          uraian: 'Pengambilan dan penguasaan dilakukan tanpa hak, tanpa persetujuan pemilik, dan bertentangan dengan hukum.',
          pembuktian: 'Tidak adanya alas hak maupun alasan pembenar (Pasal 12 & Pasal 31–35).',
        },
      ],
      logikaPohon: [
        {
          id: 'root-476',
          label: '1. Pengujian Unsur Subjek & Perbuatan (Actus Reus)',
          kriteria: 'Apakah "Setiap Orang" nyata-nyata melakukan perbuatan "mengambil" barang?',
          statusSyarat: 'Wajib Terpenuhi',
          children: [
            {
              id: 'obj-1',
              label: '1a. Objek Barang Milik Orang Lain',
              kriteria: 'Barang sebagian atau seluruhnya milik orang lain (bukan res nullius).',
              statusSyarat: 'Wajib Terpenuhi',
            },
            {
              id: 'obj-2',
              label: '1b. Perpindahan Penguasaan Nyata',
              kriteria: 'Barang telah berpindah keluar dari kekuasaan pemilik awal.',
              statusSyarat: 'Wajib Terpenuhi',
            },
          ],
        },
        {
          id: 'mens-476',
          label: '2. Pengujian Kesalahan & Sifat Melawan Hukum (Mens Rea)',
          kriteria: 'Apakah terdapat maksud memiliki secara melawan hukum (tanpa hak)?',
          statusSyarat: 'Wajib Terpenuhi',
          children: [
            {
              id: 'exc-476',
              label: '2a. Pengecekan Alasan Penghapus Pidana',
              kriteria: 'Apakah ada alasan pembenar/pemaaf (Pasal 31–44) atau pencurian ringan (Pasal 478)?',
              statusSyarat: 'Pengecualian / Alasan Penghapus',
            },
          ],
        },
        {
          id: 'sanksi-476',
          label: '3. Konklusi Pemidanaan & Alternatif',
          kriteria:
            'Ancaman maks 5 tahun atau denda Kat. V; memenuhi ambang Pasal 75 dengan batas pengawasan maks 3 tahun bagi pelaku pertama kali (Pasal 76 jo. UU 1/2026).',
          statusSyarat: 'Alternatif',
        },
      ],
      penjelasanOtentik:
        'Pasal 476 merupakan pengganti Pasal 362 WvS. Dalam UU 1/2023 jo. UU 1/2026, ancaman denda dirumuskan menggunakan sistem kategori (Kategori V = maksimal Rp500.000.000 sesuai Pasal 79; apabila tidak dibayar dan penyitaan tidak cukup, berlaku penjara pengganti progresif maks 140 hari sesuai Pasal 82 jo. Lampiran III UU 1/2026).',
      catatanPenerapan: [
        'Apabila nilai barang tidak lebih dari Rp500.000 dan tidak dilakukan dengan pemberatan, periksa ketentuan Pencurian Ringan pada Pasal 478.',
        'Karena ancaman pidana penjara paling lama 5 tahun, terdakwa memenuhi ambang Pasal 75 dengan masa pengawasan paling lama 3 tahun bagi pelaku pertama kali (Pasal 76 jo. UU 1/2026).',
      ],
      ditemukanDalamKorpus: true,
    },
  },
];
