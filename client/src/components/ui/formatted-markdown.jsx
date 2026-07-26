import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

/**
 * Parses inline formatting like **bold**, ⚠ ABNORMAL, and code.
 */
function parseInline(text) {
  if (!text) return null;

  // Split by bold pattern **text**
  const parts = text.split(/(\*\*.*?\*\*|⚠\s*ABNORMAL|⚠)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part === '⚠ ABNORMAL' || part === '⚠') {
      return (
        <Badge
          key={index}
          variant="destructive"
          className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0 text-[10px] font-mono leading-none align-middle"
        >
          <AlertCircle className="h-2.5 w-2.5" />
          ABNORMAL
        </Badge>
      );
    }
    return part;
  });
}

/**
 * Clinical Markdown Renderer for AI Summaries.
 * Converts structured clinical Markdown strings into high-precision, semantic Shadcn components.
 */
export function FormattedMarkdown({ content }) {
  if (!content) {
    return <p className="text-muted-foreground text-sm italic">No summary content available.</p>;
  }

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Blank lines ──────────────────────────────────────────────────────────
    if (!trimmed) {
      i++;
      continue;
    }

    // ── Headers ──────────────────────────────────────────────────────────────
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="font-display text-2xl font-bold text-foreground mt-6 mb-3 border-b border-border pb-2">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="font-display text-lg font-bold text-primary mt-6 mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-display text-base font-semibold text-foreground mt-4 mb-2">
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className="font-sans text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1">
          {parseInline(trimmed.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // ── Bullet lists ─────────────────────────────────────────────────────────
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        const itemText = lines[i].trim().slice(2);
        listItems.push(
          <li key={i} className="text-sm font-sans text-foreground leading-relaxed flex items-start gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 mt-2 shrink-0" />
            <span className="flex-1">{parseInline(itemText)}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="space-y-1.5 my-2 pl-1">
          {listItems}
        </ul>
      );
      continue;
    }

    // ── Numbered lists ───────────────────────────────────────────────────────
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const match = lines[i].trim().match(/^(\d+)\.\s(.*)$/);
        if (match) {
          listItems.push(
            <li key={i} className="text-sm font-sans text-foreground leading-relaxed flex items-start gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground shrink-0 mt-0.5">{match[1]}.</span>
              <span className="flex-1">{parseInline(match[2])}</span>
            </li>
          );
        }
        i++;
      }
      elements.push(
        <ol key={`numlist-${i}`} className="space-y-1.5 my-2 pl-1">
          {listItems}
        </ol>
      );
      continue;
    }

    // ── Tables ───────────────────────────────────────────────────────────────
    if (trimmed.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowLine = lines[i].trim();
        // Ignore separator lines like |---|---|
        if (!/^\|[\s\-:|]+\|$/.test(rowLine)) {
          const cells = rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {headerRow.map((cell, idx) => (
                    <TableHead key={idx} className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {parseInline(cell)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bodyRows.map((row, rIdx) => (
                  <TableRow key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <TableCell key={cIdx} className="text-xs font-sans font-tnum">
                        {parseInline(cell)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }
      continue;
    }

    // ── Blockquotes ─────────────────────────────────────────────────────────
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="my-4 border-l-2 border-primary/40 pl-4 py-1.5 text-xs text-muted-foreground italic bg-muted/30 rounded-r-sm">
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // ── Standard Paragraph ───────────────────────────────────────────────────
    elements.push(
      <p key={i} className="text-sm font-sans text-foreground leading-relaxed my-2">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 text-foreground selection:bg-primary/20">{elements}</div>;
}
