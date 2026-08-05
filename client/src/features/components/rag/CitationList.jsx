import { useState } from 'react';
import {
  FileText,
  Activity,
  FlaskConical,
  Stethoscope,
  Pill,
  StickyNote,
  ClipboardList,
  ShieldAlert,
  ChevronDown,
  Quote,
  Brain,
} from 'lucide-react';

const SOURCE_ICONS = {
  document_chunk: FileText,
  vital_signs: Activity,
  lab_results: FlaskConical,
  diagnoses: Stethoscope,
  medications: Pill,
  allergies: ShieldAlert,
  clinical_notes: StickyNote,
  nursing_notes: StickyNote,
  clinical_examinations: Stethoscope,
  follow_ups: ClipboardList,
  general_knowledge: Brain,
};

const VARIANTS = {
  light: {
    heading: 'text-muted-foreground',
    chip: 'border-border bg-muted/50 text-foreground hover:bg-muted',
    chipCited: 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15',
    panel: 'border-border bg-muted/30 text-muted-foreground',
    excerpt: 'text-muted-foreground',
  },
  brand: {
    heading: 'text-login-brand-muted',
    chip: 'border-login-brand-ring/40 bg-login-brand/40 text-login-brand-muted hover:bg-login-brand/60',
    chipCited:
      'border-primary/50 bg-primary/20 text-login-brand-foreground hover:bg-primary/30',
    panel: 'border-login-brand-ring/40 bg-login-brand/30 text-login-brand-muted',
    excerpt: 'text-login-brand-muted',
  },
};

/**
 * Renders the sources behind one AI answer.
 *
 * The backend returns everything it retrieved, flagging which entries the answer
 * text actually references (`cited: true`). Referenced sources are shown first
 * and highlighted; the rest stay available behind "show all" so a clinician can
 * see what the assistant considered and rule out a missed record.
 */
export function CitationList({ citations = [], variant = 'light', defaultExpandedId = null }) {
  const [expandedId, setExpandedId] = useState(defaultExpandedId);
  const [showAll, setShowAll] = useState(false);

  if (!Array.isArray(citations) || citations.length === 0) return null;

  const styles = VARIANTS[variant] || VARIANTS.light;
  const referenced = citations.filter((c) => c.cited);
  const others = citations.filter((c) => !c.cited);
  const visible = showAll ? [...referenced, ...others] : referenced.length > 0 ? referenced : citations.slice(0, 3);
  const hiddenCount = citations.length - visible.length;

  const expanded = visible.find((c) => (c.id || c.label) === expandedId);

  return (
    <div className="mt-2.5 pt-2.5 border-t border-current/10">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] font-bold uppercase tracking-wider mr-0.5 ${styles.heading}`}>
          {referenced.length > 0 ? 'Sources' : 'Retrieved'}
        </span>

        {visible.map((citation, index) => {
          const key = citation.id || citation.label || index;
          const Icon = SOURCE_ICONS[citation.type] || FileText;
          const isOpen = key === expandedId;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setExpandedId(isOpen ? null : key)}
              aria-expanded={isOpen}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-sans font-medium transition-colors max-w-[240px] ${
                citation.cited ? styles.chipCited : styles.chip
              }`}
              title={citation.label}
            >
              <Icon size={10} className="shrink-0" />
              <span className="truncate">{citation.label}</span>
              {typeof citation.score === 'number' && (
                <span className="font-tnum opacity-60 shrink-0">
                  {(citation.score * 100).toFixed(0)}%
                </span>
              )}
              <ChevronDown
                size={9}
                className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          );
        })}

        {hiddenCount > 0 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-sans font-medium transition-colors ${styles.chip}`}
          >
            +{hiddenCount} more retrieved
          </button>
        )}
      </div>

      {expanded && (
        <div className={`mt-2 rounded-lg border p-2.5 text-[11px] font-sans leading-relaxed ${styles.panel}`}>
          <div className="flex items-start gap-1.5">
            <Quote size={11} className="mt-0.5 shrink-0 opacity-50" />
            <div className="min-w-0">
              <p className={`whitespace-pre-wrap break-words ${styles.excerpt}`}>
                {expanded.excerpt || 'No excerpt available for this source.'}
              </p>
              {expanded.timestamp && (
                <p className="mt-1 font-tnum opacity-60">
                  Recorded {new Date(expanded.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitationList;
