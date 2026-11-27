import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowUpZA,
  CalendarClock,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Eraser,
  ListFilter,
  RemoveFormatting,
  Wrench,
} from 'lucide-react';
import { TransformAction } from '../types/editor';

interface ToolsMenuProps {
  hasSelection: boolean;
  onTransform: (action: TransformAction) => void;
}

const TOOL_ITEMS: Array<{
  action: TransformAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dividerAfter?: boolean;
}> = [
  { action: 'uppercase', label: 'Converter para MAIÚSCULAS', icon: CaseUpper },
  { action: 'lowercase', label: 'Converter para minúsculas', icon: CaseLower },
  {
    action: 'capitalizeLines',
    label: 'Capitalizar início das linhas',
    icon: CaseSensitive,
    dividerAfter: true,
  },
  { action: 'sortAsc', label: 'Ordenar linhas (A–Z)', icon: ArrowDownAZ },
  {
    action: 'sortDesc',
    label: 'Ordenar linhas (Z–A)',
    icon: ArrowUpZA,
    dividerAfter: true,
  },
  {
    action: 'removeDuplicateLines',
    label: 'Remover linhas duplicadas',
    icon: ListFilter,
  },
  {
    action: 'removeEmptyLines',
    label: 'Remover linhas vazias',
    icon: Eraser,
  },
  {
    action: 'trimTrailingSpaces',
    label: 'Limpar espaços finais',
    icon: RemoveFormatting,
    dividerAfter: true,
  },
  {
    action: 'insertDateTime',
    label: 'Inserir data e hora',
    icon: CalendarClock,
  },
];

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  hasSelection,
  onTransform,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
          open
            ? 'bg-zinc-200/80 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50'
        }`}
      >
        <Wrench className="h-3.5 w-3.5" />
        <span>Ferramentas</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-zinc-200 bg-white py-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="px-3 py-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            {hasSelection
              ? 'Aplicar no texto selecionado'
              : 'Aplicar no arquivo inteiro'}
          </div>
          {TOOL_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.action}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onTransform(item.action);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">{item.label}</span>
                </button>
                {item.dividerAfter && (
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
