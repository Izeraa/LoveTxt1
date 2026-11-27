import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Download, Save } from 'lucide-react';
import { BrandIcon } from './components/BrandIcon';
import { EditorCanvas } from './components/EditorCanvas';
import { Sidebar } from './components/Sidebar';
import {
  EditorSettings,
  TransformAction,
  TxtDocument,
} from './types/editor';
import {
  applyTextTransform,
  countMetrics,
  downloadTxtFile,
  ensureTxtExtension,
  findAllMatches,
  normalizeLineEndings,
  STARTER_DOCUMENT_CONTENT,
} from './utils/txtHelpers';

const STORAGE_DOCS_KEY = 'lovetxt_documents_v1';
const STORAGE_ACTIVE_KEY = 'lovetxt_active_id_v1';
const STORAGE_SETTINGS_KEY = 'lovetxt_settings_v1';

const DEFAULT_SETTINGS: EditorSettings = {
  font: 'mono',
  fontSize: 16,
  zoom: 100,
  showLineNumbers: true,
  wordWrap: true,
  lineEnding: 'LF',
  theme: 'light',
  tabSize: 2,
};

interface HistoryEntry {
  undoStack: string[];
  redoStack: string[];
}

interface FileSystemFileHandleLike {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadInitialDocuments(): TxtDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TxtDocument[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d) => ({ ...d, hasDiskHandle: false }));
      }
    }
  } catch {
    // Ignore storage read errors
  }
  const now = Date.now();
  return [
    {
      id: createId(),
      name: 'boas-vindas.txt',
      content: STARTER_DOCUMENT_CONTENT,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function loadInitialSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<EditorSettings>) };
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_SETTINGS;
}

export default function App() {
  const [documents, setDocuments] = useState<TxtDocument[]>(loadInitialDocuments);
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return '';
  });
  const [settings, setSettings] = useState<EditorSettings>(loadInitialSettings);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => Date.now());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Find & Replace state
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileHandlesRef = useRef<Record<string, FileSystemFileHandleLike>>({});
  const historyRef = useRef<Record<string, HistoryEntry>>({});
  const lastTypingTimeRef = useRef<number>(0);
  const toastTimerRef = useRef<number | null>(null);

  // Ensure activeId always points to a valid document
  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeId) ?? documents[0];
  }, [documents, activeId]);

  useEffect(() => {
    if (activeDoc && activeDoc.id !== activeId) {
      setActiveId(activeDoc.id);
    }
  }, [activeDoc, activeId]);

  // Persist documents & settings
  useEffect(() => {
    try {
      const serializable = documents.map(({ hasDiskHandle: _h, ...rest }) => rest);
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(serializable));
      setLastSavedAt(Date.now());
    } catch {
      // Ignore quota errors
    }
  }, [documents]);

  useEffect(() => {
    if (!activeId) return;
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, activeId);
    } catch {
      // ignore
    }
  }, [activeId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  const pushHistory = useCallback(
    (docId: string, previousContent: string, forceSnapshot = false) => {
      const entry = historyRef.current[docId] ?? {
        undoStack: [],
        redoStack: [],
      };
      const now = Date.now();
      const elapsed = now - lastTypingTimeRef.current;

      if (
        forceSnapshot ||
        entry.undoStack.length === 0 ||
        elapsed > 900 ||
        Math.abs(
          previousContent.length -
            (entry.undoStack[entry.undoStack.length - 1]?.length ?? 0)
        ) > 25
      ) {
        if (entry.undoStack[entry.undoStack.length - 1] !== previousContent) {
          entry.undoStack.push(previousContent);
          if (entry.undoStack.length > 80) {
            entry.undoStack.shift();
          }
        }
      }
      entry.redoStack = [];
      lastTypingTimeRef.current = now;
      historyRef.current[docId] = entry;
    },
    []
  );

  const handleContentChange = useCallback(
    (newContent: string, forceSnapshot = false) => {
      if (!activeDoc) return;
      if (newContent === activeDoc.content) return;
      pushHistory(activeDoc.id, activeDoc.content, forceSnapshot);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === activeDoc.id
            ? { ...d, content: newContent, updatedAt: Date.now() }
            : d
        )
      );
    },
    [activeDoc, pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (!activeDoc) return;
    const entry = historyRef.current[activeDoc.id];
    if (!entry || entry.undoStack.length === 0) return;

    const previous = entry.undoStack.pop()!;
    entry.redoStack.push(activeDoc.content);

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id
          ? { ...d, content: previous, updatedAt: Date.now() }
          : d
      )
    );
  }, [activeDoc]);

  const handleRedo = useCallback(() => {
    if (!activeDoc) return;
    const entry = historyRef.current[activeDoc.id];
    if (!entry || entry.redoStack.length === 0) return;

    const next = entry.redoStack.pop()!;
    entry.undoStack.push(activeDoc.content);

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id
          ? { ...d, content: next, updatedAt: Date.now() }
          : d
      )
    );
  }, [activeDoc]);

  const handleCreateDocument = useCallback(() => {
    const existingNumbers = documents
      .map((d) => {
        const m = d.name.match(/^notas-(\d+)\.txt$/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNum =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const defaultName = documents.some((d) => d.name === 'notas.txt')
      ? `notas-${nextNum}.txt`
      : 'notas.txt';

    const now = Date.now();
    const newDoc: TxtDocument = {
      id: createId(),
      name: defaultName,
      content: '',
      createdAt: now,
      updatedAt: now,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setActiveId(newDoc.id);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [documents]);

  const handleDuplicateDocument = useCallback(
    (id: string) => {
      const source = documents.find((d) => d.id === id);
      if (!source) return;
      const baseName = source.name.replace(/\.txt$/i, '');
      const now = Date.now();
      const copyDoc: TxtDocument = {
        id: createId(),
        name: ensureTxtExtension(`${baseName}-copia`),
        content: source.content,
        createdAt: now,
        updatedAt: now,
      };
      setDocuments((prev) => [copyDoc, ...prev]);
      setActiveId(copyDoc.id);
      showToast(`Arquivo ${copyDoc.name} criado`);
    },
    [documents, showToast]
  );

  const handleDeleteDocument = useCallback(
    (id: string) => {
      if (documents.length <= 1) return;
      const target = documents.find((d) => d.id === id);
      delete fileHandlesRef.current[id];
      delete historyRef.current[id];

      const remaining = documents.filter((d) => d.id !== id);
      setDocuments(remaining);
      if (activeId === id && remaining.length > 0) {
        setActiveId(remaining[0].id);
      }
      if (target) {
        showToast(`${target.name} excluído`);
      }
    },
    [documents, activeId, showToast]
  );

  const handleRenameDocument = useCallback(
    (newName: string) => {
      if (!activeDoc) return;
      const safeName = ensureTxtExtension(newName);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === activeDoc.id
            ? { ...d, name: safeName, updatedAt: Date.now() }
            : d
        )
      );
    },
    [activeDoc]
  );

  const openFilesFromList = useCallback(
    async (files: FileList) => {
      const loadedDocs: TxtDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const now = Date.now();
        loadedDocs.push({
          id: createId(),
          name: ensureTxtExtension(file.name),
          content: text,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (loadedDocs.length > 0) {
        setDocuments((prev) => [...loadedDocs, ...prev]);
        setActiveId(loadedDocs[0].id);
        showToast(
          loadedDocs.length === 1
            ? `${loadedDocs[0].name} aberto`
            : `${loadedDocs.length} arquivos abertos`
        );
      }
    },
    [showToast]
  );

  const handleOpenFileClick = useCallback(async () => {
    const picker = (
      window as unknown as {
        showOpenFilePicker?: (opts?: unknown) => Promise<FileSystemFileHandleLike[]>;
      }
    ).showOpenFilePicker;

    if (picker) {
      try {
        const handles = await picker({
          multiple: false,
          types: [
            {
              description: 'Arquivos de texto (.txt)',
              accept: { 'text/plain': ['.txt', '.log', '.md', '.csv'] },
            },
          ],
        });
        if (handles && handles.length > 0) {
          const handle = handles[0];
          const file = await handle.getFile();
          const text = await file.text();
          const now = Date.now();
          const docId = createId();
          fileHandlesRef.current[docId] = handle;
          const newDoc: TxtDocument = {
            id: docId,
            name: ensureTxtExtension(file.name),
            content: text,
            createdAt: now,
            updatedAt: now,
            hasDiskHandle: true,
          };
          setDocuments((prev) => [newDoc, ...prev]);
          setActiveId(docId);
          showToast(`${newDoc.name} aberto do computador`);
          return;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Fall through to standard <input type="file"> when restricted in iframe
      }
    }

    fileInputRef.current?.click();
  }, [showToast]);

  const handleSaveOrDownload = useCallback(async () => {
    if (!activeDoc) return;
    const handle = fileHandlesRef.current[activeDoc.id];
    if (handle) {
      try {
        const writable = await handle.createWritable();
        const normalized = normalizeLineEndings(
          activeDoc.content,
          settings.lineEnding
        );
        await writable.write(normalized);
        await writable.close();
        setLastSavedAt(Date.now());
        showToast(`${activeDoc.name} salvo no disco`);
        return;
      } catch {
        // Fallback to browser download if permission expired
      }
    }
    downloadTxtFile(activeDoc.name, activeDoc.content, settings.lineEnding);
    showToast(`${activeDoc.name} baixado`);
  }, [activeDoc, settings.lineEnding, showToast]);

  // Find & Replace computations
  const matches = useMemo(() => {
    if (!activeDoc || !findOpen || !findQuery) return [];
    return findAllMatches(activeDoc.content, findQuery, caseSensitive);
  }, [activeDoc, findOpen, findQuery, caseSensitive]);

  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(0);
    }
  }, [matches.length, currentMatchIndex]);

  const selectMatchInTextarea = useCallback(
    (index: number) => {
      const match = matches[index];
      const el = textareaRef.current;
      if (!match || !el) return;
      el.focus();
      el.setSelectionRange(match.start, match.end);
    },
    [matches]
  );

  const handleFindNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    selectMatchInTextarea(nextIdx);
  }, [matches.length, currentMatchIndex, selectMatchInTextarea]);

  const handleFindPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    selectMatchInTextarea(prevIdx);
  }, [matches.length, currentMatchIndex, selectMatchInTextarea]);

  const handleReplaceOne = useCallback(() => {
    if (!activeDoc || matches.length === 0) return;
    const match = matches[currentMatchIndex] ?? matches[0];
    const nextContent =
      activeDoc.content.slice(0, match.start) +
      replaceQuery +
      activeDoc.content.slice(match.end);
    handleContentChange(nextContent, true);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const endPos = match.start + replaceQuery.length;
        textareaRef.current.setSelectionRange(endPos, endPos);
      }
    });
  }, [activeDoc, matches, currentMatchIndex, replaceQuery, handleContentChange]);

  const handleReplaceAll = useCallback(() => {
    if (!activeDoc || matches.length === 0) return;
    let result = '';
    let cursor = 0;
    for (const m of matches) {
      result += activeDoc.content.slice(cursor, m.start) + replaceQuery;
      cursor = m.end;
    }
    result += activeDoc.content.slice(cursor);
    const replacedCount = matches.length;
    handleContentChange(result, true);
    showToast(
      `${replacedCount} ${
        replacedCount === 1 ? 'ocorrência substituída' : 'ocorrências substituídas'
      }`
    );
  }, [activeDoc, matches, replaceQuery, handleContentChange, showToast]);

  const handleTransform = useCallback(
    (action: TransformAction, selectionStart: number, selectionEnd: number) => {
      if (!activeDoc) return { newStart: 0, newEnd: 0 };
      const { newText, newStart, newEnd } = applyTextTransform(
        activeDoc.content,
        selectionStart,
        selectionEnd,
        action
      );
      if (newText !== activeDoc.content) {
        handleContentChange(newText, true);
      }
      return { newStart, newEnd };
    },
    [activeDoc, handleContentChange]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveOrDownload();
        return;
      }

      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(true);
        return;
      }

      if (mod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setFindOpen(true);
        return;
      }

      if (mod && e.key === '\\') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
        return;
      }

      if (
        mod &&
        e.key.toLowerCase() === 'z' &&
        document.activeElement !== textareaRef.current
      ) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setSettings((prev) => ({
          ...prev,
          zoom: Math.min(200, (prev.zoom ?? 100) + 10),
        }));
        return;
      }

      if (mod && e.key === '-') {
        e.preventDefault();
        setSettings((prev) => ({
          ...prev,
          zoom: Math.max(50, (prev.zoom ?? 100) - 10),
        }));
        return;
      }

      if (mod && e.key === '0') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, zoom: 100 }));
        return;
      }

      if (e.key === 'Escape' && isFocusMode && !findOpen) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveOrDownload, handleUndo, handleRedo, isFocusMode, findOpen]);

  const metrics = useMemo(
    () => countMetrics(activeDoc?.content ?? ''),
    [activeDoc?.content]
  );

  const activeHistory = activeDoc ? historyRef.current[activeDoc.id] : undefined;
  const canUndo = Boolean(activeHistory && activeHistory.undoStack.length > 0);
  const canRedo = Boolean(activeHistory && activeHistory.redoStack.length > 0);

  if (!activeDoc) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F7F4] text-zinc-900 dark:bg-[#111113] dark:text-zinc-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain,.md,.log,.csv"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void openFilesFromList(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      {!isFocusMode && (
        <header className="flex h-14 shrink-0 items-center justify-between gap-8 border-b border-zinc-200/80 bg-[#FAF9F6] px-5 dark:border-zinc-800 dark:bg-[#161618]">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#editor"
            onClick={(e) => {
              e.preventDefault();
              textareaRef.current?.focus();
            }}
            className="inline-flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 dark:text-zinc-50"
          >
            <BrandIcon size="sm" />
            <span>
              <span className="text-rose-600 dark:text-rose-400">love</span>Txt
            </span>
          </a>

          {/* Zone 2: Concise single-line navigation/workflow actions */}
          <nav
            aria-label="Ações principais"
            className="flex items-center gap-5 overflow-x-auto text-sm font-medium text-zinc-600 dark:text-zinc-300"
          >
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-pressed={sidebarOpen}
              className={`py-1 transition-colors hover:text-zinc-950 dark:hover:text-white whitespace-nowrap shrink-0 ${
                sidebarOpen
                  ? 'text-zinc-950 underline decoration-rose-500 decoration-2 underline-offset-4 dark:text-white'
                  : ''
              }`}
            >
              Arquivos
            </button>
            <button
              type="button"
              onClick={handleCreateDocument}
              className="py-1 transition-colors hover:text-zinc-950 hover:underline hover:underline-offset-4 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Novo
            </button>
            <button
              type="button"
              onClick={() => void handleOpenFileClick()}
              className="py-1 transition-colors hover:text-zinc-950 hover:underline hover:underline-offset-4 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Abrir
            </button>
            <button
              type="button"
              onClick={() => setFindOpen((prev) => !prev)}
              aria-pressed={findOpen}
              className={`py-1 transition-colors hover:text-zinc-950 dark:hover:text-white whitespace-nowrap shrink-0 ${
                findOpen
                  ? 'text-zinc-950 underline decoration-rose-500 decoration-2 underline-offset-4 dark:text-white'
                  : ''
              }`}
            >
              Localizar
            </button>
            <button
              type="button"
              onClick={() => setIsFocusMode(true)}
              className="hidden py-1 transition-colors hover:text-zinc-950 hover:underline hover:underline-offset-4 dark:hover:text-white sm:inline-block whitespace-nowrap shrink-0"
            >
              Modo Foco
            </button>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => void handleSaveOrDownload()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 whitespace-nowrap shrink-0 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              {activeDoc.hasDiskHandle ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar .txt</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar .txt</span>
                </>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <main id="editor" className="flex min-h-0 flex-1 overflow-hidden">
        {!isFocusMode && (
          <Sidebar
            documents={documents}
            activeId={activeDoc.id}
            isOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            onSelect={(id) => setActiveId(id)}
            onCreate={handleCreateDocument}
            onDuplicate={handleDuplicateDocument}
            onDelete={handleDeleteDocument}
          />
        )}

        <EditorCanvas
          document={activeDoc}
          settings={settings}
          metrics={metrics}
          isFocusMode={isFocusMode}
          canUndo={canUndo}
          canRedo={canRedo}
          lastSavedAt={lastSavedAt}
          findOpen={findOpen}
          findQuery={findQuery}
          replaceQuery={replaceQuery}
          caseSensitive={caseSensitive}
          matches={matches}
          currentMatchIndex={currentMatchIndex}
          onFindQueryChange={setFindQuery}
          onReplaceQueryChange={setReplaceQuery}
          onToggleCaseSensitive={() => setCaseSensitive((prev) => !prev)}
          onFindPrev={handleFindPrev}
          onFindNext={handleFindNext}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onCloseFind={() => setFindOpen(false)}
          onContentChange={(text) => handleContentChange(text)}
          onRename={handleRenameDocument}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onTransform={handleTransform}
          onUpdateSettings={(partial) =>
            setSettings((prev) => ({ ...prev, ...partial }))
          }
          onExitFocusMode={() => setIsFocusMode(false)}
          onDropFiles={(files) => void openFilesFromList(files)}
          textareaRef={textareaRef}
        />
      </main>

      {/* Non-intrusive Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-12 right-5 z-50 rounded-lg border border-zinc-200 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-md dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
