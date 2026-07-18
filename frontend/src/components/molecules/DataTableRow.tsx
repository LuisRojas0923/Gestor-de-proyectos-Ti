import React from 'react';
import { Text } from '../atoms';

export interface DataTableColumn<T> {
    key: string;
    label: string;
    minWidth?: string;
    maxWidth?: string;
    flex?: boolean;
    centered?: boolean;
    filterable?: boolean;
    cellClassName?: string;
    render?: (row: T) => React.ReactNode;
    subFilters?: { key: string; label: string }[];
}

interface DataTableRowProps<T> {
    row: T;
    columns: DataTableColumn<T>[];
    rowKey: string;
    showRowIndicator: boolean;
    rowIndicatorColor: string;
    onRowClick?: (row: T) => void;
    renderRowActions?: (row: T) => React.ReactNode;
    onMouseEnterRow?: (row: T, event: React.MouseEvent) => void;
    onMouseLeaveRow?: () => void;
    getRowClassName?: (row: T) => string;
}

const DataTableRowInner = <T,>({
    row,
    columns,
    showRowIndicator,
    rowIndicatorColor,
    onRowClick,
    renderRowActions,
    onMouseEnterRow,
    onMouseLeaveRow,
    getRowClassName,
}: DataTableRowProps<T>) => (
    <div
        onClick={() => onRowClick?.(row)}
        role="row"
        tabIndex={onRowClick ? 0 : undefined}
        onKeyDown={(event) => {
            if (!onRowClick || event.target !== event.currentTarget) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onRowClick(row);
        }}
        className={`group relative grid col-span-full grid-cols-subgrid border-b border-[var(--color-border)] hover:bg-[var(--color-surface-variant)] transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${getRowClassName?.(row) ?? ''}`}
        onMouseEnter={(event) => onMouseEnterRow?.(row, event)}
        onMouseLeave={onMouseLeaveRow}
    >
        {showRowIndicator && (
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${rowIndicatorColor}`} />
        )}
        {columns.map((column) => (
            <div
                key={column.key}
                role="cell"
                className={`flex items-center ${column.centered ? 'justify-center' : ''} py-3 px-4 min-w-0 ${column.cellClassName ?? ''}`}
            >
                {column.render ? column.render(row) : (
                    <Text variant="caption" className="truncate">
                        {String((row as Record<string, unknown>)[column.key] ?? '')}
                    </Text>
                )}
            </div>
        ))}
        {renderRowActions && (
            <div className="flex items-center justify-center py-3 px-4 gap-2" role="cell">
                {renderRowActions(row)}
            </div>
        )}
    </div>
);

export const MemoDataTableRow = React.memo(DataTableRowInner, (previous, next) => (
    previous.row === next.row
    && previous.columns === next.columns
    && previous.rowKey === next.rowKey
    && previous.showRowIndicator === next.showRowIndicator
    && previous.rowIndicatorColor === next.rowIndicatorColor
    && previous.onRowClick === next.onRowClick
    && previous.renderRowActions === next.renderRowActions
    && previous.onMouseEnterRow === next.onMouseEnterRow
    && previous.onMouseLeaveRow === next.onMouseLeaveRow
    && previous.getRowClassName === next.getRowClassName
)) as typeof DataTableRowInner;
