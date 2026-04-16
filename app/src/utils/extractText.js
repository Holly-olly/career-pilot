/**
 * Shared text extractors — used by CVManager and NewAnalysis.
 * Supports PDF, DOCX, TXT, RTF.
 */
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

export async function extractDocxText(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.replace(/[ \t]{2,}/g, ' ').trim();
}

export async function extractRtfText(file) {
  const raw = await file.text();
  return raw
    .replace(/\{\\[^{}]*\}/g, ' ')
    .replace(/\\[a-z*]+[-\d]* ?/gi, ' ')
    .replace(/[{}\\]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf')  return extractPdfText(file);
  if (ext === 'docx') return extractDocxText(file);
  if (ext === 'txt')  return file.text();
  if (ext === 'rtf')  return extractRtfText(file);
  throw new Error(`Unsupported format: .${ext}`);
}

export const ACCEPT = '.pdf,.docx,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,text/rtf';
