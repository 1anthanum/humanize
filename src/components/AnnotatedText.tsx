import type { Highlight } from '@/types';

interface AnnotatedTextProps {
  text: string;
  highlights: Highlight[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders text with highlighted spans.
 * Uses dangerouslySetInnerHTML for performance with large texts,
 * but all content is properly escaped.
 */
export function AnnotatedText({ text, highlights }: AnnotatedTextProps) {
  const parts: string[] = [];
  let pos = 0;

  for (const h of highlights) {
    if (h.start > pos) {
      parts.push(escapeHtml(text.slice(pos, h.start)));
    }
    parts.push(
      `<span class="highlight highlight-${h.type}" data-tip="${escapeHtml(h.tip)}" tabindex="0">${escapeHtml(text.slice(h.start, h.end))}</span>`,
    );
    pos = h.end;
  }

  if (pos < text.length) {
    parts.push(escapeHtml(text.slice(pos)));
  }

  return (
    <div
      className="annotated-text"
      dangerouslySetInnerHTML={{ __html: parts.join('') }}
      role="document"
      aria-label="Annotated text with highlighted AI patterns"
    />
  );
}
