import { LineEnding, SearchMatch, TextMetrics, TransformAction } from '../types/editor';

export function ensureTxtExtension(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return 'sem-titulo.txt';
  if (trimmed.toLowerCase().endsWith('.txt')) {
    return trimmed;
  }
  return `${trimmed}.txt`;
}

export function countMetrics(text: string): TextMetrics {
  const lines = text.length === 0 ? 1 : text.split(/\r\n|\r|\n/).length;
  const trimmed = text.trim();
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  const chars = text.length;
  const bytes = new TextEncoder().encode(text).length;

  return { lines, words, chars, bytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getCursorPosition(
  text: string,
  selectionStart: number
): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(selectionStart, text.length));
  const before = text.slice(0, clamped);
  const splitLines = before.split(/\r\n|\r|\n/);
  const line = splitLines.length;
  const col = splitLines[splitLines.length - 1].length + 1;
  return { line, col };
}

export function findAllMatches(
  text: string,
  query: string,
  caseSensitive: boolean
): SearchMatch[] {
  if (!query) return [];
  const matches: SearchMatch[] = [];
  const source = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();

  let index = 0;
  while (index <= source.length - needle.length) {
    const found = source.indexOf(needle, index);
    if (found === -1) break;
    matches.push({ start: found, end: found + needle.length });
    index = found + Math.max(1, needle.length);
  }
  return matches;
}

export function applyTextTransform(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  action: TransformAction
): { newText: string; newStart: number; newEnd: number } {
  if (action === 'insertDateTime') {
    const stamp = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());
    const newText =
      text.slice(0, selectionStart) + stamp + text.slice(selectionEnd);
    const cursor = selectionStart + stamp.length;
    return { newText, newStart: cursor, newEnd: cursor };
  }

  const hasSelection = selectionEnd > selectionStart;
  const target = hasSelection ? text.slice(selectionStart, selectionEnd) : text;

  let transformed = target;

  switch (action) {
    case 'uppercase':
      transformed = target.toUpperCase();
      break;
    case 'lowercase':
      transformed = target.toLowerCase();
      break;
    case 'capitalizeLines':
      transformed = target
        .split('\n')
        .map((line) =>
          line.length > 0 ? line.charAt(0).toUpperCase() + line.slice(1) : line
        )
        .join('\n');
      break;
    case 'sortAsc':
      transformed = target
        .split('\n')
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
        .join('\n');
      break;
    case 'sortDesc':
      transformed = target
        .split('\n')
        .sort((a, b) => b.localeCompare(a, 'pt-BR', { sensitivity: 'base' }))
        .join('\n');
      break;
    case 'removeDuplicateLines': {
      const seen = new Set<string>();
      transformed = target
        .split('\n')
        .filter((line) => {
          if (seen.has(line)) return false;
          seen.add(line);
          return true;
        })
        .join('\n');
      break;
    }
    case 'removeEmptyLines':
      transformed = target
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .join('\n');
      break;
    case 'trimTrailingSpaces':
      transformed = target
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/g, ''))
        .join('\n');
      break;
  }

  if (hasSelection) {
    const newText =
      text.slice(0, selectionStart) + transformed + text.slice(selectionEnd);
    return {
      newText,
      newStart: selectionStart,
      newEnd: selectionStart + transformed.length,
    };
  }

  return {
    newText: transformed,
    newStart: 0,
    newEnd: 0,
  };
}

export function normalizeLineEndings(
  text: string,
  lineEnding: LineEnding
): string {
  const lf = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return lineEnding === 'CRLF' ? lf.replace(/\n/g, '\r\n') : lf;
}

export function downloadTxtFile(
  filename: string,
  content: string,
  lineEnding: LineEnding
): void {
  const safeName = ensureTxtExtension(filename);
  const normalized = normalizeLineEndings(content, lineEnding);
  const blob = new Blob([normalized], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function formatRelativeTime(timestamp: number): string {
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 10) return 'agora';
  if (diffSeconds < 60) return `há ${diffSeconds}s`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
}

export const STARTER_DOCUMENT_CONTENT = `Bem-vindo ao loveTxt

Um espaço calmo e direto para escrever, editar e organizar arquivos .txt sem distrações.

O que você pode fazer por aqui:
- Criar e alternar entre vários documentos .txt na barra lateral
- Arrastar e soltar qualquer arquivo .txt direto no editor para abrir
- Usar Localizar e Substituir (Ctrl+F) para ajustes rápidos
- Ordenar linhas, remover duplicadas ou alternar entre Mono, Sans e Serifa
- Salvar no navegador automaticamente e baixar em .txt quando quiser

Comece apagando estas linhas ou crie um novo arquivo acima.
`;
