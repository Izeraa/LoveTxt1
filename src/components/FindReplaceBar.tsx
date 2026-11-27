import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Replace, X } from 'lucide-react';

interface FindReplaceBarProps {
  isOpen: boolean;
  query: string;
  replacement: string;
  caseSensitive: boolean;
  matchCount: number;
  currentMatchIndex: number;
  onQueryChange: (value: string) => void;
  onReplacementChange: (value: string) => void;
  onToggleCaseSensitive: () => void;
  onFindPrev: () => void;
  onFindNext: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  query,
  replacement,
  caseSensitive,
  matchCount,
  currentMatchIndex,
  onQueryChange,
  onReplacementChange,
  onToggleCaseSensitive,
  onFindPrev,
  onFindNext,
  onReplaceOne,
  onReplaceAll,
  onClose,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Localizar e substituir"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 bg-[#FAF9F6] px-4 py-2.5 dark:border-zinc-800 dark:bg-[#19191C]"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 focus-within:border-rose-500 dark:border-zinc-700 dark:bg-zinc-900">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) onFindPrev();
                else onFindNext();
              }
            }}
            placeholder="Localizar..."
            aria-label="Texto para localizar"
            className="w-40 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 sm:w-48"
          />
          <button
            type="button"
            onClick={onToggleCaseSensitive}
            title="Diferenciar maiúsculas e minúsculas"
            aria-pressed={caseSensitive}
            className={`rounded px-1.5 py-0.5 font-mono-txt text-[11px] font-medium transition-colors ${
              caseSensitive
                ? 'bg-rose-600 text-white'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Aa
          </button>
        </div>

        <span className="min-w-16 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {query
            ? matchCount > 0
              ? `${currentMatchIndex + 1} de ${matchCount}`
              : '0 resultados'
            : ''}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onFindPrev}
            disabled={matchCount === 0}
            title="Ocorrência anterior (Shift+Enter)"
            aria-label="Ocorrência anterior"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200/70 disabled:opacity-35 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onFindNext}
            disabled={matchCount === 0}
            title="Próxima ocorrência (Enter)"
            aria-label="Próxima ocorrência"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200/70 disabled:opacity-35 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />

        <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 focus-within:border-rose-500 dark:border-zinc-700 dark:bg-zinc-900">
          <Replace className="h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={replacement}
            onChange={(e) => onReplacementChange(e.target.value)}
            placeholder="Substituir por..."
            aria-label="Texto de substituição"
            className="w-36 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 sm:w-44"
          />
        </div>

        <button
          type="button"
          onClick={onReplaceOne}
          disabled={matchCount === 0}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
        >
          Substituir
        </button>
        <button
          type="button"
          onClick={onReplaceAll}
          disabled={matchCount === 0}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
        >
          Substituir tudo
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar localizar e substituir"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
