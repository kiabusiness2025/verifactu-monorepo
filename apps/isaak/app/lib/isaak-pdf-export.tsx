// PDF export builder using @react-pdf/renderer.
// Generates a formatted PDF from ledger rows (same data as Excel).

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

export type PdfReportInput = {
  title: string;
  tenantName: string;
  tenantNif: string;
  period: { from: string; to: string; label?: string };
  headers: string[];
  rows: string[][];
  summary?: string;
};

const s = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', fontSize: 10 },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0b2060',
  },
  title: { fontSize: 16, color: '#0b2060', marginBottom: 4 },
  meta: { fontSize: 9, color: '#64748b', marginBottom: 2 },
  table: { marginTop: 14 },
  thead: { flexDirection: 'row', backgroundColor: '#0b2060' },
  theadCell: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  trow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  trowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8faff',
  },
  tcell: { flex: 1, padding: '4 6', fontSize: 8, color: '#1e293b' },
  summary: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#f0f4ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2361d8',
  },
  summaryText: { fontSize: 9, color: '#1e3a8a', lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

function PdfDoc({ title, tenantName, tenantNif, period, headers, rows, summary }: PdfReportInput) {
  const now = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const periodStr = period.label ?? `${period.from} – ${period.to}`;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.meta}>
            {tenantName}
            {tenantNif ? ` — NIF: ${tenantNif}` : ''}
          </Text>
          <Text style={s.meta}>Periodo: {periodStr}</Text>
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.thead}>
            {headers.map((h, i) => (
              <Text key={i} style={s.theadCell}>
                {h}
              </Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={ri % 2 === 0 ? s.trow : s.trowAlt}>
              {row.map((cell, ci) => (
                <Text key={ci} style={s.tcell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Summary */}
        {summary && (
          <View style={s.summary}>
            <Text style={s.summaryText}>{summary}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>Generado por Isaak · {now}</Text>
      </Page>
    </Document>
  );
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function buildPdfReport(input: PdfReportInput): Promise<Buffer> {
  const instance = pdf(<PdfDoc {...input} />);
  const result = await instance.toBuffer();
  // @react-pdf/renderer v4+ toBuffer() returns a ReadableStream<Uint8Array>
  if (result instanceof ReadableStream) {
    return streamToBuffer(result as ReadableStream<Uint8Array>);
  }
  return Buffer.from(result as unknown as ArrayBuffer);
}
