import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomMenuProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const ZoomMenu: React.FC<ZoomMenuProps> = ({
  zoom,
  minZoom = 50,
  maxZoom = 200,
  onZoomIn,
  onZoomOut,
  onResetZoom,
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
        title="Zoom do editor (Ctrl+ / Ctrl-)"
        className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
          open
            ? 'bg-zinc-200/90 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50'
        }`}
      >
        <Search className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
        <span className="font-mono-txt text-[11px] tabular-nums">{zoom}%</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Controle de zoom"
          className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-lg border border-zinc-200 bg-white py-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 pb-2 pt-1 dark:border-zinc-800">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Zoom do texto
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onZoomOut}
                disabled={zoom <= minZoom}
                title="Abaixar zoom"
                aria-label="Abaixar zoom"
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-11 text-center font-mono-txt text-xs font-medium text-zinc-800 tabular-nums dark:text-zinc-100">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={onZoomIn}
                disabled={zoom >= maxZoom}
                title="Aumentar zoom"
                aria-label="Aumentar zoom"
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={onZoomIn}
            disabled={zoom >= maxZoom}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <ZoomIn className="h-3.5 w-3.5 text-zinc-400" />
              <span>Aumentar zoom</span>
            </span>
            <span className="font-mono-txt text-[11px] text-zinc-400">
              Ctrl +
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={onZoomOut}
            disabled={zoom <= minZoom}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <ZoomOut className="h-3.5 w-3.5 text-zinc-400" />
              <span>Abaixar zoom</span>
            </span>
            <span className="font-mono-txt text-[11px] text-zinc-400">
              Ctrl -
            </span>
          </button>

          <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onResetZoom();
              setOpen(false);
            }}
            disabled={zoom === 100}
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
              <span>Zoom padrão (100%)</span>
            </span>
            <span className="font-mono-txt text-[11px] text-zinc-400">
              Ctrl 0
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
