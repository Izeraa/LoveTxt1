import React, { useMemo, useState } from 'react';
import { Copy, FilePlus, FileText, Search, Trash2, X } from 'lucide-react';
import { BrandIcon } from './BrandIcon';
import { TxtDocument } from '../types/editor';
import { countMetrics, formatRelativeTime } from '../utils/txtHelpers';

interface SidebarProps {
  documents: TxtDocument[];
  activeId: string;
  isOpen: boolean;
  onCloseMobile: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeId,
  isOpen,
  onCloseMobile,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
}) => {
  const [filter, setFilter] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q)
    );
  }, [documents, filter]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-30 bg-zinc-950/30 backdrop-blur-[1px] lg:hidden"
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        aria-label="Lista de arquivos"
        className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200/80 bg-[#F4F2EE] transition-transform duration-150 dark:border-zinc-800 dark:bg-[#161618] lg:static lg:z-auto lg:w-68 lg:shrink-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
          <span className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
            Arquivos ({documents.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-rose-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 whitespace-nowrap shrink-0"
              title="Novo arquivo .txt (Ctrl+N)"
            >
              <FilePlus className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Novo</span>
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 lg:hidden"
              aria-label="Fechar painel de arquivos"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2.5">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar arquivos..."
              aria-label="Filtrar arquivos"
              className="w-full rounded-md border border-zinc-200/90 bg-white/80 py-1.5 pl-8 pr-7 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-rose-500 focus:outline-none dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter('')}
                className="absolute right-1.5 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Limpar filtro"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="lovetxt-scroll flex-1 overflow-y-auto px-2 pb-4">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-3 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              <BrandIcon size="md" className="opacity-85" />
              <span>Nenhum arquivo encontrado.</span>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredDocs.map((doc) => {
                const isActive = doc.id === activeId;
                const metrics = countMetrics(doc.content);
                const isConfirming = confirmDeleteId === doc.id;

                return (
                  <li key={doc.id} className="group relative">
                    {isConfirming ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2.5 text-xs dark:border-rose-900/60 dark:bg-rose-950/40">
                        <span className="truncate font-medium text-rose-900 dark:text-rose-200">
                          Excluir {doc.name}?
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(doc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded px-2 py-1 text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                          isActive
                            ? 'bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-200/80 dark:bg-zinc-800/90 dark:text-zinc-50 dark:ring-zinc-700/80'
                            : 'text-zinc-700 hover:bg-zinc-200/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(doc.id);
                            onCloseMobile();
                          }}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none"
                        >
                          <div className="flex items-center gap-2">
                            <FileText
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            />
                            <span className="truncate text-sm font-medium">
                              {doc.name}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 pl-5.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                            <span>{metrics.words} pal.</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatRelativeTime(doc.updatedAt)}</span>
                          </div>
                        </button>

                        <div
                          className={`flex items-center gap-0.5 pt-0.5 transition-opacity ${
                            isActive
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(doc.id);
                            }}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                            title="Duplicar arquivo"
                            aria-label={`Duplicar ${doc.name}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {documents.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(doc.id);
                              }}
                              className="rounded p-1 text-zinc-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                              title="Excluir arquivo"
                              aria-label={`Excluir ${doc.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-zinc-200/80 px-4 py-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <BrandIcon size="xs" />
          <span>
            Arraste e solte qualquer <span className="font-mono-txt">.txt</span> no editor para abrir.
          </span>
        </div>
      </aside>
    </>
  );
};
