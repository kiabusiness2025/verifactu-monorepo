// V1.5.2 — Builder PDF para exportar una conversación con Isaak.
//
// Diferente del buildPdfReport (tablas): este renderiza mensajes en
// formato chat (usuario alineado izquierda, asistente con avatar y
// fondo sutil). Texto plano — no intenta renderizar markdown.

import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

export type ConversationPdfInput = {
  title: string;
  tenantName: string;
  generatedAt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
  }>;
};

const COLORS = {
  brand: '#2361d8',
  brandDark: '#011c67',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  userBg: '#f0f5ff',
  assistantBg: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.text,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.brandDark,
  },
  brandSubtitle: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  meta: {
    textAlign: 'right',
    fontSize: 9,
    color: COLORS.textMuted,
  },
  conversationTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.brandDark,
    marginTop: 18,
    marginBottom: 16,
  },
  message: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 6,
  },
  userMessage: {
    backgroundColor: COLORS.userBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brand,
  },
  assistantMessage: {
    backgroundColor: COLORS.assistantBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  assistantRoleLabel: {
    color: COLORS.brandDark,
  },
  messageText: {
    fontSize: 10,
    lineHeight: 1.55,
    color: COLORS.text,
  },
  timestamp: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.textMuted,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

// Strip fences ``` y código bloqueado del texto — no se renderiza bien
// como bloque en PDF y queda ruidoso. Para charts dejamos un placeholder.
function cleanContent(raw: string): string {
  let out = raw;
  // Reemplaza isaak-chart por placeholder
  out = out.replace(/```isaak-chart[\s\S]*?```/g, '[Gráfico embebido — visible en isaak.chat]');
  // Quita otros fences manteniendo el contenido
  out = out.replace(/```[a-z-]*\n?/g, '');
  out = out.replace(/```/g, '');
  // Limpia markdown básico que se ve raro plano
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/`([^`]+)`/g, '$1');
  // Comprime líneas vacías
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export async function buildConversationPdf(input: ConversationPdfInput): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabecera con branding */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTitle}>Isaak</Text>
            <Text style={styles.brandSubtitle}>Conversación exportada</Text>
          </View>
          <View>
            <Text style={styles.meta}>{input.tenantName}</Text>
            <Text style={styles.meta}>Generado: {input.generatedAt}</Text>
          </View>
        </View>

        {/* Título de la conversación */}
        <Text style={styles.conversationTitle}>{input.title}</Text>

        {/* Mensajes */}
        {input.messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const ts = formatDate(msg.createdAt);
          return (
            <View
              key={i}
              style={[styles.message, isUser ? styles.userMessage : styles.assistantMessage]}
              wrap
            >
              <Text style={[styles.roleLabel, ...(isUser ? [] : [styles.assistantRoleLabel])]}>
                {isUser ? 'Tú' : 'Isaak'}
                {ts ? ` · ${ts}` : ''}
              </Text>
              <Text style={styles.messageText}>{cleanContent(msg.content)}</Text>
            </View>
          );
        })}

        {/* Footer paginado */}
        <View style={styles.footer} fixed>
          <Text>Isaak — isaak.chat</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

export function conversationPdfFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'conversacion';
  const date = new Date().toISOString().slice(0, 10);
  return `isaak_conversacion_${slug}_${date}.pdf`;
}
