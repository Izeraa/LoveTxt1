export type EditorFont = 'mono' | 'sans' | 'serif';
export type LineEnding = 'LF' | 'CRLF';
export type ThemeMode = 'light' | 'dark';

export interface TxtDocument {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  hasDiskHandle?: boolean;
}

export interface EditorSettings {
  font: EditorFont;
  fontSize: number;
  zoom: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  lineEnding: LineEnding;
  theme: ThemeMode;
  tabSize: number;
}

export interface TextMetrics {
  lines: number;
  words: number;
  chars: number;
  bytes: number;
}

export type TransformAction =
  | 'uppercase'
  | 'lowercase'
  | 'capitalizeLines'
  | 'sortAsc'
  | 'sortDesc'
  | 'removeDuplicateLines'
  | 'removeEmptyLines'
  | 'trimTrailingSpaces'
  | 'insertDateTime';

export interface SearchMatch {
  start: number;
  end: number;
}
