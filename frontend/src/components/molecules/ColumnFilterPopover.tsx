import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { Text } from '../atoms/Text';

interface ColumnFilterPopoverProps {
  columnKey: string;
  title: string;
  options: string[];
  selectedValues: Set<string>;
  onToggleOption: (columnKey: string, option: string) => void;
  onSelectAll: (columnKey: string) => void;
  onClear: (columnKey: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
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
  anchorRef,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, opensUpward: false });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const POPOVER_HEIGHT = 350;
      const POPOVER_WIDTH = 250;

      let top = rect.bottom + window.scrollY + 4;
      let left = rect.left + window.scrollX;
      let opensUpward = false;

      // Detección de borde inferior
      if (rect.bottom + POPOVER_HEIGHT > window.innerHeight) {
        top = rect.top + window.scrollY - POPOVER_HEIGHT - 4;
        opensUpward = true;
      }

      // Detección de borde derecho
      if (left + POPOVER_WIDTH > window.innerWidth) {
        left = rect.right + window.scrollX - POPOVER_WIDTH;
      }

      setCoords({ top, left, opensUpward });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: coords.top, left: coords.left }}
      className={`
        fixed z-[9999] w-[250px]
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
          <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">
            Filtrar: {title}
          </Text>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <X size={14} className="text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="
              w-full pl-9 pr-3 py-1.5 text-xs rounded-xl
              bg-neutral-100 dark:bg-neutral-700
              border border-transparent focus:border-primary-400
              outline-none transition-colors
              dark:text-white
            "
            autoFocus
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 flex gap-3 text-[10px] font-bold uppercase tracking-tight mb-1">
        <button 
          onClick={() => onSelectAll(columnKey)}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
        >
          Todo
        </button>
        <button 
          onClick={() => onClear(columnKey)}
          className="text-red-500 hover:text-red-600 transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* Options List */}
      <div className="px-2 py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(option => (
            <label
              key={option}
              className="
                flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer
                hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors
              "
            >
              <div className={`
                w-4 h-4 rounded border flex items-center justify-center transition-all
                ${selectedValues.has(option) 
                  ? 'bg-primary-500 border-primary-500 text-white' 
                  : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700'}
              `}>
                {selectedValues.has(option) && <Check size={10} strokeWidth={4} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={selectedValues.has(option)}
                onChange={() => onToggleOption(columnKey, option)}
              />
              <span className="text-xs truncate dark:text-neutral-300">{option}</span>
            </label>
          ))
        ) : (
          <div className="px-2 py-4 text-center">
            <Text variant="caption" className="opacity-40 italic">No hay resultados</Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/30 border-t border-neutral-100 dark:border-neutral-700/50 flex justify-between items-center">
        <span className="text-[10px] text-neutral-400">
          {selectedValues.size} seleccionados
        </span>
        <button 
          onClick={onClose}
          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-[10px] font-bold rounded-lg transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>,
    document.body
  );
};
