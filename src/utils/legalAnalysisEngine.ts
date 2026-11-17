import {
  KUHP_CORPUS,
  TOTAL_PASAL_UU_1_2023,
  extractPasalNumber,
  findRelevantCorpusArticles,
  isPasalSpecificQuery,
} from '../data/kuhpCorpus.ts';
import type {
  BedahKataKunciResult,
  BedahPasalResult,
  CaseElementEvaluation,
  CorpusArticle,
  KomparatorResult,
  KomparatorRow,
  LogicNode,
  SimulatorKasusResult,
  UnsurItem,
} from '../types/kuhp.ts';

function formatAncamanPidana(art: CorpusArticle): string {
  const parts: string[] = [];
  if (art.penjaraMaksBulan && art.penjaraMaksBulan > 0) {
    if (art.penjaraMaksBulan >= 240 && /seumur hidup|mati/i.test(art.bunyi)) {
      if (/pidana mati/i.test(art.bunyi)) {
        parts.push('Pidana mati (dengan masa percobaan 10 tahun Ps. 100 jo. UU 1/2026), penjara seumur hidup, atau penjara paling lama 20 tahun');
      } else {
        parts.push('Pidana penjara seumur hidup atau paling lama 20 tahun');
      }
    } else {
      const thn = Math.floor(art.penjaraMaksBulan / 12);
      const bln = art.penjaraMaksBulan % 12;
      const durasi =
        thn > 0 && bln > 0
          ? `${thn} tahun ${bln} bulan`
          : thn > 0
          ? `${thn} tahun`
          : `${bln} bulan`;
      parts.push(`Pidana penjara paling lama ${durasi}`);
    }
  }
  if (art.kategoriDenda) {
    parts.push(`Pidana denda ${art.kategoriDenda}`);
  }
  if (parts.length > 0) {
    return parts.join(' dan/atau ');
  }
  if (art.nomorAngka < 188) {
    return 'Ketentuan Aturan Umum Buku Kesatu (tidak memuat sanksi delik mandiri)';
  }
  return 'Sebagaimana dirumuskan secara eksplisit pada ayat pasal bersangkutan dalam UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026';
}

function detectJenisDelik(art: CorpusArticle): string {
  const text = `${art.bunyi} ${art.penjelasan} ${art.judul}`.toLowerCase();
  if (art.nomorAngka <= 187) {
    return 'Norma Aturan Umum (Buku Kesatu · Mengikat Pembuktian & Pemidanaan)';
  }
  const aduan =
    text.includes('delik aduan') ||
    text.includes('hanya dapat dituntut berdasarkan aduan') ||
    text.includes('kecuali atas pengaduan') ||
    text.includes('aduan korban');
  const kealpaan = text.includes('kealpaan') || text.includes('culpa');
  const materiil =
    text.includes('mengakibatkan') ||
    text.includes('berakibat') ||
    text.includes('merampas nyawa');

  const jenis = aduan ? 'Delik Aduan (Klachtdelict)' : 'Delik Biasa (Penuntutan Umum)';
  const bentuk = materiil ? 'Delik Materiil (Mensyaratkan Akibat)' : 'Delik Formil (Perbuatan Dilarang)';
  const sikapBatin = kealpaan ? 'Kealpaan (Culpa)' : 'Kesengajaan (Dolus)';
  return `${jenis} · ${bentuk} · ${sikapBatin}`;
}

function buildUnsurForArticle(art: CorpusArticle): UnsurItem[] {
  if (art.nomorAngka <= 187) {
    return [
      {
        kategori: 'Objektif (Actus Reus)',
        elemen: 'Ruang Lingkup Pemberlakuan Asas/Aturan Umum',
        uraian: `${art.judul} dalam ${art.bab}. Mengatur syarat, batas, atau pedoman penerapan hukum pidana materiil bagi seluruh Buku Kedua dan UU khusus (Pasal 613 jo. UU 1/2026).`,
        pembuktian: 'Kesesuaian fakta hukum perkara dengan syarat normatif dalam ayat-ayat pasal.',
      },
      {
        kategori: 'Subjektif (Mens Rea)',
        elemen: 'Pertanggungjawaban & Kesalahan (Asas Culpabilitas)',
        uraian:
          'Berhubungan erat dengan Pasal 36 UU 1/2023: tidak ada pidana tanpa kesalahan, kecuali ditentukan tegas dalam Undang-Undang (Pasal 37 jo. UU 1/2026).',
        pembuktian: 'Penilaian sikap batin pelaku, niat, atau kealpaan yang dapat dipertanggungjawabkan.',
      },
      {
        kategori: 'Sifat Melawan Hukum',
        elemen: 'Konsistensi dengan Asas Legalitas & Tujuan Pemidanaan',
        uraian: art.penjelasan,
        pembuktian: 'Penerapan langsung oleh penyidik, penuntut umum, dan hakim dalam pertimbangan putusan.',
      },
    ];
  }

  const lower = `${art.bunyi} ${art.judul}`.toLowerCase();
  const isIbu = lower.includes('seorang ibu');
  const isKealpaan = lower.includes('kealpaan');
  const isPemberatan =
    lower.includes('ayat (2)') ||
    lower.includes('ayat (3)') ||
    lower.includes('ditambah 1/3') ||
    lower.includes('rencana terlebih dahulu') ||
    lower.includes('luka berat') ||
    lower.includes('mengakibatkan matinya');

  const items: UnsurItem[] = [
    {
      kategori: 'Objektif (Actus Reus)',
      elemen: isIbu ? 'Seorang Ibu (Subjek Khusus)' : 'Setiap Orang',
      uraian: isIbu
        ? 'Subjek hukum khusus yaitu ibu kandung yang melahirkan anak.'
        : 'Subjek hukum pelaku tindak pidana (natuurlijke persoon maupun korporasi dalam ruang lingkup Pasal 48–49 jo. UU 1/2026).',
      pembuktian: 'Identitas hukum terdakwa dan kemampuan bertanggung jawab (tidak terganggu jiwanya menurut Pasal 38–39).',
    },
    {
      kategori: 'Objektif (Actus Reus)',
      elemen: `Perbuatan Inti (${art.judul})`,
      uraian: `Memenuhi rumusan perbuatan objektif sebagaimana dinyatakan dalam ${art.pasal}: ${art.bunyi.split('\n')[0]}`,
      pembuktian: 'Alat bukti yang sah menurut KUHAP (keterangan saksi, ahli, surat, petunjuk/elektronik, dan keterangan terdakwa) serta hubungan kausalitas.',
    },
    {
      kategori: 'Subjektif (Mens Rea)',
      elemen: isKealpaan ? 'Karena Kealpaan (Culpa)' : 'Kesengajaan / Sikap Batin (Dolus)',
      uraian: isKealpaan
        ? 'Pelaku kurang berhati-hati, lalai, atau tidak menduga akibat yang seharusnya dapat diduga menurut standar kehati-hatian umum (Pasal 36 ayat 2).'
        : 'Pelaku mengetahui dan menghendaki (willens en wetens) perbuatan beserta akibatnya. Sesuai Penjelasan UU 1/2026 pada delik nyawa, unsur kesengajaan wajib dibuktikan secara tegas.',
      pembuktian: 'Fakta persiapan, cara bertindak, alat yang digunakan, serta sikap batin sebelum dan sesudah perbuatan.',
    },
    {
      kategori: 'Sifat Melawan Hukum',
      elemen: 'Secara Melawan Hukum & Ketiadaan Alasan Pembenar',
      uraian:
        'Perbuatan bertentangan dengan hukum tertulis maupun norma hukum yang hidup (Pasal 12) serta tidak dilindungi oleh alasan pembenar (Pasal 31–35) seperti pembelaan terpaksa.',
      pembuktian: 'Terbukti tidak adanya izin sah, alas hak, atau keadaan pembenar menurut undang-undang.',
    },
  ];

  if (isPemberatan) {
    items.push({
      kategori: 'Pemberat / Kualifikasi',
      elemen: 'Unsur Kualifikasi Pemberat / Akibat Lanjutan',
      uraian:
        'Keadaan pemberat khusus (seperti perencanaan terlebih dahulu, hubungan keluarga inti, pembongkaran malam hari, atau akibat luka berat/kematian/kerusuhan) memperberat ancaman pidana pokok.',
      pembuktian: 'Pembuktian kausalitas langsung atau fakta pemberat spesifik pada ayat lanjutan.',
    });
  }

  return items;
}

function buildLogicTreeForArticle(art: CorpusArticle): LogicNode[] {
  const hasPasal75Eligibility =
    typeof art.penjaraMaksBulan === 'number' && art.penjaraMaksBulan > 0 && art.penjaraMaksBulan <= 60;

  return [
    {
      id: `root-${art.nomorAngka}`,
      label: `1. Pengujian Unsur Objektif (Actus Reus) — ${art.pasal}`,
      kriteria: `Apakah subjek dan perbuatan nyata terdakwa mencocokkan rumusan ${art.judul}?`,
      statusSyarat: 'Wajib Terpenuhi',
      children: [
        {
          id: `obj-a-${art.nomorAngka}`,
          label: '1a. Subjek & Objek Hukum',
          kriteria: 'Identitas pelaku cakap hukum dan objek perbuatan sesuai kualifikasi ayat.',
          statusSyarat: 'Wajib Terpenuhi',
        },
        {
          id: `obj-b-${art.nomorAngka}`,
          label: '1b. Kausalitas & Syarat Aduan (bila ada)',
          kriteria: /aduan/i.test(art.penjelasan + art.bunyi)
            ? 'Delik aduan: pengaduan sah dari pihak berhak wajib ada sebagai syarat penuntutan.'
            : 'Hubungan sebab-akibat antara perbuatan dan akibat yang dilarang.',
          statusSyarat: 'Wajib Terpenuhi',
        },
      ],
    },
    {
      id: `mens-${art.nomorAngka}`,
      label: '2. Pengujian Kesalahan (Mens Rea) & Sifat Melawan Hukum',
      kriteria: 'Apakah terpenuhi kesengajaan/kealpaan (Pasal 36) serta ketiadaan alasan penghapus pidana?',
      statusSyarat: 'Wajib Terpenuhi',
      children: [
        {
          id: `exc-${art.nomorAngka}`,
          label: '2a. Filter Alasan Pembenar & Pemaaf (Pasal 31–44)',
          kriteria:
            'Periksa apakah ada pembelaan terpaksa (Ps. 34), noodweer exces (Ps. 43), daya paksa (Ps. 40), atau pelaksanaan undang-undang (Ps. 31).',
          statusSyarat: 'Pengecualian / Alasan Penghapus',
        },
      ],
    },
    {
      id: `sanksi-${art.nomorAngka}`,
      label: '3. Penentuan Pemidanaan & Alternatif Sanksi (UU 1/2023 jo. UU 1/2026)',
      kriteria: hasPasal75Eligibility
        ? `${formatAncamanPidana(art)}. Memenuhi ambang Pasal 75–76 jo. UU 1/2026 (pidana pengawasan maks 3 tahun untuk pelaku pertama kali) serta konversi progresif denda Pasal 82 jo. Lampiran III.`
        : `${formatAncamanPidana(art)}. Terikat pedoman pemidanaan Pasal 54 dan konversi denda progresif Pasal 82 jo. Lampiran III UU 1/2026 (maks 730 hari).`,
      statusSyarat: 'Alternatif',
    },
  ];
}

interface KeywordTopicGuide {
  matchTerms: string[];
  pengertian: string;
  klasifikasi: string;
  halPenting: string[];
}

const KEYWORD_TOPIC_GUIDES: KeywordTopicGuide[] = [
  {
    matchTerms: ['pembunuhan', 'membunuh', 'nyawa', 'bunuh'],
    pengertian:
      'Dalam sistem KUHP Nasional (UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026, Buku Kedua Bab XXI tentang Tindak Pidana Terhadap Nyawa dan Janin), pembunuhan adalah perbuatan dengan sengaja merampas nyawa orang lain. Sifat kesengajaan (dolus) untuk mematikan menjadi pembeda utama dari penganiayaan yang mengakibatkan mati (Pasal 466 ayat 3) maupun kealpaan yang mengakibatkan mati (Pasal 474 ayat 3).',
    klasifikasi: 'Buku Kedua Bab XXI · Tindak Pidana Terhadap Nyawa dan Janin (Pasal 458–463 & keterkaitan Ps. 466/474)',
    halPenting: [
      'Pembaruan UU No. 1 Tahun 2026 pada Penjelasan Pasal 458 ayat (1) menegaskan secara eksplisit bahwa pembunuhan wajib disertai kesengajaan/niat merampas nyawa.',
      'Jika terdapat jeda waktu berpikir tenang sebelum pelaksanaan, kualifikasi meningkat menjadi Pembunuhan Berencana (Pasal 459, padanan Pasal 340 WvS) dengan ancaman pidana mati (masa percobaan 10 tahun Ps. 100 jo. UU 1/2026), seumur hidup, atau maks 20 tahun.',
      'Pasal 458 ayat (2) memberi pemberatan 1/3 apabila korban merupakan ibu, ayah, istri, suami, atau anak pelaku; sedangkan Pasal 460–461 merupakan lex specialis bagi ibu yang takut ketahuan melahirkan.',
      'Pasal 462 (euthanasia aktif atas permintaan korban) menurunkan ancaman maksimum dari 12 tahun di WvS (Ps. 344) menjadi 9 tahun.',
    ],
  },
  {
    matchTerms: ['pencurian', 'mencuri', 'curi', 'curat', 'curas', 'maling', 'perampokan'],
    pengertian:
      'Pencurian dalam Bab XXIV KUHP Nasional (Pasal 476–480) adalah perbuatan mengambil suatu barang yang sebagian atau seluruhnya milik orang lain dengan maksud untuk memiliki secara melawan hukum. Penjelasan Pasal 476 menegaskan pengertian "Barang" mencakup benda berwujud maupun tidak berwujud termasuk daya listrik dan data elektronik tertentu.',
    klasifikasi: 'Buku Kedua Bab XXIV · Tindak Pidana Terhadap Harta Benda (Pasal 476–479)',
    halPenting: [
      'Pencurian biasa (Pasal 476, pengganti Ps. 362 WvS) diancam penjara maks 5 tahun atau denda Kategori V (Rp500 juta), sehingga memenuhi syarat pertimbangan pidana pengawasan (Pasal 75–76 jo. UU 1/2026, maks 3 tahun untuk pelaku pertama kali).',
      'Pencurian dengan pemberatan / curat (Pasal 477) berlaku jika dilakukan malam hari di rumah tertutup, bersekutu 2 orang atau lebih, atau dengan membongkar/kunci palsu (ancaman 7 tahun atau 9 tahun).',
      'Pencurian ringan (Pasal 478) menetapkan ambang nilai barang <= Rp500.000 di luar tempat tinggal dengan sanksi pidana denda Kategori II (tanpa penjara pokok).',
      'Pencurian dengan kekerasan / curas (Pasal 479) mengancam penjara hingga 9 tahun, dan meningkat menjadi 12–15 tahun/seumur hidup/20 tahun jika mengakibatkan luka berat atau kematian.',
    ],
  },
  {
    matchTerms: ['berita bohong', 'hoaks', 'bohong', 'keonaran', '1946'],
    pengertian:
      'Penyiaran berita bohong atau berita tidak pasti/berlebih-lebihan dalam KUHP Nasional diatur pada Pasal 263 dan Pasal 264 (Bab IV Ketertiban Umum), yang menggantikan Pasal 14 dan Pasal 15 UU No. 1 Tahun 1946 setelah dicabut oleh Pasal 622 jo. UU No. 1 Tahun 2026.',
    klasifikasi: 'Buku Kedua Bab IV · Tindak Pidana Terhadap Ketertiban Umum (Pasal 263–264)',
    halPenting: [
      'Pergeseran mendasar dari delik formil/karet ("menerbitkan keonaran" di UU 1/1946) menjadi delik materiil yang mensyaratkan akibat nyata terjadinya "kerusuhan" dalam masyarakat.',
      'Pasal 263 ayat (1) menuntut kesengajaan ("diketahuinya bohong") dengan ancaman penjara maks 6 tahun atau denda Kat. V; ayat (2) mencakup kealpaan ("patut diduga bohong") maks 4 tahun atau denda Kat. IV.',
      'Berdasarkan Pasal 622 UU 1/2023 jo. UU 1/2026, seluruh ketentuan pidana dalam UU No. 1 Tahun 1946 dicabut dan digantikan kodifikasi baru, sehingga memicu asas lex mitior (Pasal 3).',
    ],
  },
  {
    matchTerms: ['penggelapan', 'penipuan', 'pemerasan', 'penadahan', 'harta'],
    pengertian:
      'Delik terhadap harta benda non-pencurian meliputi Penggelapan (Pasal 486 — penguasaan awal barang diperoleh secara sah), Penipuan (Pasal 492 — menggerakkan penyerahan barang dengan nama/kedudukan palsu atau rangkaian kebohongan), Pemerasan (Pasal 482 — paksaan kekerasan/ancaman), serta Penadahan (Pasal 506).',
    klasifikasi: 'Buku Kedua Bab XXIV & XXVI · Tindak Pidana Terhadap Harta Benda dan Penadahan',
    halPenting: [
      'Pembeda kritis Pencurian (Pasal 476) vs Penggelapan (Pasal 486): pada penggelapan, barang sudah berada dalam penguasaan pelaku secara sah (mis. sewa/titip/pinjam), baru kemudian dimiliki melawan hukum.',
      'Pada Penipuan (Pasal 492, pengganti Ps. 378 WvS), penyerahan barang terjadi karena tipu muslihat sebelum penguasaan berpindah, dengan denda diperbarui menjadi Kategori V (Rp500 juta).',
    ],
  },
  {
    matchTerms: ['denda', 'pengganti', 'pengawasan', 'kerja sosial', 'pidana mati', 'korporasi', 'sanksi'],
    pengertian:
      'Sistem pemidanaan dalam UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 mereformasi jenis pidana pokok (penjara, tutupan, pengawasan, denda, kerja sosial) serta kewajiban adat setempat (Pasal 66 ayat 6) sebagai pidana pokok untuk delik living law.',
    klasifikasi: 'Buku Kesatu Bab III · Pemidanaan, Pidana, dan Tindakan (Pasal 51–121)',
    halPenting: [
      'Pasal 76 jo. UU 1/2026: Pidana pengawasan paling lama 3 tahun dan hanya dapat dijatuhkan kepada pelaku yang pertama kali melakukan tindak pidana.',
      'Pasal 82–83 jo. Lampiran III UU 1/2026: Bila denda tak terbayar dan penyitaan/lelang harta (Pasal 81) tidak mencukupi, konversi ke pidana penjara pengganti menggunakan tarif progresif (1 hari s.d. maks 730 hari / 2 tahun).',
      'Pasal 121 ayat (3) jo. UU 1/2026: Korporasi yang melakukan kejahatan berat dapat dikenai denda hingga 10% keuntungan tahunan tahun keuangan sebelumnya apabila Kategori VIII (Rp50 miliar) belum memadai.',
      'Pasal 100–101 jo. UU 1/2026: Pidana mati dijatuhkan dengan masa percobaan 10 tahun sejak putusan inkracht.',
    ],
  },
  {
    matchTerms: ['penghinaan', 'pencemaran', 'fitnah', 'martabat', 'presiden', 'pemerintah', 'sara', 'agama'],
    pengertian:
      'Delik kehormatan dan kebebasan berekspresi dalam KUHP Nasional direkonstruksi secara ketat sebagai delik aduan dengan klausul pengecualian kepentingan umum, pembelaan diri, dan kajian ilmiah objektif (Pasal 218, 240, 243, 300, 433).',
    klasifikasi: 'Buku Kedua Bab II, III, VII, & XVII · Kehormatan, Ketertiban Umum, dan Penghinaan',
    halPenting: [
      'Pasal 218 (martabat Presiden/Wapres) dan Pasal 240 (pemerintah/lembaga negara) kini merupakan delik aduan dan tidak berlaku terhadap kritik demi kepentingan umum.',
      'Pasal 243 jo. UU 1/2026 (ujaran permusuhan SARA) diubah menjadi delik materiil yang mensyaratkan timbulnya akibat nyata berupa Kekerasan terhadap orang atau Barang.',
      'Pasal 300 jo. UU 1/2026 melindungi secara tegas penelitian, pengkajian, atau pembelajaran yang objektif dan ilmiah.',
      'Pasal 433 jo. UU 1/2026 menyempurnakan Penjelasan ayat (3) mengenai pengecualian pencemaran untuk kepentingan umum atau terpaksa membela diri.',
    ],
  },
];

export function runBedahPasalLocal(query: string): BedahPasalResult | BedahKataKunciResult {
  const trimmed = query.trim();

  // 1. Jika input berupa kata kunci (bukan nomor pasal spesifik)
  if (!isPasalSpecificQuery(trimmed)) {
    const matches = findRelevantCorpusArticles(trimmed, 10);
    if (matches.length === 0) {
      return {
        kind: 'bedah-kata-kunci',
        kataKunci: trimmed,
        pengertianYuridis:
          'Data tidak ditemukan dalam korpus UU. Kata kunci yang Anda masukkan belum merujuk pada rumusan delik atau istilah hukum yang terdapat dalam korpus UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026.',
        dasarKlasifikasi: 'Korpus UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (Pasal 1–624)',
        daftarPasal: [],
        halPenting: [
          'Gunakan kata kunci tindak pidana atau doktrin hukum pidana seperti: "Pembunuhan", "Pencurian", "Penipuan", "Penggelapan", "Penganiayaan", "Berita Bohong", "Perzinaan", "Pencemaran Nama Baik", "Korupsi", "Pembelaan Terpaksa", atau "Denda".',
          'Atau masukkan nomor pasal secara langsung (contoh: "Pasal 458" atau "Pasal 476").',
        ],
        ditemukanDalamKorpus: false,
      };
    }

    const qLower = trimmed.toLowerCase();
    const guide = KEYWORD_TOPIC_GUIDES.find((g) => g.matchTerms.some((term) => qLower.includes(term)));

    const pengertianYuridis =
      guide?.pengertian ??
      `Berdasarkan penelusuran terstruktur dalam korpus UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026, kata kunci "${trimmed}" terkait langsung dengan ${matches.length} ketentuan utama dalam KUHP Nasional yang meliputi ${matches
        .slice(0, 3)
        .map((m) => `${m.pasal} (${m.judul})`)
        .join(', ')}.`;

    const dasarKlasifikasi =
      guide?.klasifikasi ??
      Array.from(new Set(matches.map((m) => `${m.buku} · ${m.bab}`)))
        .slice(0, 2)
        .join(' | ');

    const daftarPasal = matches.map((art) => ({
      pasalNomor: art.pasal,
      judul: art.judul,
      ringkasanIsi: `${art.bunyi.replace(/\n+/g, ' ')}`,
      ancamanPidana: formatAncamanPidana(art),
      catatanRelevansi: art.catatanUU2026
        ? `${art.penjelasan} [Pembaruan UU 1/2026: ${art.catatanUU2026}]`
        : art.wvsPadanan
        ? `${art.penjelasan} (Padanan KUHP Lama: ${art.wvsPadanan}).`
        : art.penjelasan,
    }));

    const halPenting = guide?.halPenting ?? [
      ...matches
        .filter((m) => m.diubahOlehUU2026 && m.catatanUU2026)
        .map((m) => `Pembaruan UU No. 1 Tahun 2026 pada ${m.pasal}: ${m.catatanUU2026}`),
      'Seluruh ketentuan Buku Kedua tunduk pada aturan umum Buku Kesatu termasuk asas kesalahan (Pasal 36), alasan pembenar/pemaaf (Pasal 31–44), dan pedoman pemidanaan (Pasal 54).',
      'Klik tombol "Bedah Pasal Ini" pada salah satu pasal di atas untuk melihat rincian unsur objektif/subjektif dan logika pohon pembuktiannya.',
    ];

    return {
      kind: 'bedah-kata-kunci',
      kataKunci: trimmed,
      pengertianYuridis,
      dasarKlasifikasi,
      daftarPasal,
      halPenting,
      ditemukanDalamKorpus: true,
    };
  }

  // 2. Mode Bedah Pasal Spesifik
  const num = extractPasalNumber(trimmed);
  if (num === null || num < 1 || num > TOTAL_PASAL_UU_1_2023) {
    return {
      kind: 'bedah-pasal',
      pasalNomor: `Pasal ${num ?? trimmed}`,
      bukuBab: 'Di Luar Rentang Pasal 1–624 UU No. 1 Tahun 2023',
      judulDelik: 'Data tidak ditemukan dalam korpus UU',
      bunyiPasal: 'Data tidak ditemukan dalam korpus UU',
      jenisDelik: 'Tidak Tersedia dalam Korpus',
      ancamanPidana: '-',
      unsur: [],
      logikaPohon: [],
      penjelasanOtentik: `Nomor pasal yang diminta berada di luar cakupan Pasal 1 sampai dengan Pasal ${TOTAL_PASAL_UU_1_2023} UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026.`,
      catatanPenerapan: [
        'Silakan pilih pasal yang sah antara Pasal 1 s.d. Pasal 624, misalnya Pasal 458 (Pembunuhan), Pasal 476 (Pencurian), Pasal 486 (Penggelapan), atau Pasal 492 (Penipuan).',
      ],
      ditemukanDalamKorpus: false,
    };
  }

  const exact = KUHP_CORPUS.find((a) => a.nomorAngka === num);
  const wvsMatch = !exact
    ? KUHP_CORPUS.find((a) => a.wvsPadanan && new RegExp(`\\b${num}\\b`).test(a.wvsPadanan))
    : undefined;

  const target = exact ?? wvsMatch;
  if (!target) {
    return {
      kind: 'bedah-pasal',
      pasalNomor: `Pasal ${num} UU No. 1 Tahun 2023`,
      bukuBab: `Rentang Sah UU No. 1 Tahun 2023 (Pasal 1–${TOTAL_PASAL_UU_1_2023})`,
      judulDelik: 'Teks Rinci Pasal Belum Terindeks Penuh',
      bunyiPasal: 'Data tidak ditemukan dalam korpus UU',
      jenisDelik: 'Memerlukan Rujukan Teks Otentik Lengkap',
      ancamanPidana: 'Merujuk pada naskah otentik UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026',
      unsur: [],
      logikaPohon: [],
      penjelasanOtentik: `Data tidak ditemukan dalam korpus UU terindeks untuk Pasal ${num}. Untuk menjamin 100% akurasi tanpa halusinasi, sistem tidak mengarang bunyi ayat apabila teks rincinya belum termuat dalam indeks korpus.`,
      catatanPenerapan: [
        'Gunakan menu "Indeks Korpus UU" di bilah kiri untuk melihat daftar pasal lengkap yang telah terindeks beserta pembaruan UU No. 1 Tahun 2026.',
        'Atau telusuri menggunakan kata kunci topik seperti "Pembunuhan", "Pencurian", "Berita Bohong", atau "Denda".',
      ],
      ditemukanDalamKorpus: false,
    };
  }

  const notes: string[] = [];
  if (wvsMatch && !exact) {
    notes.push(
      `Penelusuran dialihkan dari Pasal ${num} KUHP Lama (WvS) ke padanan mutakhirnya yaitu ${target.pasal} UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (${target.judul}).`
    );
  }
  if (target.diubahOlehUU2026 && target.catatanUU2026) {
    notes.push(`Pembaruan UU No. 1 Tahun 2026: ${target.catatanUU2026}`);
  }
  if (target.wvsPadanan) {
    notes.push(`Padanan KUHP Lama (WvS / UU 1/1946): ${target.wvsPadanan}. ${target.wvsBunyiSingkat ?? ''}`.trim());
  }
  if (typeof target.penjaraMaksBulan === 'number' && target.penjaraMaksBulan <= 60) {
    notes.push(
      'Dengan ancaman penjara paling lama <= 5 tahun, terdakwa yang baru pertama kali melakukan tindak pidana dapat dipertimbangkan penjatuhan pidana pengawasan paling lama 3 tahun (Pasal 75–76 jo. UU 1/2026).'
    );
  }
  if (target.kategoriDenda) {
    notes.push(
      'Jika pidana denda tidak dibayar dan penyitaan/lelang aset (Pasal 81) tidak mencukupi, pidana penjara pengganti dihitung secara progresif berdasarkan Lampiran III UU No. 1 Tahun 2026 (Pasal 82, maks 730 hari).'
    );
  }

  return {
    kind: 'bedah-pasal',
    pasalNomor: `${target.pasal} UU No. 1 Tahun 2023${target.diubahOlehUU2026 ? ' jo. UU No. 1 Tahun 2026' : ''}`,
    bukuBab: `${target.buku} · ${target.bab}`,
    judulDelik: target.judul,
    bunyiPasal: target.bunyi,
    jenisDelik: detectJenisDelik(target),
    ancamanPidana: formatAncamanPidana(target),
    unsur: buildUnsurForArticle(target),
    logikaPohon: buildLogicTreeForArticle(target),
    penjelasanOtentik: target.catatanUU2026
      ? `${target.penjelasan}\n\nCatatan Penyesuaian UU No. 1 Tahun 2026: ${target.catatanUU2026}`
      : target.penjelasan,
    catatanPenerapan: notes,
    ditemukanDalamKorpus: true,
  };
}

export function runKomparatorLocal(query: string): KomparatorResult {
  const trimmed = query.trim();
  const matches = findRelevantCorpusArticles(trimmed, 8).filter((a) => Boolean(a.wvsPadanan));
  const fallbackMatches = matches.length > 0 ? matches : findRelevantCorpusArticles(trimmed, 6);

  if (fallbackMatches.length === 0) {
    return {
      kind: 'komparator',
      judulPerbandingan: `Komparasi KUHP Baru vs KUHP Lama — "${trimmed}"`,
      pasalBaru: 'Data tidak ditemukan dalam korpus UU',
      pasalLama: 'Data tidak ditemukan dalam korpus WvS',
      ringkasanPergeseran:
        'Data tidak ditemukan dalam korpus UU. Masukkan kata kunci tindak pidana (seperti "Pembunuhan", "Pencurian", "Berita Bohong", "Penggelapan", "Penipuan", "Perzinaan", "Denda") atau nomor pasal KUHP Baru/Lama.',
      tabelPerbandingan: [
        {
          aspek: 'Saran Kata Kunci',
          kuhpBaru: 'Pembunuhan (Ps. 458–463), Pencurian (Ps. 476–479), Berita Bohong (Ps. 263–264), Denda (Ps. 79, 82)',
          kuhpLama: 'Pasal 338–345 WvS, Pasal 362–365 WvS, Pasal 14–15 UU 1/1946, Pasal 30 WvS',
          implikasiHukum: 'Silakan ketik kata kunci delik atau pilih salah satu contoh cepat di atas.',
        },
      ],
      asasPeralihanPasal3:
        'Berdasarkan Pasal 3 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026, apabila terdapat perubahan peraturan perundang-undangan setelah perbuatan dilakukan, diterapkan aturan yang paling menguntungkan bagi pelaku (asas lex mitior).',
      ditemukanDalamKorpus: false,
    };
  }

  const primary = fallbackMatches[0];
  const baruList = Array.from(new Set(fallbackMatches.map((m) => m.pasal)));
  const lamaList = Array.from(
    new Set(fallbackMatches.map((m) => m.wvsPadanan).filter((v): v is string => Boolean(v)))
  );

  const isKeywordOnly = !isPasalSpecificQuery(trimmed);
  const judulPerbandingan = isKeywordOnly
    ? `Komparasi Topik "${trimmed}": KUHP Baru (${baruList.slice(0, 3).join(', ')}) vs KUHP Lama`
    : `Komparasi ${primary.pasal} UU 1/2023 vs ${primary.wvsPadanan ?? 'KUHP Lama (WvS)'} — ${primary.judul}`;

  const tabelPerbandingan: KomparatorRow[] = [
    {
      aspek: 'Basis Peraturan & Sistematika',
      kuhpBaru: `${baruList.join(', ')} dalam UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (${primary.buku} · ${primary.bab}).`,
      kuhpLama: `${lamaList.length > 0 ? lamaList.join('; ') : 'Tidak diatur dalam WvS'} (Wetboek van Strafrecht Stb. 1915 No. 732 jo. UU No. 1 Tahun 1946, dicabut via Pasal 622).`,
      implikasiHukum:
        'Rekodifikasi nasional memindahkan dan menyelaraskan norma hukum pidana kolonial serta UU tersebar ke dalam satu sistem KUHP Nasional yang seragam.',
    },
    {
      aspek: 'Rumusan Norma & Unsur Pokok',
      kuhpBaru: primary.bunyi.replace(/\n+/g, ' '),
      kuhpLama:
        primary.wvsBunyiSingkat ??
        `${primary.wvsPadanan ?? 'Tidak dikenal secara eksplisit dalam WvS'} menggunakan terminologi "Barang siapa" serta pembagian Kejahatan (Buku II) dan Pelanggaran (Buku III).`,
      implikasiHukum: primary.catatanUU2026
        ? `UU 1/2026 mempertegas kepastian unsur: ${primary.catatanUU2026}`
        : 'UU 1/2023 menyeragamkan subjek menjadi "Setiap Orang", menghapus dikotomi Kejahatan vs Pelanggaran, serta memperjelas batas sifat melawan hukum.',
    },
    {
      aspek: 'Ancaman Sanksi & Sistem Denda',
      kuhpBaru: formatAncamanPidana(primary),
      kuhpLama:
        primary.wvsPadanan && /denda/i.test(primary.wvsBunyiSingkat ?? '')
          ? 'Denda nominal statis gulden/rupiah lama (diubah dengan Perpu 18/1960 & Perma 2/2012) dengan kurungan pengganti maks 6–8 bulan (Pasal 30 WvS).'
          : 'Pidana penjara/kurungan/mati konvensional tanpa sistem kategori denda maupun pidana kerja sosial/pengawasan modern.',
      implikasiHukum:
        'KUHP Baru menggunakan Kategori Denda I–VIII (Pasal 79), pidana pengawasan maks 3 thn untuk pelaku pertama kali (Pasal 76 jo. UU 1/2026), dan penjara pengganti progresif Lampiran III (Pasal 82).',
    },
  ];

  // Bila pencarian berdasarkan kata kunci menemukan banyak pasal (mis. Pembunuhan, Pencurian),
  // tampilkan baris perbandingan khusus untuk setiap pasal yang cocok!
  if (fallbackMatches.length > 1) {
    for (const art of fallbackMatches.slice(0, 6)) {
      tabelPerbandingan.push({
        aspek: `${art.pasal} ↔ ${art.wvsPadanan ?? 'Ketentuan Baru'}`,
        kuhpBaru: `${art.judul}: ${formatAncamanPidana(art)}. ${art.catatanUU2026 ? `[UU 1/2026: ${art.catatanUU2026}]` : ''}`.trim(),
        kuhpLama:
          art.wvsBunyiSingkat ??
          (art.wvsPadanan
            ? `${art.wvsPadanan} (WvS Stb. 1915 No. 732 jo. UU 1/1946).`
            : 'Ketentuan baru yang belum diatur eksplisit dalam WvS.'),
        implikasiHukum: art.penjelasan,
      });
    }
  }

  const ringkasanPergeseran = isKeywordOnly
    ? `Ditemukan ${fallbackMatches.length} ketentuan terkait kata kunci "${trimmed}" yang memperlihatkan pergeseran paradigma dari WvS Stb. 1915 No. 732 jo. UU No. 1 Tahun 1946 menuju UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 — mulai dari perumusan ulang unsur delik, kategorisasi denda, alternatif pidana, hingga penghapusan terminologi kolonial.`
    : `${primary.pasal} (${primary.judul}) menggantikan ${primary.wvsPadanan ?? 'ketentuan sebelumnya'} dengan pembaruan sistematika, kategori denda (Pasal 79), serta penyesuaian dalam UU No. 1 Tahun 2026. ${primary.penjelasan}`;

  return {
    kind: 'komparator',
    judulPerbandingan,
    pasalBaru: baruList.join(', '),
    pasalLama: lamaList.length > 0 ? lamaList.join('; ') : 'Tidak diatur eksplisit dalam WvS',
    ringkasanPergeseran,
    tabelPerbandingan,
    asasPeralihanPasal3:
      'Sesuai Pasal 3 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026: (1) jika peraturan baru lebih menguntungkan bagi pelaku, diterapkan peraturan baru; (2) bila perbuatan bukan lagi tindak pidana, penyidikan/penuntutan dihentikan atau terpidana inkrah dibebaskan langsung tanpa hak ganti rugi (ayat 3 & 6); dan (3) bila ancaman pidana baru lebih ringan, pelaksanaan putusan inkrah disesuaikan ke batas maksimal UU baru (ayat 7).',
    ditemukanDalamKorpus: true,
  };
}

export function runSimulatorKasusLocal(chronology: string): SimulatorKasusResult {
  const trimmed = chronology.trim();
  const lower = trimmed.toLowerCase();

  // Deteksi delik utama dari kronologi
  const isMalamRumahBongkar =
    /(malam|0[0-4]\.\d{2}|2[23]\.\d{2}|pukul\s*[01234]\b)/.test(lower) &&
    /(jendela|pintu|rumah|membongkar|congkel|mencongkel|kunci palsu|memanjat)/.test(lower);
  const isCuras =
    /(curi|mencuri|mengambil|merampas|rampok|jambret|begal)/.test(lower) &&
    /(pisau|senjata|memukul|ancaman|kekerasan|paksa|todong|cekik)/.test(lower);
  const isPencurian = /(curi|mencuri|mengambil|laptop|perhiasan|motor|hp|uang|barang)/.test(lower) && !/sewa|pinjam|titip|gadai/.test(lower);
  const isPenggelapan = /(sewa|rental|titip|pinjam)/.test(lower) && /(gadai|menggadaikan|jual|tidak mengembalikan|menggelapkan)/.test(lower);
  const isPenipuan = /(tipu|menipu|bohong|fiktif|investasi|mengaku|nama palsu|jabatan palsu|transfer)/.test(lower);
  const isPembunuhanBerencana = /(rencana|direncanakan|menyiapkan racun|membeli pisau sebelumnya|jeda waktu)/.test(lower) && /(bunuh|membunuh|nyawa|meninggal|tewas|mati)/.test(lower);
  const isPembunuhan = /(bunuh|membunuh|menusuk hingga tewas|menembak mati|merampas nyawa)/.test(lower);
  const isPenganiayaan = /(pukul|memukul|aniaya|menganiaya|tendang|bacok|patah|luka|sakit)/.test(lower);
  const isKealpaan = /(lalai|kealpaan|mengantuk|ngebut|kecelakaan|tidak sengaja menabrak|tanpa maksud)/.test(lower);
  const isBeritaBohong = /(berita bohong|hoaks|fitnah viral|kerusuhan)/.test(lower);
  const isPerusakan = /(merusak|menghancurkan|membakar|memecahkan)/.test(lower) && !isMalamRumahBongkar;

  // Deteksi modifikator Buku Kesatu
  const hasPercobaan =
    /(tertangkap|gagal|belum sempat|sebelum keluar|dicegah|tidak selesai|ketahuan satpam|digagalkan)/.test(lower);
  const hasPenyertaan =
    /(dan b\b|bersama-sama|berdua|bersekutu|menyuruh|membujuk|menggerakkan|mereka|dua orang|tiga orang)/.test(lower) ||
    /\b[a-z]\s+dan\s+[a-z]\b/i.test(trimmed);
  const hasNoodweer =
    /(menyerang|hendak menusuk|dihadang|membela diri|mempertahankan diri|merebut|tanpa jalan lari|terpaksa|ancaman serangan)/.test(lower);
  const hasNoodweerExces =
    hasNoodweer && /(panik|keguncangan jiwa|ketakutan hebat|melampaui batas|berkali-kali)/.test(lower);
  const hasOvermacht = /(daya paksa|diancam mati jika menolak|keadaan darurat|terpaksa mutlak)/.test(lower);

  const selectedPasal: string[] = [];
  const evaluasiUnsur: CaseElementEvaluation[] = [];
  let rekomendasiKualifikasi = '';
  let alasanPenghapusPidana = '';

  // Bangun kualifikasi delik utama
  if (isPenggelapan) {
    selectedPasal.push('Pasal 486 UU 1/2023 (Penggelapan)');
    evaluasiUnsur.push(
      {
        unsur: 'Objek Barang Milik Orang Lain yang Dikuasai Secara Sah',
        faktaKasus: 'Barang berada di tangan pelaku berdasarkan hubungan hukum yang sah (perjanjian sewa/rental/titip/pinjam).',
        statusPemenuhan: 'Terpenuhi',
        analisis:
          'Berbeda dari pencurian (Pasal 476), penguasaan awal dalam kronologi bukan diperoleh secara melawan hukum, melainkan melalui penyerahan sah pemiliknya.',
      },
      {
        unsur: 'Secara Melawan Hukum Memiliki Barang (Pengalihkuasaan)',
        faktaKasus: 'Pelaku menggadaikan/menjual/menguasai barang melampaui hak pakai tanpa seizin pemilik.',
        statusPemenuhan: 'Terpenuhi',
        analisis:
          'Tindakan menggadaikan atau memindahtangankan milik pihak lain membuktikan maksud memiliki secara melawan hukum (Pasal 486, ancaman maks 4 tahun atau denda Kat. IV).',
      }
    );
    rekomendasiKualifikasi = 'Penggelapan — Pasal 486 UU No. 1 Tahun 2023';
  } else if (isPenipuan) {
    selectedPasal.push('Pasal 492 UU 1/2023 (Penipuan)');
    evaluasiUnsur.push(
      {
        unsur: 'Alat Penggerak (Nama/Kedudukan Palsu, Tipu Muslihat, Rangkaian Kata Bohong)',
        faktaKasus: 'Pelaku menggunakan kebohongan atau tipu daya untuk memengaruhi kehendak korban.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Wajib dibuktikan bahwa rangkaian kebohongan menjadi penyebab langsung (kausalitas) korban menyerahkan barang atau uang.',
      },
      {
        unsur: 'Penyerahan Barang / Pemberian Utang / Penghapusan Piutang',
        faktaKasus: 'Korban menggerakkan harta/asetnya karena terperdaya.',
        statusPemenuhan: 'Perlu Pembuktian Lanjut',
        analisis: 'Perlu diverifikasi bukti transfer, perjanjian fiktif, serta niat melawan hukum sejak awal perikatan (membedakan dari wanprestasi perdata).',
      }
    );
    rekomendasiKualifikasi = 'Penipuan — Pasal 492 UU No. 1 Tahun 2023';
  } else if (isCuras) {
    selectedPasal.push('Pasal 479 UU 1/2023 (Pencurian dengan Kekerasan)');
    evaluasiUnsur.push(
      {
        unsur: 'Mengambil Barang Milik Orang Lain Secara Melawan Hukum',
        faktaKasus: 'Terjadi upaya pengambilan barang berharga milik korban.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Unsur objektif pencurian sebagaimana Pasal 476 terpenuhi sebagai delik inti.',
      },
      {
        unsur: 'Didahului, Disertai, atau Diikuti Kekerasan/Ancaman Kekerasan',
        faktaKasus: 'Penggunaan kekerasan fisik atau intimidasi untuk mempermudah pengambilan barang atau melarikan diri.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Mengangkat kualifikasi dari pencurian biasa menjadi Pasal 479 (ancaman maks 9 tahun, atau lebih berat bila luka berat/mati).',
      }
    );
    rekomendasiKualifikasi = 'Pencurian dengan Kekerasan — Pasal 479 UU No. 1 Tahun 2023';
  } else if (isMalamRumahBongkar && isPencurian) {
    selectedPasal.push('Pasal 477 UU 1/2023 (Pencurian dengan Pemberatan)');
    evaluasiUnsur.push(
      {
        unsur: 'Setiap Orang Mengambil Barang Milik Orang Lain',
        faktaKasus: 'Pelaku mengambil barang berharga milik korban di dalam rumah.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Unsur pokok Pasal 476 terpenuhi atas pengambilan barang milik orang lain.',
      },
      {
        unsur: 'Unsur Pemberat: Malam Hari dalam Rumah & Membongkar/Merusak Jalan Masuk',
        faktaKasus: 'Perbuatan dilakukan dini hari/malam hari dengan mencongkel/membongkar akses masuk rumah.',
        statusPemenuhan: 'Terpenuhi',
        analisis:
          'Memenuhi keadaan pemberat Pasal 477 ayat (1)–(2) (malam hari di rumah tertutup dan/atau membongkar/merusak). Bila dilakukan berdua atau lebih secara bersama-sama, pemberatan ganda ayat (2) dapat diterapkan.',
      }
    );
    rekomendasiKualifikasi = 'Pencurian dengan Pemberatan — Pasal 477 UU No. 1 Tahun 2023';
  } else if (isPencurian) {
    selectedPasal.push('Pasal 476 UU 1/2023 (Pencurian)');
    evaluasiUnsur.push(
      {
        unsur: 'Mengambil Barang Milik Orang Lain dengan Maksud Memiliki Secara Melawan Hukum',
        faktaKasus: 'Terdapat pengambilan barang tanpa izin pemilik sah.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Apabila nilai barang <= Rp500.000 dan tidak dilakukan dalam rumah/pemberatan, periksa kualifikasi lebih ringan Pasal 478 (Pencurian Ringan).',
      }
    );
    rekomendasiKualifikasi = 'Pencurian Biasa — Pasal 476 (atau Ps. 478 bila nilai <= Rp500rb tanpa pemberatan)';
  } else if (isPembunuhanBerencana) {
    selectedPasal.push('Pasal 459 UU 1/2023 (Pembunuhan Berencana)');
    evaluasiUnsur.push(
      {
        unsur: 'Dengan Sengaja & Dengan Rencana Terlebih Dahulu Merampas Nyawa',
        faktaKasus: 'Terdapat jeda waktu persiapan tenang sebelum hilangnya nyawa korban.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Sesuai Pasal 459 dan Penjelasan Pasal 458 ayat (1) jo. UU 1/2026, kesengajaan mematikan dan ketenangan berpikir menjadi syarat mutlak.',
      }
    );
    rekomendasiKualifikasi = 'Pembunuhan Berencana — Pasal 459 UU No. 1 Tahun 2023';
  } else if (isPembunuhan) {
    selectedPasal.push('Pasal 458 UU 1/2023 jo. UU 1/2026 (Pembunuhan)');
    evaluasiUnsur.push(
      {
        unsur: 'Merampas Nyawa Orang Lain dengan Kesengajaan Mematikan',
        faktaKasus: 'Tindakan pelaku mengakibatkan hilangnya nyawa korban.',
        statusPemenuhan: 'Perlu Pembuktian Lanjut',
        analisis:
          'Penjelasan Pasal 458 ayat (1) jo. UU 1/2026 mewajibkan pembuktian kesengajaan merampas nyawa. Bila maksudnya hanya melukai namun korban mati, berlaku Pasal 466 ayat (3); bila lalai, berlaku Pasal 474 ayat (3).',
      }
    );
    rekomendasiKualifikasi = 'Pembunuhan — Pasal 458 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026';
  } else if (isKealpaan) {
    selectedPasal.push('Pasal 474 UU 1/2023 (Kealpaan Mengakibatkan Luka/Mati)');
    evaluasiUnsur.push(
      {
        unsur: 'Kealpaan (Culpa) yang Menyebabkan Luka atau Kematian',
        faktaKasus: 'Akibat timbul karena kelalaian/kurang hati-hati, bukan kesengajaan.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Perlu diuji standar kehati-hatian yang layak serta kausalitas langsung antara kelalaian dan akibat.',
      }
    );
    rekomendasiKualifikasi = 'Kealpaan Mengakibatkan Luka/Mati — Pasal 474 UU No. 1 Tahun 2023';
  } else if (isPenganiayaan) {
    selectedPasal.push('Pasal 466 UU 1/2023 jo. UU 1/2026 (Penganiayaan)');
    evaluasiUnsur.push(
      {
        unsur: 'Melakukan Penganiayaan (Menimbulkan Rasa Sakit/Luka)',
        faktaKasus: 'Terjadi tindakan kekerasan fisik terhadap tubuh korban.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Penjelasan Pasal 466 ayat (1) jo. UU 1/2026 mencakup rasa sakit, luka, atau kerusakan kesehatan fisik maupun psikis. Jika luka berat, berlaku ayat (2) maks 5 tahun.',
      }
    );
    rekomendasiKualifikasi = 'Penganiayaan — Pasal 466 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026';
  } else if (isBeritaBohong) {
    selectedPasal.push('Pasal 263–264 UU 1/2023 jo. UU 1/2026 (Penyiaran Berita Bohong)');
    evaluasiUnsur.push(
      {
        unsur: 'Menyiarkan Berita Bohong dan Benar-Benar Mengakibatkan Kerusuhan',
        faktaKasus: 'Terdapat penyebaran informasi yang tidak benar di ruang publik.',
        statusPemenuhan: 'Perlu Pembuktian Lanjut',
        analisis: 'Wajib dibuktikan dua hal sekaligus: sifat bohong yang diketahui/patut diduga pelaku dan akibat nyata berupa kerusuhan masyarakat.',
      }
    );
    rekomendasiKualifikasi = 'Penyiaran Berita Bohong — Pasal 263 UU No. 1 Tahun 2023 jo. UU 1/2026';
  } else if (isPerusakan) {
    selectedPasal.push('Pasal 521 UU 1/2023 jo. UU 1/2026 (Perusakan Barang)');
    evaluasiUnsur.push(
      {
        unsur: 'Secara Melawan Hukum Menghancurkan atau Merusak Barang Milik Orang Lain',
        faktaKasus: 'Barang milik pihak lain mengalami kerusakan atau tidak dapat dipakai lagi.',
        statusPemenuhan: 'Terpenuhi',
        analisis: 'Periksa besaran kerugian: jika <= Rp500.000 berlaku Pasal 521 ayat (2) jo. UU 1/2026 (perusakan ringan, maks 6 bulan atau denda Kat. II).',
      }
    );
    rekomendasiKualifikasi = 'Perusakan Barang — Pasal 521 UU No. 1 Tahun 2023 jo. UU 1/2026';
  } else {
    const fallbackMatches = findRelevantCorpusArticles(trimmed, 3);
    for (const fm of fallbackMatches) {
      selectedPasal.push(`${fm.pasal} UU 1/2023 (${fm.judul})`);
    }
    if (selectedPasal.length === 0) {
      selectedPasal.push('Pasal 12 & Pasal 36 UU 1/2023 (Asas Tindak Pidana & Kesalahan)');
    }
    evaluasiUnsur.push(
      {
        unsur: 'Identifikasi Perbuatan Dilarang & Sifat Melawan Hukum (Pasal 12)',
        faktaKasus: 'Kronologi memuat interaksi hukum yang perlu dipadankan dengan rumusan delik khusus.',
        statusPemenuhan: 'Perlu Pembuktian Lanjut',
        analisis:
          'Uji apakah perbuatan memenuhi seluruh unsur tertulis pada pasal terkait tanpa menggunakan analogi (larangan analogi Pasal 1 ayat 2).',
      },
      {
        unsur: 'Pertanggungjawaban Pidana & Kesalahan (Pasal 36)',
        faktaKasus: 'Kesengajaan (dolus) atau kealpaan (culpa) pelaku perlu dibuktikan dari fakta konkret.',
        statusPemenuhan: 'Perlu Pembuktian Lanjut',
        analisis: 'Asas geen straf zonder schuld mewajibkan pembuktian kesalahan sebelum penjatuhan pidana.',
      }
    );
    rekomendasiKualifikasi = `Memerlukan Klasifikasi Lanjut (${selectedPasal[0]})`;
  }

  // Tambahkan evaluasi Percobaan (Pasal 17) & Penyertaan (Pasal 20) bila terdeteksi
  if (hasPercobaan) {
    selectedPasal.push('Pasal 17 UU 1/2023 (Percobaan / Poging)');
    evaluasiUnsur.push({
      unsur: 'Percobaan Melakukan Tindak Pidana (Pasal 17)',
      faktaKasus: 'Pelaksanaan delik terhenti karena faktor eksternal (tertangkap/dicegah) bukan karena pengunduran diri sukarela.',
      statusPemenuhan: 'Perlu Pembuktian Lanjut',
      analisis:
        'Jika barang belum sepenuhnya berada di bawah penguasaan nyata pelaku sebelum tertangkap di area tertutup pemilik, delik dikualifikasikan sebagai Percobaan (maksimum pidana dikurangi menjadi paling banyak 2/3 dari ancaman pokok).',
    });
  }

  if (hasPenyertaan) {
    selectedPasal.push('Pasal 20 UU 1/2023 (Penyertaan / Medepleger)');
    evaluasiUnsur.push({
      unsur: 'Penyertaan / Turut Serta Melakukan (Pasal 20 huruf c)',
      faktaKasus: 'Perbuatan dilakukan secara bersama-sama oleh lebih dari satu orang dengan pembagian peran/kerja sama sadar.',
      statusPemenuhan: 'Terpenuhi',
      analisis:
        'Masing-masing peserta bertanggung jawab sebagai pelaku apabila terdapat kerja sama yang disadari (bewuste samenwerking) dan pelaksanaan bersama.',
    });
  }

  // Evaluasi Alasan Penghapus Pidana (Pasal 31–44)
  if (hasNoodweerExces) {
    selectedPasal.push('Pasal 34 & Pasal 43 UU 1/2023 (Noodweer & Noodweer Exces)');
    evaluasiUnsur.push({
      unsur: 'Pembelaan Terpaksa (Pasal 34) & Melampaui Batas karena Keguncangan Jiwa (Pasal 43)',
      faktaKasus: 'Pelaku menghadapi serangan seketika yang melawan hukum lalu melakukan perlawanan dalam keadaan panik/terdesak.',
      statusPemenuhan: 'Terpenuhi',
      analisis:
        'Apabila pembelaan masih proporsional dan tidak ada jalan lain yang wajar, berlaku Pasal 34 (Alasan Pembenar). Jika perlawanan melampaui batas proporsionalitas akibat keguncangan jiwa yang hebat karena serangan itu sendiri, berlaku Pasal 43 (Alasan Pemaaf — tidak dipidana).',
    });
    alasanPenghapusPidana =
      'Terdapat indikasi kuat Pembelaan Terpaksa (Pasal 34, alasan pembenar) dan/atau Pembelaan Terpaksa yang Melampaui Batas karena keguncangan jiwa hebat (Pasal 43, alasan pemaaf). Apabila syarat serangan seketika yang melawan hukum terbukti di persidangan, pelaku TIDAK DIPIDANA.';
    rekomendasiKualifikasi = `${rekomendasiKualifikasi} — Terlindung Alasan Penghapus Pidana (Pasal 34 / Pasal 43 UU 1/2023)`;
  } else if (hasNoodweer) {
    selectedPasal.push('Pasal 34 UU 1/2023 (Pembelaan Terpaksa / Noodweer)');
    evaluasiUnsur.push({
      unsur: 'Pembelaan Terpaksa terhadap Serangan Seketika Melawan Hukum (Pasal 34)',
      faktaKasus: 'Terdapat ancaman serangan mendadak yang membahayakan diri/orang lain/harta benda.',
      statusPemenuhan: 'Terpenuhi',
      analisis: 'Sepanjang pembelaan bersifat perlu (subsidier) dan proporsional terhadap serangan, sifat melawan hukum perbuatan dihapuskan (Alasan Pembenar).',
    });
    alasanPenghapusPidana =
      'Terdapat indikasi Alasan Pembenar berupa Pembelaan Terpaksa (Pasal 34 UU 1/2023): pembelaan dilakukan seketika terhadap serangan yang melawan hukum tanpa jalan menghindar yang aman.';
    rekomendasiKualifikasi = `${rekomendasiKualifikasi} — Berpotensi Gugur karena Alasan Pembenar (Pasal 34)`;
  } else if (hasOvermacht) {
    selectedPasal.push('Pasal 40 UU 1/2023 (Daya Paksa / Overmacht)');
    alasanPenghapusPidana =
      'Perlu diuji penerapan Pasal 40 UU 1/2023 (Overmacht / Daya Paksa atau Keadaan Darurat) apabila pelaku bertindak di bawah tekanan yang tidak dapat ditahan atau dihindari.';
  } else {
    alasanPenghapusPidana =
      'Dari kronologi yang dipaparkan, tidak tampak fakta adanya alasan pembenar (Pasal 31–35, seperti pembelaan terpaksa atau perintah jabatan) maupun alasan pemaaf (Pasal 38–44, seperti daya paksa atau ketidakmampuan bertanggung jawab).';
  }

  const logikaPohonKasus: LogicNode[] = [
    {
      id: 'case-1',
      label: '1. Pengujian Perbuatan Pidana (Actus Reus) & Delik Inti',
      kriteria: `Pemadanan fakta kasus ke dalam rumusan ${selectedPasal[0]}.`,
      statusSyarat: 'Wajib Terpenuhi',
      children: [
        {
          id: 'case-1a',
          label: '1a. Subjek & Objek Delik',
          kriteria: 'Identifikasi pelaku (termasuk penyertaan Ps. 20 bila > 1 orang) dan objek hukum yang dilanggar.',
          statusSyarat: 'Wajib Terpenuhi',
        },
        ...(hasPercobaan
          ? [
              {
                id: 'case-1b',
                label: '1b. Tahap Penyelesaian (Selesai vs Percobaan Ps. 17)',
                kriteria: 'Menilai apakah delik telah selesai atau terhenti di tengah pelaksanaan di luar kehendak pelaku.',
                statusSyarat: 'Alternatif' as const,
              },
            ]
          : []),
      ],
    },
    {
      id: 'case-2',
      label: '2. Penyaringan Sifat Melawan Hukum & Alasan Penghapus Pidana',
      kriteria: 'Pengujian Pasal 12 serta Pasal 31–44 UU 1/2023.',
      statusSyarat: hasNoodweer || hasOvermacht ? 'Pengecualian / Alasan Penghapus' : 'Wajib Terpenuhi',
      children: [
        {
          id: 'case-2a',
          label: '2a. Ketersediaan Alasan Pembenar / Pemaaf',
          kriteria: hasNoodweer
            ? 'Memeriksa proporsionalitas pembelaan (Ps. 34) atau keguncangan jiwa (Ps. 43).'
            : 'Tidak ditemukan indikasi alasan penghapus pidana dalam kronologi.',
          statusSyarat: 'Pengecualian / Alasan Penghapus',
        },
      ],
    },
    {
      id: 'case-3',
      label: '3. Konklusi Kualifikasi & Pedoman Pemidanaan',
      kriteria: `${rekomendasiKualifikasi}. Pertimbangkan Pasal 54 (pedoman pemidanaan/rechterlijk pardon) serta Pasal 75–76 jo. UU 1/2026 apabila ancaman <= 5 tahun.`,
      statusSyarat: 'Alternatif',
    },
  ];

  const kesimpulanAkademis = hasNoodweer
    ? `Secara doktrinal berdasarkan UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026, kendati unsur objektif perbuatan fisik tampak terpenuhi, sifat melawan hukum atau kesalahan pelaku berpotensi hapus berdasarkan Pasal 34 (Noodweer) dan/atau Pasal 43 (Noodweer Exces). Dalam tahap pembuktian di persidangan, fokus utama adalah menguji seketikanya serangan, proporsionalitas alat bela diri, dan keguncangan jiwa pelaku.`
    : `Secara akademis, fakta kronologi mengarah pada kualifikasi ${rekomendasiKualifikasi}${
        hasPercobaan ? ' jo. Pasal 17 (Percobaan)' : ''
      }${hasPenyertaan ? ' jo. Pasal 20 (Penyertaan)' : ''}. Penilaian akhir tetap wajib memastikan alat bukti yang sah terhadap unsur subjektif (kesengajaan/kealpaan Pasal 36) serta mengacu pada pedoman pemidanaan Pasal 54 dan ketentuan penyesuaian dalam UU No. 1 Tahun 2026.`;

  return {
    kind: 'simulator-kasus',
    ringkasanFakta: trimmed,
    pasalTerkait: selectedPasal,
    evaluasiUnsur,
    alasanPenghapusPidana,
    logikaPohonKasus,
    rekomendasiKualifikasi,
    kesimpulanAkademis,
    ditemukanDalamKorpus: true,
  };
}

export function runSocraticTurnLocal(
  messages: { role: 'user' | 'assistant'; content: string }[]
): { tanggapan: string; rujukanPasal: string[]; pertanyaanPemantik: string } {
  const userTurns = messages.filter((m) => m.role === 'user');
  const turnCount = userTurns.length;
  const latest = userTurns[userTurns.length - 1]?.content ?? '';
  const combinedHistory = userTurns.map((u) => u.content).join(' ');
  const qLower = `${latest} ${combinedHistory}`.toLowerCase();

  const matches = findRelevantCorpusArticles(latest, 4);
  const fallbackMatches = matches.length > 0 ? matches : findRelevantCorpusArticles(combinedHistory, 4);

  // Skenario tematik spesifik yang tajam untuk penalaran Socratic
  if (/(living law|hukum adat|pasal 2|pasal 66)/.test(qLower)) {
    const rujukan = ['Pasal 1 UU 1/2023', 'Pasal 2 UU 1/2023', 'Pasal 66 ayat (6) jo. UU 1/2026'];
    if (turnCount === 1) {
      return {
        tanggapan:
          'Argumentasi Anda menyentuh ketegangan klasik antara kepastian hukum (Pasal 1 ayat 1: asas legalitas formil & larangan analogi pada ayat 2) dan keadilan sosiologis (Pasal 2: hukum yang hidup dalam masyarakat). UU No. 1 Tahun 2023 membatasi Pasal 2 ayat (2) agar hanya berlaku sepanjang sesuai dengan Pancasila, UUD 1945, HAM, serta asas hukum umum, sedangkan UU No. 1 Tahun 2026 menegaskan melalui Pasal 66 ayat (6) bahwa sanksi utamanya adalah pemenuhan kewajiban adat setempat sebagai pidana pokok.',
        rujukanPasal: rujukan,
        pertanyaanPemantik:
          'Jika suatu norma hukum adat di daerah menetapkan perbuatan tertentu dapat dipidana padahal tidak tertulis dalam Buku Kedua KUHP Nasional, bagaimana hakim memastikan penerapan Pasal 2 tidak melanggar larangan analogi dalam Pasal 1 ayat (2)?',
      };
    }
    return {
      tanggapan:
        'Tepat untuk menguji batas konstitusionalnya. Melalui PP tata cara penetapan hukum yang hidup (Pasal 2 ayat 3) dan mekanisme kodifikasi ke dalam Peraturan Daerah (Pasal 66 ayat 6 jo. UU 1/2026), pembentuk undang-undang berupaya menjaga agar ruang lingkup sanksi adat tetap terukur dan tidak membuka ruang kesewenang-wenangan.',
      rujukanPasal: rujukan,
      pertanyaanPemantik:
        'Menurut Anda, apakah pencantuman delik adat ke dalam Peraturan Daerah justru mengubah sifatnya dari hukum tidak tertulis menjadi legalitas formil tingkat daerah, atau tetap mempertahankan karakter legalitas materiil?',
    };
  }

  if (/(lampiran iii|pasal 82|penjara pengganti|denda tidak dibayar|pasal 81|pasal 83)/.test(qLower)) {
    const rujukan = ['Pasal 79 UU 1/2023', 'Pasal 81 UU 1/2023', 'Pasal 82–83 & Lampiran III jo. UU 1/2026'];
    if (turnCount === 1) {
      return {
        tanggapan:
          'Anda mengidentifikasi pembaruan krusial dalam UU No. 1 Tahun 2026. Berbeda dengan Pasal 30 WvS (yang langsung mengonversi denda ke kurungan maks 6–8 bulan), Pasal 81 mewajibkan penyitaan dan pelelangan aset terlebih dahulu. Barulah apabila penyitaan/lelang tidak mencukupi, Pasal 82 jo. Lampiran III UU 1/2026 menerapkan tarif progresif berjenjang hingga maksimal 2 tahun (730 hari), dan Pasal 83 memungkinkan pelunasan denda proporsional kapan saja.',
        rujukanPasal: rujukan,
        pertanyaanPemantik:
          'Mengapa pembentuk UU No. 1 Tahun 2026 memilih skala progresif (Rp1 juta/hari hingga Rp25 juta/hari pada lapisan di atas Rp2 miliar dengan batas atas 730 hari) dibandingkan tarif tunggal flat untuk semua besaran denda?',
      };
    }
    return {
      tanggapan:
        'Penalaran Anda mengenai proporsionalitas dan pencegahan disparitas pemidanaan sangat relevan. Tanpa skala progresif, denda Kategori VII atau VIII (miliaran rupiah) akan menghasilkan lama pidana pengganti yang mustahil dijalani atau melampaui ancaman pidana penjara pokoknya.',
      rujukanPasal: rujukan,
      pertanyaanPemantik:
        'Bagaimana konsekuensinya menurut Pasal 83 jo. UU 1/2026 apabila seorang terpidana denda Rp500 juta telah menjalani 60 hari pidana penjara pengganti lalu keluarganya ingin melunasi sisa denda?',
    };
  }

  if (/(458|kesengajaan|pembunuhan|nyawa|466|474)/.test(qLower)) {
    const rujukan = ['Penjelasan Pasal 458 ayat (1) jo. UU 1/2026', 'Pasal 36 UU 1/2023', 'Pasal 466 ayat (3) & Pasal 474 ayat (3)'];
    if (turnCount === 1) {
      return {
        tanggapan:
          'Pertanyaan ini menyoroti urgensi Penjelasan Pasal 458 ayat (1) sebagaimana diubah oleh UU No. 1 Tahun 2026. Meski bunyi ayat (1) Pasal 458 secara redaksional hanya menyebut "Setiap Orang yang merampas nyawa orang lain" (tanpa mengulang frasa "dengan sengaja" seperti Pasal 338 WvS), Pasal 36 ayat (2) menetapkan bahwa pada prinsipnya delik tanpa penyebutan kealpaan mensyaratkan kesengajaan, dan UU 1/2026 memperjelasnya dalam Penjelasan Pasal 458 ayat (1).',
        rujukanPasal: rujukan,
        pertanyaanPemantik:
          'Dalam praktik pembuktian di pengadilan, bagaimana cara membedakan secara tegas antara pembunuhan (Pasal 458), penganiayaan yang mengakibatkan mati (Pasal 466 ayat 3), dan kealpaan yang mengakibatkan mati (Pasal 474 ayat 3) apabila alat yang digunakan terdakwa sama-sama melukai korban?',
      };
    }
    return {
      tanggapan:
        'Analisis Anda tepat menyoroti hubungan antara sikap batin (dolus eventualis vs animus necandi vs culpa) dan pemilihan alat/sasaran bagian tubuh vital. Penegasan UU 1/2026 mencegah jaksa atau hakim menafsirkan Pasal 458 secara objektif murni (strict liability) hanya dari akibat kematian.',
      rujukanPasal: rujukan,
      pertanyaanPemantik:
        'Jika terdakwa menembak ke arah kerumunan tanpa bermaksud membunuh si A secara khusus namun mengetahui risiko kematian sangat besar (dolus eventualis), apakah unsur kesengajaan pada Pasal 458 tetap dapat dinyatakan terpenuhi?',
    };
  }

  if (/(pasal 76|pengawasan|pertama kali|3 tahun|pasal 75)/.test(qLower)) {
    const rujukan = ['Pasal 75 UU 1/2023', 'Pasal 76 jo. UU 1/2026', 'Pasal 54 UU 1/2023'];
    return {
      tanggapan:
        'UU No. 1 Tahun 2026 merombak Pasal 76 dengan menegaskan dua syarat kunci bagi pidana pengawasan (yang ambang deliknya <= 5 tahun dalam Pasal 75): jangka waktu paling lama sama dengan ancaman penjara yang tidak lebih dari 3 tahun, dan hanya dijatuhkan kepada orang yang pertama kali melakukan tindak pidana.',
      rujukanPasal: rujukan,
      pertanyaanPemantik:
        'Apakah pembatasan ketat "pertama kali melakukan tindak pidana" dalam Pasal 76 jo. UU 1/2026 berarti seorang mantan narapidana yang 10 tahun lalu pernah dipidana ringan otomatis tertutup kesempatannya memperoleh pidana pengawasan, atau bagaimana hakim dapat menyeimbangkannya dengan Pasal 54?',
    };
  }

  if (/(pasal 3|lex mitior|peralihan|inkrah|wv[s]?|1946)/.test(qLower)) {
    const rujukan = ['Pasal 3 UU 1/2023 jo. UU 1/2026', 'Pasal 622 jo. UU 1/2026'];
    return {
      tanggapan:
        'Pasal 3 UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 memperluas doktrin lex mitior secara signifikan melampaui Pasal 1 ayat (2) WvS. Bila suatu perbuatan tidak lagi menjadi tindak pidana (dekriminalisasi), terpidana yang sedang menjalani putusan berkekuatan hukum tetap wajib dibebaskan tanpa hak menuntut ganti rugi (ayat 3 & 6); dan bila ancaman baru lebih ringan, putusan inkrah disesuaikan ke batas maksimum baru (ayat 7).',
      rujukanPasal: rujukan,
      pertanyaanPemantik:
        'Dengan dicabutnya UU No. 1 Tahun 1946 dan digantikannya Pasal 14 UU 1/1946 (ancaman 10 tahun) oleh Pasal 263 UU 1/2023 (ancaman 6 tahun), bagaimana implikasi langsung Pasal 3 ayat (7) jo. UU 1/2026 terhadap terpidana berita bohong yang sedang menjalani pidana penjara 8 tahun?',
    };
  }

  if (fallbackMatches.length === 0) {
    return {
      tanggapan:
        'Data tidak ditemukan dalam korpus UU sebagai argumen hukum pidana spesifik. Namun untuk membangun diskusi Socratic yang tajam, mari kita ikat premis Anda pada norma konkret dalam UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 (misalnya Asas Legalitas Pasal 1–3, Kesalahan Pasal 36, Pemidanaan Pasal 51–85, atau delik Buku Kedua Pasal 188–624).',
      rujukanPasal: ['Pasal 1–3 UU 1/2023', 'Pasal 36 UU 1/2023', 'Pasal 54 UU 1/2023'],
      pertanyaanPemantik:
        'Pasal atau konsep hukum pidana mana dalam UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026 yang ingin Anda uji konsistensinya terlebih dahulu?',
    };
  }

  const primary = fallbackMatches[0];
  const cited = fallbackMatches.map((m) => `${m.pasal} (${m.judul})`);
  const questionPool = [
    `Mengacu pada rumusan ${primary.pasal} (${primary.judul}), unsur manakah—antara actus reus, mens rea (Pasal 36), atau sifat melawan hukum (Pasal 12)—yang paling krusial dan paling rawan diperdebatkan dalam pembuktian perkara konkret?`,
    `Apabila dibandingkan dengan padanannya di KUHP Lama (${primary.wvsPadanan ?? 'WvS'}), apakah pembaruan pada ${primary.pasal} lebih memperluas atau justru memperketat ruang pemidanaan, dan bagaimana implikasinya terhadap asas lex mitior (Pasal 3 jo. UU 1/2026)?`,
    `Dalam kerangka tujuan pemidanaan Pasal 51 dan pedoman Pasal 54, sanksi alternatif atau faktor pemaaf apakah yang paling proporsional dipertimbangkan hakim untuk pelaku ${primary.judul}?`,
  ];

  return {
    tanggapan: `Argumen Anda relevan ditinjau melalui ${primary.pasal} UU No. 1 Tahun 2023${
      primary.diubahOlehUU2026 ? ' jo. UU No. 1 Tahun 2026' : ''
    } tentang ${primary.judul}. Dalam korpus, ketentuan ini menegaskan: "${primary.penjelasan}"${
      primary.catatanUU2026 ? ` Selain itu, UU No. 1 Tahun 2026 menambahkan penyesuaian penting: ${primary.catatanUU2026}` : ''
    }`,
    rujukanPasal: cited,
    pertanyaanPemantik: questionPool[(turnCount - 1) % questionPool.length],
  };
}
