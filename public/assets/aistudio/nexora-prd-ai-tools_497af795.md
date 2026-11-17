# Product Requirements Document (PRD): Klinik KUHP

## 1. Ringkasan Eksekutif
Klinik KUHP adalah tools berbasis AI yang berfungsi sebagai asisten cerdas untuk membedah, membandingkan, dan mensimulasikan penerapan UU No. 1 Tahun 2023 (KUHP Nasional).

## 2. Target Pengguna
Mahasiswa S1 Hukum, Dosen pengampu mata kuliah Pidana, dan peneliti hukum.

## 3. Tujuan & Kriteria Keberhasilan
Menyediakan analisis hukum yang akurat, terstruktur, dan anti-halusinasi dengan tingkat akurasi 100% berdasarkan korpus undang-undang.

## 4. Ruang Lingkup (Free Tier Scope)
Seluruh modul (Bedah Pasal, Komparator, Simulator, Generator Soal, Kalkulator) tersedia dalam batas penggunaan harian (rate limiting) untuk menjaga biaya API tetap efisien.

## 5. Persyaratan Fungsional
Sistem RAG (Retrieval-Augmented Generation) wajib digunakan untuk memastikan setiap output memiliki kutipan pasal yang akurat. Fitur ekspor menggunakan library generatif dokumen untuk menghasilkan file PDF/Docx.

## 6. Alur Pengguna
Pengguna login -> Memilih salah satu dari 5 menu utama di sidebar -> Input query -> AI menghasilkan output terstruktur -> Pengguna menyimpan (bookmark) atau mengekspor hasil.

## 7. Spesifikasi UI/UX
UI Minimalis dengan layout fokus pada area chat tengah. Menggunakan color palette: Navy Blue (Brand), Gold (Accent), Off-White (Background).

## 8. Arsitektur Teknis & Gemini API
Backend menggunakan Google AI Studio (Gemini 1.5 Pro) dengan sistem grounding melalui unggahan file teks UU 1/2023 ke dalam sistem prompt/context window.

## 9. Penanganan Error & Non-Fungsional
Sistem akan menolak pertanyaan di luar topik hukum pidana. Kecepatan respon dipastikan < 5 detik untuk query standar.

## 10. Rencana Implementasi Bertahap
Fase 1: Pengembangan engine grounding dan dashboard utama. Fase 2: Integrasi fitur ekspor dokumen dan kalkulator sanksi. Fase 3: User testing dan optimasi Socratic method.