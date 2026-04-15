import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Text, Input, Checkbox, Button } from '../atoms';

export interface ColumnFilterPopoverProps {
  columnKey: string;
  title: string;
  options: string[];
  selectedValues: Set<string>;
  onSelectionChange: (columnKey: string, values: Set<string>) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  columnKey,
  title,
  options,
  selectedValues,
  onSelectionChange,
  onClose,
  anchorRef
}) => {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  useEffect(() => {
    if (!anchorRef.current) return;
    
    const computePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const POPOVER_HEIGHT = 350;
      const POPOVER_WIDTH = 250;
      const MARGIN = 8;
      
      let pos: { top?: number; bottom?: number; left?: number; right?: number } = {};
      
      // Vertical positioning
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow > POPOVER_HEIGHT + MARGIN) {
        pos.top = rect.bottom + 4;
      } else {
        // Opción B: Hacia arriba si hay espacio
        // O lo forzamos a una posición segura si de plano no cabe
        pos.bottom = window.innerHeight - rect.top + 4;
      }
      
      // Horizontal positioning
      if (rect.left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
        // Alinear al borde derecho del anchor si se sale de la pantalla
        pos.left = Math.max(MARGIN, rect.right - POPOVER_WIDTH);
      } else {
        pos.left = rect.left;
      }
      
      setPosition(pos);
    };

    computePosition();
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true); // true para capturar eventos de scroll en captura
    
    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [anchorRef]);

  // Cerrar al hacer click fuera o ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose, anchorRef]);

  const filtered = options.filter(o =>
    (o || '(Vacío)').toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (option: string) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(option)) {
      newSet.delete(option);
    } else {
      newSet.add(option);
    }
    onSelectionChange(columnKey, newSet);
  };

  const selectAll = () => {
    onSelectionChange(columnKey, new Set(filtered));
  };

  const clearAll = () => {
    onSelectionChange(columnKey, new Set());
  };

  const content = (
    <div
      ref={popoverRef}
      className="
        fixed z-[9999] min-w-[220px] max-w-[300px]
        bg-white/95 dark:bg-neutral-800/95
        backdrop-blur-xl
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-2xl
        animate-in fade-in zoom-in-95 duration-150
        overflow-visible
        text-neutral-900 dark:text-neutral-100
      "
      style={position} // @audit-ok
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header del Popover */}
      <div className="px-4 pt-4 pb-2 border-b border-neutral-100 dark:border-neutral-700">
        <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">
          Filtrar: {title}
        </Text>
      </div>

      <div className="px-3 py-2">
        <Input
          placeholder="Buscar..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
          className="!rounded-xl"
          autoFocus
        />
      </div>

      {/* Acciones rápidas */}
      <div className="px-3 py-1 flex gap-2">
        <Button 
          variant="ghost" 
          size="xs" 
          onClick={selectAll} 
          className="text-primary-600 dark:text-primary-400 !bg-transparent hover:!underline font-medium text-[10px] uppercase p-0 h-auto"
        >
          Seleccionar todo
        </Button>
        <Text variant="caption" className="text-neutral-300 dark:text-neutral-600">|</Text>
        <Button 
          variant="ghost" 
          size="xs" 
          onClick={clearAll} 
          className="text-red-500 !bg-transparent hover:!underline font-medium mb-1 text-[10px] uppercase p-0 h-auto"
        >
          Limpiar
        </Button>
      </div>

      {/* Lista de Opciones con Checkboxes */}
      <div className="px-3 py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {filtered.map(option => (
          <Text
            as="label"
            key={option}
            className="
              flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer
              hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors
            "
          >
            <Checkbox
              checked={selectedValues.has(option)}
              onChange={() => toggleOption(option)}
              className="rounded accent-primary-500 cursor-pointer"
            />
            <Text variant="body2" className="truncate">{option || '(Vacío)'}</Text>
          </Text>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-4 text-xs text-neutral-500">
            No se encontraron {search ? 'coincidencias' : 'resultados'}
          </div>
        )}
      </div>

      {/* Footer con conteo */}
      <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 rounded-b-2xl border-t border-neutral-100 dark:border-neutral-700">
        <Text variant="caption" color="text-secondary" className="text-[10px]">
          <Text weight="bold" color="text-primary">{selectedValues.size}</Text> de <Text weight="bold" color="text-primary">{options.length}</Text> seleccionados
        </Text>
      </div>
    </div>
  );

  // Usamos portal hacia document.body para asegurar que escape cualquier overflow: hidden
  return createPortal(content, document.body);
};
