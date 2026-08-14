import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    lineHeight: 1.45,
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hospitalName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hospitalSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 1,
  },
  documentBadge: {
    backgroundColor: '#0f766e',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  documentBadgeText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  documentTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 6,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  metaItem: {
    width: '33.33%',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  metaValueBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  consultNoteBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  consultNoteHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#854d0e',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  consultNoteText: {
    fontSize: 8.5,
    color: '#713f12',
    lineHeight: 1.4,
  },
  contentContainer: {
    marginBottom: 14,
  },
  h1: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  h2: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f766e',
    marginTop: 8,
    marginBottom: 3,
  },
  h3: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginTop: 6,
    marginBottom: 2,
  },
  h4: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 5,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 8.5,
    marginBottom: 5,
    textAlign: 'justify',
    lineHeight: 1.45,
  },
  boldText: {
    fontFamily: 'Helvetica-Bold',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletPoint: {
    width: 10,
    fontSize: 8.5,
    color: '#0f766e',
    fontFamily: 'Helvetica-Bold',
  },
  listText: {
    flex: 1,
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: '#0f766e',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderRadius: 2,
  },
  blockquoteText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#475569',
  },
  table: {
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 18,
    alignItems: 'center',
  },
  tableHeaderRow: {
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tableCellLast: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 7.5,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textTransform: 'uppercase',
  },
  signatureSection: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginTop: 22,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 7,
    color: '#94a3b8',
  },
  confidentialText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
});

/**
 * Parses inline string into @react-pdf/renderer Text spans (supporting **bold**).
 */
function renderInlineSpans(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
}

/**
 * Converts structured AI Summary Markdown into @react-pdf/renderer PDF elements.
 */
function MarkdownPdfContent({ content }) {
  if (!content) {
    return <Text style={styles.paragraph}>No clinical summary content recorded.</Text>;
  }

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <Text key={i} style={styles.h1}>
          {trimmed.slice(2).replace(/\*\*/g, '')}
        </Text>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={i} style={styles.h2}>
          {trimmed.slice(3).replace(/\*\*/g, '')}
        </Text>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <Text key={i} style={styles.h3}>
          {trimmed.slice(4).replace(/\*\*/g, '')}
        </Text>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <Text key={i} style={styles.h4}>
          {trimmed.slice(5).replace(/\*\*/g, '')}
        </Text>
      );
      i++;
      continue;
    }

    // Bullet lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listRows = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        const itemText = lines[i].trim().slice(2);
        listRows.push(
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{renderInlineSpans(itemText)}</Text>
          </View>
        );
        i++;
      }
      elements.push(<View key={`list-${i}`} style={{ marginBottom: 4 }}>{listRows}</View>);
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const listRows = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const match = lines[i].trim().match(/^(\d+)\.\s(.*)$/);
        if (match) {
          listRows.push(
            <View key={i} style={styles.listItem}>
              <Text style={styles.bulletPoint}>{match[1]}.</Text>
              <Text style={styles.listText}>{renderInlineSpans(match[2])}</Text>
            </View>
          );
        }
        i++;
      }
      elements.push(<View key={`numlist-${i}`} style={{ marginBottom: 4 }}>{listRows}</View>);
      continue;
    }

    // Tables
    if (trimmed.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowLine = lines[i].trim();
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
          <View key={`table-${i}`} style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              {headerRow.map((cell, idx) => (
                <View key={idx} style={idx === headerRow.length - 1 ? styles.tableCellLast : styles.tableCell}>
                  <Text style={[styles.tableHeaderCell, { fontSize: 7 }]}>{cell.replace(/\*\*/g, '')}</Text>
                </View>
              ))}
            </View>
            {bodyRows.map((row, rIdx) => (
              <View key={rIdx} style={styles.tableRow}>
                {row.map((cell, cIdx) => (
                  <View key={cIdx} style={cIdx === row.length - 1 ? styles.tableCellLast : styles.tableCell}>
                    <Text>{renderInlineSpans(cell)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      }
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      elements.push(
        <View key={i} style={styles.blockquote}>
          <Text style={styles.blockquoteText}>{renderInlineSpans(trimmed.slice(2))}</Text>
        </View>
      );
      i++;
      continue;
    }

    // Standard Paragraph
    elements.push(
      <Text key={i} style={styles.paragraph}>
        {renderInlineSpans(trimmed)}
      </Text>
    );
    i++;
  }

  return <View style={styles.contentContainer}>{elements}</View>;
}

export function ConsultationSummaryPDF({
  summary,
  patient,
  admission,
  consultNote,
  authorName,
}) {
  const generatedDate = summary?.generatedAt || summary?.generated_at
    ? new Date(summary.generatedAt || summary.generated_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-US');

  const summaryContent = summary?.overallSummary || summary?.overall_summary || '';

  return (
    <Document
      title={`ICU_Consultation_${patient?.name?.replace(/\s+/g, '_') || 'Patient'}`}
      author={authorName || 'SmartCare ICU Specialist'}
      subject="ICU Clinical Consultation Summary"
      creator="SmartCare ICU Management Platform"
    >
      <Page size="A4" style={styles.page}>
        {/* Hospital Letterhead */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.hospitalName}>SmartCare ICU · Critical Care Medicine</Text>
              <Text style={styles.hospitalSub}>Department of Intensive Care & Emergency Life Support</Text>
            </View>
            <View style={styles.documentBadge}>
              <Text style={styles.documentBadgeText}>Clinical Consultation</Text>
            </View>
          </View>
          <Text style={styles.documentTitle}>CLINICAL CASE SUMMARY & CONSULTATION REPORT</Text>
        </View>

        {/* Patient Demographics Banner */}
        <View style={styles.metadataGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Patient Name</Text>
            <Text style={styles.metaValueBold}>{patient?.name || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>MRN / National ID</Text>
            <Text style={styles.metaValue}>{patient?.national_id || patient?.nationalId || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Age / Gender</Text>
            <Text style={styles.metaValue}>
              {patient?.age ? `${patient.age} Years` : '—'} · {patient?.gender || '—'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Bed Location</Text>
            <Text style={styles.metaValue}>
              {admission?.bed?.bed_number ? `Bed ${admission.bed.bed_number}` : 'ICU Bed Unit'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Attending Clinician</Text>
            <Text style={styles.metaValue}>{authorName || 'ICU Specialist'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Report Date & Time</Text>
            <Text style={styles.metaValue}>{generatedDate}</Text>
          </View>
        </View>

        {/* Specialist Consultation Note Box (if provided) */}
        {consultNote && consultNote.trim() ? (
          <View style={styles.consultNoteBox}>
            <Text style={styles.consultNoteHeader}>Specialist Consultation Request / Question:</Text>
            <Text style={styles.consultNoteText}>{consultNote.trim()}</Text>
          </View>
        ) : null}

        {/* AI Summary Markdown Content */}
        <MarkdownPdfContent content={summaryContent} />

        {/* Clinician Signature Section */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.metaLabel}>Attending ICU Physician Verification</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature & License ID</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.metaLabel}>Consulting Specialist Acknowledgment</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>External Reviewer Signature / Date</Text>
          </View>
        </View>

        {/* Footer (Fixed on every page) */}
        <View style={styles.footer} fixed>
          <Text style={styles.confidentialText}>
            CONFIDENTIAL MEDICAL RECORD · PROTECTED HEALTH INFORMATION (PHI)
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
