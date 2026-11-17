import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type {
  AnalysisRecord,
  BedahKataKunciResult,
  BedahPasalResult,
  KomparatorResult,
  SimulatorKasusResult,
} from '../types/kuhp.ts';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'analisis-kuhp'
  );
}

export function formatRecordAsMarkdown(record: AnalysisRecord): string {
  const res = record.result;
  const header = `# Klinik KUHP — Riset Hukum Pidana (UU No. 1 Tahun 2023 jo. UU No. 1 Tahun 2026)\nTopik: ${record.title}\nTanggal: ${new Date(record.createdAt).toLocaleString('id-ID')}\n\n`;
  const footer = `\n\n---\nAplikasi ini dibuat oleh M. Budi Mulyadi.`;

  if (res.kind === 'bedah-pasal') {
    const r = res as BedahPasalResult;
    const unsurMd = r.unsur
      .map((u, idx) => `${idx + 1}. [${u.kategori}] **${u.elemen}**: ${u.uraian} (Pembuktian: ${u.pembuktian})`)
      .join('\n');
    return (
      header +
      `## ${r.pasalNomor} — ${r.judulDelik}\n` +
      `Lokasi: ${r.bukuBab}\nJenis Delik: ${r.jenisDelik}\nAncaman Pidana: ${r.ancamanPidana}\n\n` +
      `### Bunyi Pasal\n${r.bunyiPasal}\n\n` +
      `### Unsur-Unsur Tindak Pidana\n${unsurMd}\n\n` +
      `### Penjelasan Otentik & Catatan Penerapan\n${r.penjelasanOtentik}\n\n` +
      r.catatanPenerapan.map((c) => `- ${c}`).join('\n') +
      footer
    );
  }

  if (res.kind === 'bedah-kata-kunci') {
    const r = res as BedahKataKunciResult;
    const pasalList = r.daftarPasal
      .map(
        (p, i) =>
          `${i + 1}. **${p.pasalNomor} — ${p.judul}**\n   - Ringkasan: ${p.ringkasanIsi}\n   - Ancaman Pidana: ${p.ancamanPidana}\n   - Relevansi: ${p.catatanRelevansi}`
      )
      .join('\n');
    const penting = r.halPenting.map((h, i) => `${i + 1}. ${h}`).join('\n');
    return (
      header +
      `## Ikhtisar Kata Kunci: ${r.kataKunci}\n` +
      `Dasar Klasifikasi: ${r.dasarKlasifikasi}\n\n` +
      `### Pengertian Yuridis\n${r.pengertianYuridis}\n\n` +
      `### Pasal-Pasal yang Memuat "${r.kataKunci}"\n${pasalList}\n\n` +
      `### Hal-Hal Penting yang Perlu Disampaikan\n${penting}` +
      footer
    );
  }

  if (res.kind === 'komparator') {
    const r = res as KomparatorResult;
    const rows = r.tabelPerbandingan
      .map(
        (row) =>
          `- **${row.aspek}**\n  - KUHP Baru (${r.pasalBaru}): ${row.kuhpBaru}\n  - KUHP Lama (${r.pasalLama}): ${row.kuhpLama}\n  - Implikasi: ${row.implikasiHukum}`
      )
      .join('\n');
    return (
      header +
      `## ${r.judulPerbandingan}\n` +
      `Perbandingan: ${r.pasalBaru} vs ${r.pasalLama}\n\n` +
      `### Ringkasan Pergeseran Norma\n${r.ringkasanPergeseran}\n\n` +
      `### Matriks Komparasi\n${rows}\n\n` +
      `### Asas Peralihan (Pasal 3 UU 1/2023 jo. UU 1/2026)\n${r.asasPeralihanPasal3}` +
      footer
    );
  }

  const r = res as SimulatorKasusResult;
  const evals = r.evaluasiUnsur
    .map((e, i) => `${i + 1}. **${e.unsur}** [${e.statusPemenuhan}]\n   - Fakta: ${e.faktaKasus}\n   - Analisis: ${e.analisis}`)
    .join('\n');
  return (
    header +
    `## Analisis Kasus Pidana (Case Solver)\n` +
    `Pasal Terkait: ${r.pasalTerkait.join(', ')}\n\n` +
    `### Ringkasan Fakta\n${r.ringkasanFakta}\n\n` +
    `### Evaluasi Pemenuhan Unsur\n${evals}\n\n` +
    `### Alasan Penghapus Pidana\n${r.alasanPenghapusPidana}\n\n` +
    `### Kualifikasi & Kesimpulan Akademis\n${r.rekomendasiKualifikasi}\n\n${r.kesimpulanAkademis}` +
    footer
  );
}

export function exportRecordAsPDF(record: AnalysisRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 52) {
      doc.addPage();
      y = 52;
    }
  };

  // Header Academic Banner
  doc.setFillColor(10, 20, 74); // Navy Blue
  doc.rect(0, 0, pageWidth, 64, 'F');
  doc.setFillColor(255, 215, 0); // Gold hairline
  doc.rect(0, 64, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('KLINIK KUHP — UU NO. 1 TAHUN 2023 JO. UU NO. 1 TAHUN 2026', margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(225, 230, 245);
  doc.text(
    `Dokumen Analisis Akademis · ${new Date(record.createdAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    margin,
    49
  );

  y = 92;
  doc.setTextColor(17, 24, 39);

  const addHeading = (text: string) => {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 128);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * 16 + 4;
    doc.setTextColor(17, 24, 39);
  };

  const addBody = (text: string, boldPrefix?: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const full = boldPrefix ? `${boldPrefix}: ${text}` : text;
    const lines = doc.splitTextToSize(full, maxWidth);
    for (const line of lines) {
      ensureSpace(15);
      doc.text(line, margin, y);
      y += 14;
    }
    y += 4;
  };

  addHeading(record.title);

  const res = record.result;
  if (res.kind === 'bedah-pasal') {
    addBody(res.bukuBab, 'Sistematika');
    addBody(res.jenisDelik, 'Jenis Delik');
    addBody(res.ancamanPidana, 'Ancaman Pidana');
    addHeading('Bunyi Pasal Otentik (UU 1/2023 jo. UU 1/2026)');
    addBody(res.bunyiPasal);
    addHeading('Bedah Unsur Objektif & Subjektif');
    for (const u of res.unsur) {
      addBody(`${u.uraian} (Pembuktian: ${u.pembuktian})`, `[${u.kategori}] ${u.elemen}`);
    }
    addHeading('Penjelasan Otentik');
    addBody(res.penjelasanOtentik);
    if (res.catatanPenerapan.length > 0) {
      addHeading('Catatan Penerapan');
      res.catatanPenerapan.forEach((c, idx) => addBody(`${idx + 1}. ${c}`));
    }
  } else if (res.kind === 'bedah-kata-kunci') {
    addBody(res.dasarKlasifikasi, 'Dasar Klasifikasi');
    addHeading('Pengertian Yuridis');
    addBody(res.pengertianYuridis);
    addHeading(`Pasal-Pasal yang Memuat "${res.kataKunci}"`);
    for (const p of res.daftarPasal) {
      addBody(`${p.ringkasanIsi} | Ancaman: ${p.ancamanPidana} | Catatan: ${p.catatanRelevansi}`, `${p.pasalNomor} — ${p.judul}`);
    }
    if (res.halPenting.length > 0) {
      addHeading('Hal-Hal Penting');
      res.halPenting.forEach((h, idx) => addBody(`${idx + 1}. ${h}`));
    }
  } else if (res.kind === 'komparator') {
    addBody(`${res.pasalBaru} vs ${res.pasalLama}`, 'Objek Komparasi');
    addHeading('Ringkasan Pergeseran Paradigma');
    addBody(res.ringkasanPergeseran);
    addHeading('Matriks Perbandingan');
    for (const row of res.tabelPerbandingan) {
      addBody(
        `KUHP Baru: ${row.kuhpBaru} | KUHP Lama (WvS): ${row.kuhpLama} | Implikasi: ${row.implikasiHukum}`,
        row.aspek
      );
    }
    addHeading('Asas Peralihan (Pasal 3 UU 1/2023 jo. UU 1/2026)');
    addBody(res.asasPeralihanPasal3);
  } else {
    addBody(res.pasalTerkait.join(', '), 'Rujukan Pasal');
    addHeading('Ringkasan Fakta');
    addBody(res.ringkasanFakta);
    addHeading('Evaluasi Unsur Tindak Pidana');
    for (const ev of res.evaluasiUnsur) {
      addBody(`Status: ${ev.statusPemenuhan}. Fakta: ${ev.faktaKasus}. Analisis: ${ev.analisis}`, ev.unsur);
    }
    addHeading('Alasan Penghapus Pidana');
    addBody(res.alasanPenghapusPidana);
    addHeading('Kualifikasi & Kesimpulan Akademis');
    addBody(res.rekomendasiKualifikasi, 'Kualifikasi');
    addBody(res.kesimpulanAkademis);
  }

  ensureSpace(24);
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Aplikasi ini dibuat oleh M. Budi Mulyadi.', margin, pageHeight - 28);

  doc.save(`${sanitizeFilename(record.title)}.pdf`);
}

export async function exportRecordAsDocx(record: AnalysisRecord): Promise<void> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: 'KLINIK KUHP — UU NO. 1 TAHUN 2023 JO. UU NO. 1 TAHUN 2026',
          bold: true,
          color: '000080',
          size: 22,
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: record.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Diunduh pada ${new Date(record.createdAt).toLocaleString('id-ID')}`,
          italics: true,
          color: '6B7280',
          size: 18,
        }),
      ],
      spacing: { after: 240 },
    }),
  ];

  const addSectionTitle = (title: string) => {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
  };

  const addPara = (text: string, label?: string) => {
    children.push(
      new Paragraph({
        children: label
          ? [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text })]
          : [new TextRun({ text })],
        spacing: { after: 100 },
      })
    );
  };

  const res = record.result;
  if (res.kind === 'bedah-pasal') {
    addPara(res.bukuBab, 'Sistematika');
    addPara(res.jenisDelik, 'Kualifikasi Delik');
    addPara(res.ancamanPidana, 'Ancaman Sanksi');
    addSectionTitle('Bunyi Pasal Otentik');
    addPara(res.bunyiPasal);

    addSectionTitle('Tabel Unsur Objektif & Subjektif');
    const tableRows = [
      new TableRow({
        children: ['Kategori', 'Unsur', 'Uraian & Pembuktian'].map(
          (h) =>
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            })
        ),
      }),
      ...res.unsur.map(
        (u) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(u.kategori)] }),
              new TableCell({ children: [new Paragraph(u.elemen)] }),
              new TableCell({ children: [new Paragraph(`${u.uraian} (Pembuktian: ${u.pembuktian})`)] }),
            ],
          })
      ),
    ];
    children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));

    addSectionTitle('Penjelasan Otentik');
    addPara(res.penjelasanOtentik);
    if (res.catatanPenerapan.length > 0) {
      addSectionTitle('Catatan Penerapan');
      res.catatanPenerapan.forEach((c, i) => addPara(`${i + 1}. ${c}`));
    }
  } else if (res.kind === 'bedah-kata-kunci') {
    addPara(res.dasarKlasifikasi, 'Dasar Klasifikasi');
    addSectionTitle('Pengertian Yuridis');
    addPara(res.pengertianYuridis);
    addSectionTitle(`Daftar Pasal Memuat "${res.kataKunci}"`);
    const rows = [
      new TableRow({
        children: ['Pasal', 'Judul & Ringkasan', 'Ancaman Pidana', 'Relevansi'].map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            })
        ),
      }),
      ...res.daftarPasal.map(
        (p) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(p.pasalNomor)] }),
              new TableCell({ children: [new Paragraph(`${p.judul} — ${p.ringkasanIsi}`)] }),
              new TableCell({ children: [new Paragraph(p.ancamanPidana)] }),
              new TableCell({ children: [new Paragraph(p.catatanRelevansi)] }),
            ],
          })
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    if (res.halPenting.length > 0) {
      addSectionTitle('Hal-Hal Penting');
      res.halPenting.forEach((h, i) => addPara(`${i + 1}. ${h}`));
    }
  } else if (res.kind === 'komparator') {
    addPara(`${res.pasalBaru} vs ${res.pasalLama}`, 'Objek Komparasi');
    addSectionTitle('Ringkasan Pergeseran Norma');
    addPara(res.ringkasanPergeseran);
    addSectionTitle('Tabel Komparasi');
    const rows = [
      new TableRow({
        children: ['Aspek', 'UU 1/2023 jo. UU 1/2026', 'WvS jo. UU 1/1946', 'Implikasi'].map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            })
        ),
      }),
      ...res.tabelPerbandingan.map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(row.aspek)] }),
              new TableCell({ children: [new Paragraph(row.kuhpBaru)] }),
              new TableCell({ children: [new Paragraph(row.kuhpLama)] }),
              new TableCell({ children: [new Paragraph(row.implikasiHukum)] }),
            ],
          })
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    addSectionTitle('Asas Peralihan (Pasal 3)');
    addPara(res.asasPeralihanPasal3);
  } else {
    addPara(res.pasalTerkait.join(', '), 'Pasal Rujukan');
    addSectionTitle('Ringkasan Fakta');
    addPara(res.ringkasanFakta);
    addSectionTitle('Evaluasi Pemenuhan Unsur');
    res.evaluasiUnsur.forEach((ev) => {
      addPara(`Status: ${ev.statusPemenuhan}. Fakta: ${ev.faktaKasus}. Analisis: ${ev.analisis}`, ev.unsur);
    });
    addSectionTitle('Alasan Penghapus Pidana');
    addPara(res.alasanPenghapusPidana);
    addSectionTitle('Kesimpulan Akademis');
    addPara(res.rekomendasiKualifikasi, 'Kualifikasi');
    addPara(res.kesimpulanAkademis);
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Aplikasi ini dibuat oleh M. Budi Mulyadi.',
          italics: true,
          color: '6B7280',
          size: 18,
        }),
      ],
      spacing: { before: 280 },
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${sanitizeFilename(record.title)}.docx`);
}
