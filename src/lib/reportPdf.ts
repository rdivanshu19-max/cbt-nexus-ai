import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportInput {
  studentName: string;
  testTitle: string;
  examType?: string | null;
  attemptDate: string; // ISO
  totalScore: number;
  maxMarks: number;
  accuracy: number;
  positive: number;
  negative: number;
  correct: number;
  wrong: number;
  unattempted: number;
  timeTakenSec: number;
  subjectStats: Array<{ subject: string; correct: number; wrong: number; unattempted: number; accuracy: number }>;
  weakTopics: Array<{ topic: string; subject?: string; accuracy: number; total: number }>;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

export function generateReportCard(r: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 50;

  // Header band
  doc.setFillColor(31, 41, 92);
  doc.rect(0, 0, W, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CBT NEXUS', 40, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('// PERFORMANCE REPORT CARD', 40, 60);
  doc.setFontSize(9);
  doc.text('nexuscbt.lovable.app', W - 40, 42, { align: 'right' });
  doc.text(new Date(r.attemptDate).toLocaleString(), W - 40, 60, { align: 'right' });

  y = 120;
  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(r.testTitle, 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 100);
  doc.text(`Student: ${r.studentName}${r.examType ? ' • ' + r.examType : ''}`, 40, y);
  y += 24;

  // Score badge
  doc.setFillColor(245, 240, 230);
  doc.roundedRect(40, y, W - 80, 80, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(31, 41, 92);
  doc.text(`${r.totalScore}`, 60, y + 50);
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 130);
  doc.text(`/ ${r.maxMarks}`, 60 + doc.getTextWidth(`${r.totalScore}`) + 6, y + 50);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 90);
  const stats = [
    ['Accuracy', `${r.accuracy}%`],
    ['Positive', `+${r.positive}`],
    ['Negative', `−${r.negative}`],
    ['Time', fmtTime(r.timeTakenSec)],
  ];
  let sx = W / 2;
  stats.forEach(([k, v], i) => {
    const cx = sx + (i % 2) * 110;
    const cy = y + 22 + Math.floor(i / 2) * 28;
    doc.setFont('helvetica', 'normal');
    doc.text(k, cx, cy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 92);
    doc.text(v, cx + 60, cy);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 90);
  });
  y += 100;

  // Question breakdown
  autoTable(doc, {
    startY: y,
    head: [['Correct', 'Wrong', 'Unattempted']],
    body: [[`${r.correct}`, `${r.wrong}`, `${r.unattempted}`]],
    theme: 'striped',
    headStyles: { fillColor: [31, 41, 92] },
    styles: { halign: 'center', fontSize: 11 },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 18;

  if (r.subjectStats.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 30);
    doc.text('Subject Breakdown', 40, y);
    y += 6;
    autoTable(doc, {
      startY: y + 4,
      head: [['Subject', 'Correct', 'Wrong', 'Unatt.', 'Accuracy']],
      body: r.subjectStats.map((s) => [s.subject, s.correct, s.wrong, s.unattempted, `${s.accuracy.toFixed(1)}%`]),
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 92] },
      styles: { fontSize: 10 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  if (r.weakTopics.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 30);
    doc.text('Weak Areas — focus next', 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [['Topic', 'Subject', 'Accuracy', 'Questions']],
      body: r.weakTopics.map((t) => [t.topic, t.subject || '—', `${t.accuracy.toFixed(0)}%`, `${t.total}`]),
      theme: 'striped',
      headStyles: { fillColor: [180, 60, 40] },
      styles: { fontSize: 10 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Suggestions
  const suggestions: string[] = [];
  if (r.accuracy < 40) suggestions.push('Revise core concepts before attempting more tests — accuracy is below 40%.');
  else if (r.accuracy < 65) suggestions.push('Solid base — drill weak areas and time-bound chapter tests.');
  else suggestions.push('Strong performance. Push to full-length mocks under exam conditions.');
  if (r.unattempted > r.correct) suggestions.push('Too many unattempted — practice intelligent guessing & time mgmt.');
  if (r.negative > r.positive * 0.3) suggestions.push('Negative marks high — be more selective when unsure.');
  if (r.timeTakenSec < r.correct * 30) suggestions.push('Very fast — re-verify final answers before submitting.');

  if (y > doc.internal.pageSize.getHeight() - 140) { doc.addPage(); y = 60; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 30);
  doc.text('Coach Notes', 40, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 70);
  suggestions.forEach((s) => {
    const lines = doc.splitTextToSize('• ' + s, W - 80);
    doc.text(lines, 40, y);
    y += lines.length * 14;
  });

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 225);
  doc.line(40, ph - 50, W - 40, ph - 50);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text('Generated by CBT Nexus — share your card with #CBTNexus', 40, ph - 30);
  doc.text('nexuscbt.lovable.app', W - 40, ph - 30, { align: 'right' });

  return doc;
}
