/**
 * PDF text extraction using pdfjs-dist.
 * Uses dynamic import to lazy-load pdfjs-dist (~1.3MB) only when needed.
 */

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

/** Lazy-load pdfjs-dist and configure worker */
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

/**
 * Extract plain text content from a PDF file.
 * Uses pdfjs-dist for client-side extraction (no server required).
 */
export async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    pageTexts.push(pageText);
  }

  const fullText = pageTexts.join('\n\n');
  return stripNoise(fullText);
}

/**
 * Heuristic cleanup of extracted PDF text:
 * - Truncate at "References" / "Bibliography" section
 * - Remove common header/footer patterns (page numbers, running headers)
 * - Collapse excessive whitespace
 */
export function stripNoise(text: string): string {
  let cleaned = text;

  // Truncate at references section (common in academic papers)
  const refPatterns = [
    /\n\s*References\s*\n/i,
    /\n\s*Bibliography\s*\n/i,
    /\n\s*REFERENCES\s*\n/,
    /\n\s*参考文献\s*\n/,
  ];
  for (const pattern of refPatterns) {
    const match = pattern.exec(cleaned);
    if (match && match.index > cleaned.length * 0.3) {
      // Only truncate if the match is in the latter 70% of the document
      cleaned = cleaned.slice(0, match.index);
      break;
    }
  }

  // Remove isolated page numbers (lines that are just numbers)
  cleaned = cleaned.replace(/^\s*\d{1,4}\s*$/gm, '');

  // Collapse multiple spaces and normalize line breaks
  cleaned = cleaned.replace(/[ \t]{3,}/g, ' ');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned.trim();
}

/**
 * Validate that a file is a PDF before processing.
 */
export function isPDFFile(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}
