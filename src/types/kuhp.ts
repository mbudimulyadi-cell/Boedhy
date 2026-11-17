export type ModuleId =
  | 'bedah-pasal'
  | 'komparator'
  | 'simulator-kasus'
  | 'kalkulator-sanksi'
  | 'diskusi-socratic';

export interface UnsurItem {
  kategori: 'Objektif (Actus Reus)' | 'Subjektif (Mens Rea)' | 'Sifat Melawan Hukum' | 'Pemberat / Kualifikasi';
  elemen: string;
  uraian: string;
  pembuktian: string;
}

export interface LogicNode {
  id: string;
  label: string;
  kriteria: string;
  statusSyarat: 'Wajib Terpenuhi' | 'Alternatif' | 'Pengecualian / Alasan Penghapus';
  children?: LogicNode[];
}

export interface BedahPasalResult {
  kind: 'bedah-pasal';
  pasalNomor: string;
  bukuBab: string;
  judulDelik: string;
  bunyiPasal: string;
  jenisDelik: string;
  ancamanPidana: string;
  unsur: UnsurItem[];
  logikaPohon: LogicNode[];
  penjelasanOtentik: string;
  catatanPenerapan: string[];
  ditemukanDalamKorpus: boolean;
}

export interface KataKunciPasalMatch {
  pasalNomor: string;
  judul: string;
  ringkasanIsi: string;
  ancamanPidana: string;
  catatanRelevansi: string;
}

export interface BedahKataKunciResult {
  kind: 'bedah-kata-kunci';
  kataKunci: string;
  pengertianYuridis: string;
  dasarKlasifikasi: string;
  daftarPasal: KataKunciPasalMatch[];
  halPenting: string[];
  ditemukanDalamKorpus: boolean;
}

export interface KomparatorRow {
  aspek: string;
  kuhpBaru: string;
  kuhpLama: string;
  implikasiHukum: string;
}

export interface KomparatorResult {
  kind: 'komparator';
  judulPerbandingan: string;
  pasalBaru: string;
  pasalLama: string;
  ringkasanPergeseran: string;
  tabelPerbandingan: KomparatorRow[];
  asasPeralihanPasal3: string;
  ditemukanDalamKorpus: boolean;
}

export interface CaseElementEvaluation {
  unsur: string;
  faktaKasus: string;
  statusPemenuhan: 'Terpenuhi' | 'Tidak Terpenuhi' | 'Perlu Pembuktian Lanjut';
  analisis: string;
}

export interface SimulatorKasusResult {
  kind: 'simulator-kasus';
  ringkasanFakta: string;
  pasalTerkait: string[];
  evaluasiUnsur: CaseElementEvaluation[];
  alasanPenghapusPidana: string;
  logikaPohonKasus: LogicNode[];
  rekomendasiKualifikasi: string;
  kesimpulanAkademis: string;
  ditemukanDalamKorpus: boolean;
}

export interface SocraticTurn {
  role: 'user' | 'assistant';
  content: string;
  rujukanPasal?: string[];
  pertanyaanPemantik?: string;
  timestamp: number;
}

export interface AnalysisRecord {
  id: string;
  module: ModuleId;
  query: string;
  title: string;
  createdAt: number;
  result:
    | BedahPasalResult
    | BedahKataKunciResult
    | KomparatorResult
    | SimulatorKasusResult;
}

export interface BookmarkItem {
  id: string;
  module: ModuleId;
  title: string;
  pasalRef: string;
  note: string;
  createdAt: number;
  record: AnalysisRecord;
}

export interface CorpusArticle {
  pasal: string;
  nomorAngka: number;
  buku: string;
  bab: string;
  judul: string;
  bunyi: string;
  penjelasan: string;
  kategoriDenda?: string;
  penjaraMaksBulan?: number;
  wvsPadanan?: string;
  wvsBunyiSingkat?: string;
  diubahOlehUU2026?: boolean;
  catatanUU2026?: string;
  kataKunci: string[];
}
