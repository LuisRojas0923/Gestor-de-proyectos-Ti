import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { Button, Input, Text } from '../atoms';

interface ColumnFilterPopoverProps {
  columnKey: string;
  title: string;
  options: string[];
  selectedValues: Set<string> | null;
  onToggleOption: (columnKey: string, option: string) => void;
  onSelectAll: (columnKey: string) => void;
  onClear: (columnKey: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  columnKey,
  title,
  options,
  selectedValues,
  onToggleOption,
  onSelectAll,
  onClear,
  onClose,
  anchorEl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, opensUpward: false, width: 250, maxHeight: 350 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const POPOVER_MAX_HEIGHT = 350;
    const VIEWPORT_MARGIN = 10;
    const POSITION_GAP = 4;

    const updatePosition = () => {
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportLeft = viewport?.offsetLeft ?? 0;
        const viewportWidth = viewport?.width ?? window.innerWidth;
        const viewportHeight = viewport?.height ?? window.innerHeight;
        const viewportBottom = viewportTop + viewportHeight;
        const viewportRight = viewportLeft + viewportWidth;
        const POPOVER_WIDTH = Math.min(250, Math.max(0, viewportWidth - 20));
        const popoverHeight = Math.min(
          POPOVER_MAX_HEIGHT,
          Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2)
        );

        let top = rect.bottom + POSITION_GAP;
        let left = rect.left;
        let opensUpward = false;
        const spaceBelow = viewportBottom - VIEWPORT_MARGIN - top;
        const spaceAbove = rect.top - POSITION_GAP - (viewportTop + VIEWPORT_MARGIN);

        if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
          top = rect.top - popoverHeight - POSITION_GAP;
          opensUpward = true;
        }

        top = Math.max(
          viewportTop + VIEWPORT_MARGIN,
          Math.min(top, viewportBottom - VIEWPORT_MARGIN - popoverHeight)
        );

        if (left + POPOVER_WIDTH > viewportRight) {
          left = rect.right - POPOVER_WIDTH;
        }

        left = Math.max(
          viewportLeft + VIEWPORT_MARGIN,
          Math.min(left, viewportRight - VIEWPORT_MARGIN - POPOVER_WIDTH)
        );

        setCoords((current) => {
          const next = { top, left, opensUpward, width: POPOVER_WIDTH, maxHeight: popoverHeight };
          return current.top === next.top &&
            current.left === next.left &&
            current.opensUpward === next.opensUpward &&
            current.width === next.width &&
            current.maxHeight === next.maxHeight
            ? current
            : next;
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          anchorEl && !anchorEl.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target) &&
          anchorEl && !anchorEl.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [onClose, anchorEl]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return createPortal(
      <div
        ref={popoverRef}
        role="dialog"
        aria-labelledby={`filter-title-${columnKey}`}
        style={{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          width: `${coords.width}px`,
          maxHeight: `${coords.maxHeight}px`,
        }}
        className={`
          fixed z-[9999]
          flex flex-col
          bg-white/90 dark:bg-neutral-800/95
        backdrop-blur-xl
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-2xl
        overflow-hidden
        animate-in fade-in zoom-in-95 duration-150
        ${coords.opensUpward ? 'origin-bottom' : 'origin-top'}
      `}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-neutral-100 dark:border-neutral-700/50">
        <div className="flex justify-between items-center mb-1">
          <Text id={`filter-title-${columnKey}`} variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">
            Filtrar: {title}
          </Text>
          <Button
            variant="ghost"
            size="xs"
            icon={X}
            onClick={onClose}
            aria-label="Cerrar filtro"
            className="!p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 !rounded-lg"
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <Input
          size="xs"
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar..."
          aria-label={`Buscar en filtro de ${title}`}
          autoFocus
          className="!bg-neutral-100 dark:!bg-neutral-700 !border-transparent focus:!border-primary-400 !rounded-xl dark:!text-white"
        />
      </div>

      {/* Quick Actions */}
      <div className="px-3 flex gap-3 text-[10px] font-bold uppercase tracking-tight mb-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onSelectAll(columnKey)}
          className="!text-primary-600 hover:!text-primary-700 dark:!text-primary-400"
        >
          Todo
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onClear(columnKey)}
          className="!text-red-500 hover:!text-red-600"
        >
          Limpiar
        </Button>
      </div>

      {/* Options List */}
      <div className="px-2 py-1 flex-1 min-h-0 max-h-[200px] overflow-y-auto custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(option => {
            const isChecked = selectedValues !== null && (selectedValues.size === 0 || selectedValues.has(option));
            return (
              <Button
                key={option}
                variant="ghost"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => onToggleOption(columnKey, option)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
                    event.preventDefault();
                    onToggleOption(columnKey, option);
                  }
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors h-auto font-normal justify-start"
              >
                <Text as="span" aria-hidden="true" className={`
                  w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                  ${isChecked
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700'}
                `}>
                  {isChecked && <Check size={10} strokeWidth={4} />}
                </Text>
                <Text variant="caption" className="truncate dark:text-neutral-300 flex-1 text-left text-[12px] font-normal leading-none">
                  {option}
                </Text>
              </Button>
            );
          })
        ) : (
          <div className="px-2 py-4 text-center">
            <Text variant="caption" className="opacity-40 italic">No hay resultados</Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/30 border-t border-neutral-100 dark:border-neutral-700/50 flex justify-between items-center">
        <Text variant="caption" color="text-secondary" className="text-[10px]">
          {selectedValues === null ? 0 : selectedValues.size === 0 ? options.length : selectedValues.size} seleccionados
        </Text>
        <Button
          variant="primary"
          size="xs"
          onClick={onClose}
          className="!text-[10px] !font-bold !rounded-lg"
        >
          Aplicar
        </Button>
      </div>
    </div>,
    document.body
  );
};
