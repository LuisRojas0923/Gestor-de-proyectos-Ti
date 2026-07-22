import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { Button, Input, Checkbox, Text } from '../atoms';

interface ColumnFilterPopoverProps {
  columnKey: string;
  title: string;
  options: string[];
  selectedValues: Set<string>;
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
  const [coords, setCoords] = useState({ top: 0, left: 0, opensUpward: false, width: 250 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const POPOVER_HEIGHT = 350;
        const POPOVER_WIDTH = Math.min(250, window.innerWidth - 20);

        let top = rect.bottom + 4;
        let left = rect.left;
        let opensUpward = false;

        if (top + POPOVER_HEIGHT > window.innerHeight) {
          top = rect.top - POPOVER_HEIGHT - 4;
          opensUpward = true;
        }

        top = Math.max(10, top);

        if (left + POPOVER_WIDTH > window.innerWidth) {
          left = rect.right - POPOVER_WIDTH;
        }

        left = Math.max(10, left);

        setCoords({ top, left, opensUpward, width: POPOVER_WIDTH });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorEl]);

  useEffect(() => {
    if (popoverRef.current) {
      popoverRef.current.style.top = `${coords.top}px`;
      popoverRef.current.style.left = `${coords.left}px`;
      popoverRef.current.style.width = `${coords.width}px`;
    }
  }, [coords]);

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
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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
      className={`
        fixed z-[9999]
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
      <div className="px-2 py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(option => {
            const isChecked = selectedValues.size === 0 || selectedValues.has(option);
            return (
              <Button
                key={option}
                variant="ghost"
                role="checkbox"
                aria-checked={isChecked}
                onClick={() => onToggleOption(columnKey, option)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors h-auto font-normal justify-start"
              >
                <div className={`
                  w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                  ${isChecked
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700'}
                `}>
                  {isChecked && <Check size={10} strokeWidth={4} />}
                </div>
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
          {selectedValues.size === 0 ? options.length : selectedValues.size} seleccionados
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
