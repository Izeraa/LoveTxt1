import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  ListOrdered,
  Minimize2,
  Moon,
  Redo2,
  Sun,
  Undo2,
  WrapText,
} from 'lucide-react';
import { BrandIcon } from './BrandIcon';
import {
  EditorFont,
  EditorSettings,
  SearchMatch,
  TextMetrics,
  TransformAction,
  TxtDocument,
} from '../types/editor';
import {
  ensureTxtExtension,
  formatBytes,
  getCursorPosition,
} from '../utils/txtHelpers';
import { FindReplaceBar } from './FindReplaceBar';
import { ToolsMenu } from './ToolsMenu';
import { ZoomMenu } from './ZoomMenu';

interface EditorCanvasProps {
  document: TxtDocument;
  settings: EditorSettings;
  metrics: TextMetrics;
  isFocusMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  lastSavedAt: number;
  // Find & replace props
  findOpen: boolean;
  findQuery: string;
  replaceQuery: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  currentMatchIndex: number;
  onFindQueryChange: (val: string) => void;
  onReplaceQueryChange: (val: string) => void;
  onToggleCaseSensitive: () => void;
  onFindPrev: () => void;
  onFindNext: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onCloseFind: () => void;
  // Document actions
  onContentChange: (content: string) => void;
  onRename: (newName: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTransform: (
    action: TransformAction,
    selectionStart: number,
    selectionEnd: number
  ) => { newStart: number; newEnd: number };
  onUpdateSettings: (partial: Partial<EditorSettings>) => void;
  onExitFocusMode: () => void;
  onDropFiles: (files: FileList) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const FONT_LABELS: Record<EditorFont, string> = {
  mono: 'Mono',
  sans: 'Sans',
  serif: 'Serifa',
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  document: doc,
  settings,
  metrics,
  isFocusMode,
  canUndo,
  canRedo,
  lastSavedAt,
  findOpen,
  findQuery,
  replaceQuery,
  caseSensitive,
  matches,
  currentMatchIndex,
  onFindQueryChange,
  onReplaceQueryChange,
  onToggleCaseSensitive,
  onFindPrev,
  onFindNext,
  onReplaceOne,
  onReplaceAll,
  onCloseFind,
  onContentChange,
  onRename,
  onUndo,
  onRedo,
  onTransform,
  onUpdateSettings,
  onExitFocusMode,
  onDropFiles,
  textareaRef,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(doc.name);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lineHeights, setLineHeights] = useState<number[]>([]);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftTitle(doc.name);
    setIsEditingTitle(false);
  }, [doc.id, doc.name]);

  useEffect(() => {
    if (isEditingTitle) {
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
        const dotIndex = draftTitle.toLowerCase().lastIndexOf('.txt');
        if (dotIndex > 0) {
          titleInputRef.current?.setSelectionRange(0, dotIndex);
        } else {
          titleInputRef.current?.select();
        }
      });
    }
  }, [isEditingTitle]);

  const commitTitle = () => {
    const finalName = ensureTxtExtension(draftTitle);
    setDraftTitle(finalName);
    setIsEditingTitle(false);
    if (finalName !== doc.name) {
      onRename(finalName);
    }
  };

  const syncSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setSelection({
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    });
  }, [textareaRef]);

  const cursorPos = useMemo(
    () => getCursorPosition(doc.content, selection.start),
    [doc.content, selection.start]
  );

  const lines = useMemo(() => doc.content.split(/\r\n|\r|\n/), [doc.content]);
  const zoom = settings.zoom ?? 100;
  const effectiveFontSize = Math.max(
    10,
    Math.min(40, Math.round(settings.fontSize * (zoom / 100)))
  );
  const lineHeightPx = Math.round(effectiveFontSize * 1.65);

  const fontClass = useMemo(() => {
    switch (settings.font) {
      case 'mono':
        return 'font-mono-txt';
      case 'serif':
        return 'font-display';
      default:
        return 'font-sans-ui';
    }
  }, [settings.font]);

  // Measure wrapped line heights accurately when line numbers + word wrap are both enabled
  const measureLineHeights = useCallback(() => {
    if (
      !settings.showLineNumbers ||
      !settings.wordWrap ||
      lines.length > 1500 ||
      !mirrorRef.current
    ) {
      setLineHeights([]);
      return;
    }
    const children = mirrorRef.current.children;
    const heights: number[] = [];
    for (let i = 0; i < children.length; i++) {
      heights.push((children[i] as HTMLElement).getBoundingClientRect().height);
    }
    setLineHeights(heights);
  }, [settings.showLineNumbers, settings.wordWrap, lines.length]);

  useLayoutEffect(() => {
    measureLineHeights();
  }, [
    measureLineHeights,
    doc.content,
    settings.font,
    effectiveFontSize,
    isFocusMode,
  ]);

  useEffect(() => {
    if (!textareaRef.current || !settings.showLineNumbers || !settings.wordWrap)
      return;
    const observer = new ResizeObserver(() => {
      measureLineHeights();
    });
    observer.observe(textareaRef.current);
    return () => observer.disconnect();
  }, [
    textareaRef,
    settings.showLineNumbers,
    settings.wordWrap,
    measureLineHeights,
  ]);

  const handleScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const indent = ' '.repeat(settings.tabSize);

      if (start === end && !e.shiftKey) {
        const nextContent =
          doc.content.slice(0, start) + indent + doc.content.slice(end);
        onContentChange(nextContent);
        requestAnimationFrame(() => {
          el.setSelectionRange(start + indent.length, start + indent.length);
          syncSelection();
        });
        return;
      }

      // Multi-line indent / unindent
      const lineStart = doc.content.lastIndexOf('\n', start - 1) + 1;
      const lineEndIdx = doc.content.indexOf('\n', end);
      const lineEnd = lineEndIdx === -1 ? doc.content.length : lineEndIdx;
      const block = doc.content.slice(lineStart, lineEnd);
      const blockLines = block.split('\n');

      let deltaStart = 0;
      let deltaTotal = 0;

      const updatedLines = blockLines.map((line, idx) => {
        if (e.shiftKey) {
          const match = line.match(
            new RegExp(`^( {1,${settings.tabSize}}|\t)`)
          );
          if (match) {
            const removed = match[0].length;
            if (idx === 0) deltaStart = -removed;
            deltaTotal -= removed;
            return line.slice(removed);
          }
          return line;
        } else {
          if (idx === 0) deltaStart = indent.length;
          deltaTotal += indent.length;
          return indent + line;
        }
      });

      const nextContent =
        doc.content.slice(0, lineStart) +
        updatedLines.join('\n') +
        doc.content.slice(lineEnd);

      onContentChange(nextContent);
      requestAnimationFrame(() => {
        const nextStart = Math.max(lineStart, start + deltaStart);
        const nextEnd = Math.max(nextStart, end + deltaTotal);
        el.setSelectionRange(nextStart, nextEnd);
        syncSelection();
      });
    }
  };

  const handleTransformClick = (action: TransformAction) => {
    const el = textareaRef.current;
    const start = el ? el.selectionStart : selection.start;
    const end = el ? el.selectionEnd : selection.end;
    const { newStart, newEnd } = onTransform(action, start, end);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newStart, newEnd);
        syncSelection();
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  const savedTimeFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(lastSavedAt));
  }, [lastSavedAt]);

  return (
    <section
      aria-label="Área de edição"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-[#141416]"
    >
      {/* Drag & drop overlay */}
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-rose-500 bg-rose-50/90 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100">
          <BrandIcon size="lg" />
          <p className="text-sm font-semibold">
            Solte o arquivo .txt para abrir no loveTxt
          </p>
        </div>
      )}

      {/* Workspace Sub-Toolbar */}
      {!isFocusMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-[#FAF9F6] px-4 py-2 dark:border-zinc-800 dark:bg-[#18181B]">
          {/* Left: Editable filename + Undo/Redo */}
          <div className="flex min-w-0 items-center gap-3">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitTitle();
                  } else if (e.key === 'Escape') {
                    setDraftTitle(doc.name);
                    setIsEditingTitle(false);
                  }
                }}
                aria-label="Nome do arquivo"
                className="w-48 rounded border border-rose-500 bg-white px-2 py-0.5 font-mono-txt text-xs font-medium text-zinc-900 focus:outline-none dark:bg-zinc-900 dark:text-zinc-100 sm:w-64"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                title="Clique para renomear o arquivo"
                className="max-w-56 truncate rounded px-1.5 py-0.5 font-mono-txt text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:max-w-xs"
              >
                {doc.name}
              </button>
            )}

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Desfazer (Ctrl+Z)"
                aria-label="Desfazer"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-200/70 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Refazer (Ctrl+Shift+Z)"
                aria-label="Refazer"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-200/70 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Typography, View Options, Tools, Theme */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented font control */}
            <div
              role="group"
              aria-label="Estilo da fonte"
              className="flex items-center rounded-md bg-zinc-200/70 p-0.5 dark:bg-zinc-800"
            >
              {(['mono', 'sans', 'serif'] as EditorFont[]).map((fontKey) => (
                <button
                  key={fontKey}
                  type="button"
                  onClick={() => onUpdateSettings({ font: fontKey })}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    settings.font === fontKey
                      ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-700 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {FONT_LABELS[fontKey]}
                </button>
              ))}
            </div>

            {/* Zoom magnifying glass menu */}
            <ZoomMenu
              zoom={zoom}
              onZoomIn={() =>
                onUpdateSettings({ zoom: Math.min(200, zoom + 10) })
              }
              onZoomOut={() =>
                onUpdateSettings({ zoom: Math.max(50, zoom - 10) })
              }
              onResetZoom={() => onUpdateSettings({ zoom: 100 })}
            />

            {/* Line numbers & Word wrap */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  showLineNumbers: !settings.showLineNumbers,
                })
              }
              aria-pressed={settings.showLineNumbers}
              title="Mostrar ou ocultar números de linha"
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.showLineNumbers
                  ? 'bg-zinc-200/90 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Linhas</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ wordWrap: !settings.wordWrap })
              }
              aria-pressed={settings.wordWrap}
              title="Alternar quebra automática de linha"
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                settings.wordWrap
                  ? 'bg-zinc-200/90 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
              }`}
            >
              <WrapText className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Quebra</span>
            </button>

            <ToolsMenu
              hasSelection={selection.end > selection.start}
              onTransform={handleTransformClick}
            />

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  theme: settings.theme === 'light' ? 'dark' : 'light',
                })
              }
              title={
                settings.theme === 'light'
                  ? 'Mudar para tema noturno'
                  : 'Mudar para tema papel claro'
              }
              aria-label="Alternar tema claro e escuro"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {settings.theme === 'light' ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-zinc-200/60 px-6 py-2.5 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <BrandIcon size="xs" />
            <span className="font-mono-txt text-xs text-zinc-500 dark:text-zinc-400">
              {doc.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onExitFocusMode}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>Sair do modo foco (Esc)</span>
          </button>
        </div>
      )}

      {/* Inline Find & Replace */}
      <FindReplaceBar
        isOpen={findOpen}
        query={findQuery}
        replacement={replaceQuery}
        caseSensitive={caseSensitive}
        matchCount={matches.length}
        currentMatchIndex={currentMatchIndex}
        onQueryChange={onFindQueryChange}
        onReplacementChange={onReplaceQueryChange}
        onToggleCaseSensitive={onToggleCaseSensitive}
        onFindPrev={onFindPrev}
        onFindNext={onFindNext}
        onReplaceOne={onReplaceOne}
        onReplaceAll={onReplaceAll}
        onClose={onCloseFind}
      />

      {/* Main Editor Surface */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Line Numbers Gutter */}
        {settings.showLineNumbers && (
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="select-none overflow-hidden border-r border-zinc-200/70 bg-[#FAF9F6] py-6 pl-3 pr-3 text-right font-mono-txt text-zinc-400 tabular-nums dark:border-zinc-800/80 dark:bg-[#141416] dark:text-zinc-600"
            style={{
              fontSize: `${Math.max(10, effectiveFontSize - 2)}px`,
              minWidth: `${Math.max(3, String(lines.length).length) * 0.65 + 1.5}rem`,
            }}
          >
            {lines.map((_, idx) => {
              const height =
                settings.wordWrap && lineHeights[idx]
                  ? lineHeights[idx]
                  : lineHeightPx;
              const isCurrentLine = cursorPos.line === idx + 1;
              return (
                <div
                  key={idx}
                  style={{
                    height: `${height}px`,
                    lineHeight: `${lineHeightPx}px`,
                  }}
                  className={
                    isCurrentLine
                      ? 'font-medium text-rose-600 dark:text-rose-400'
                      : ''
                  }
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        )}

        {/* Textarea container */}
        <div
          className={`relative flex-1 overflow-hidden ${
            isFocusMode ? 'mx-auto w-full max-w-3xl' : ''
          }`}
        >
          {/* Mirror for exact wrapped line heights */}
          {settings.showLineNumbers &&
            settings.wordWrap &&
            lines.length <= 1500 && (
              <div
                ref={mirrorRef}
                aria-hidden="true"
                className={`pointer-events-none invisible absolute inset-x-0 top-0 -z-10 whitespace-pre-wrap break-words py-6 px-6 sm:px-10 ${fontClass}`}
                style={{
                  fontSize: `${effectiveFontSize}px`,
                  lineHeight: `${lineHeightPx}px`,
                  tabSize: settings.tabSize,
                }}
              >
                {lines.map((line, idx) => (
                  <div key={idx}>{line.length > 0 ? line : '\u00A0'}</div>
                ))}
              </div>
            )}

          <textarea
            ref={textareaRef}
            value={doc.content}
            onChange={(e) => {
              onContentChange(e.target.value);
              syncSelection();
            }}
            onClick={syncSelection}
            onKeyUp={syncSelection}
            onSelect={syncSelection}
            onScroll={handleScroll}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={true}
            wrap={settings.wordWrap ? 'soft' : 'off'}
            placeholder="Comece a escrever aqui ou arraste um arquivo .txt..."
            aria-label={`Conteúdo de ${doc.name}`}
            className={`lovetxt-scroll h-full w-full resize-none bg-transparent py-6 px-6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-600 sm:px-10 ${fontClass} ${
              settings.wordWrap
                ? 'overflow-y-auto overflow-x-hidden whitespace-pre-wrap'
                : 'overflow-auto whitespace-pre'
            }`}
            style={{
              fontSize: `${effectiveFontSize}px`,
              lineHeight: `${lineHeightPx}px`,
              tabSize: settings.tabSize,
            }}
          />
        </div>
      </div>

      {/* Quiet Editorial Status Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 bg-[#FAF9F6] px-4 py-2 text-xs text-zinc-500 tabular-nums dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {metrics.lines} {metrics.lines === 1 ? 'linha' : 'linhas'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {metrics.words} {metrics.words === 1 ? 'palavra' : 'palavras'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{metrics.chars} caracteres</span>
          <span className="hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden sm:inline">{formatBytes(metrics.bytes)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                lineEnding: settings.lineEnding === 'LF' ? 'CRLF' : 'LF',
              })
            }
            title="Alternar tipo de quebra de linha na exportação (.txt)"
            className="rounded px-1.5 py-0.5 font-mono-txt text-[11px] text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {settings.lineEnding}
          </button>
          <span aria-hidden="true">·</span>
          <span>UTF-8</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
            <Check className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            <span>Salvo {savedTimeFormatted}</span>
          </span>
        </div>
      </footer>
    </section>
  );
};
