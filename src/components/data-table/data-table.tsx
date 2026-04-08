import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ColumnConfig, type ColumnState } from './column-config';
import { DynamicFilters, type FilterField, type FilterValue } from './dynamic-filters';

// --- Types ---

export interface Column<T> {
  id: string;
  header: string;
  accessorFn: (row: T) => unknown;
  cell?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pageId: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
  onRowClick?: (row: T) => void;
  filterFields?: FilterField[];
  actions?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

// --- Sort icon ---

function SortIndicator({ direction }: { direction: SortDirection }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <svg
        className={`h-2 w-2 ${direction === 'asc' ? 'text-primary' : 'text-muted-foreground/30'}`}
        viewBox="0 0 8 5"
        fill="currentColor"
      >
        <path d="M4 0L8 5H0L4 0Z" />
      </svg>
      <svg
        className={`h-2 w-2 ${direction === 'desc' ? 'text-primary' : 'text-muted-foreground/30'}`}
        viewBox="0 0 8 5"
        fill="currentColor"
      >
        <path d="M4 5L0 0H8L4 5Z" />
      </svg>
    </span>
  );
}

// --- Main component ---

export function DataTable<T>({
  columns,
  data,
  loading = false,
  pageId,
  searchPlaceholder = 'Rechercher...',
  onSearch,
  searchValue: externalSearchValue,
  onRowClick,
  filterFields,
  actions,
  emptyIcon,
  emptyMessage = 'Aucun résultat',
}: DataTableProps<T>) {
  // --- Search with debounce ---
  const [internalSearch, setInternalSearch] = useState('');
  const searchValue = externalSearchValue ?? internalSearch;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setInternalSearch(value);
      if (onSearch) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onSearch(value);
        }, 300);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // --- Sorting ---
  const [sort, setSort] = useState<SortState>({ columnId: null, direction: null });

  const handleSort = useCallback(
    (columnId: string) => {
      const col = columns.find((c) => c.id === columnId);
      if (!col?.sortable) return;

      setSort((prev) => {
        if (prev.columnId !== columnId) return { columnId, direction: 'asc' };
        if (prev.direction === 'asc') return { columnId, direction: 'desc' };
        if (prev.direction === 'desc') return { columnId: null, direction: null };
        return { columnId, direction: 'asc' };
      });
    },
    [columns],
  );

  // --- Column visibility/ordering ---
  const [columnState, setColumnState] = useState<ColumnState[]>(() =>
    columns.map((col) => ({ id: col.id, visible: true })),
  );

  const handleColumnsChange = useCallback((state: ColumnState[]) => {
    setColumnState(state);
  }, []);

  const visibleColumns = useMemo(() => {
    const stateMap = new Map(columnState.map((s) => [s.id, s]));
    // Use columnState ordering for visible columns
    return columnState
      .filter((s) => s.visible)
      .map((s) => columns.find((c) => c.id === s.id))
      .filter((c): c is Column<T> => c !== undefined);
  }, [columns, columnState]);

  // --- Filters ---
  const [filters, setFilters] = useState<FilterValue[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // --- Client-side filter + sort ---
  const processedData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // Apply client-side filters
    if (filters.length > 0) {
      result = result.filter((row) => {
        return filters.every((filter) => {
          const col = columns.find((c) => c.id === filter.field);
          if (!col) return true;
          const value = col.accessorFn(row);
          return applyFilter(value, filter);
        });
      });
    }

    // Apply sort
    if (sort.columnId && sort.direction) {
      const col = columns.find((c) => c.id === sort.columnId);
      if (col) {
        result.sort((a, b) => {
          const aVal = col.accessorFn(a);
          const bVal = col.accessorFn(b);
          const cmp = compareValues(aVal, bVal);
          return sort.direction === 'asc' ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [data, filters, sort, columns]);

  // --- Column definitions for ColumnConfig ---
  const columnDefinitions = useMemo(
    () => columns.map((c) => ({ id: c.id, header: c.header })),
    [columns],
  );

  // --- Render ---
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Filter toggle */}
        {filterFields && filterFields.length > 0 && (
          <Button
            variant={showFilters || filters.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtres
            {filters.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {filters.length}
              </span>
            )}
          </Button>
        )}

        {/* Column config */}
        <ColumnConfig
          columns={columnDefinitions}
          pageId={pageId}
          onColumnsChange={handleColumnsChange}
        />

        {/* Actions slot */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Dynamic filters */}
      <AnimatePresence>
        {showFilters && filterFields && filterFields.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <DynamicFilters
              fields={filterFields}
              filters={filters}
              onChange={setFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.id}
                  style={{
                    width: col.width ? `${col.width}px` : undefined,
                    minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                  }}
                  className={
                    col.sortable
                      ? 'cursor-pointer select-none transition-colors hover:text-foreground'
                      : ''
                  }
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  <div className="flex items-center">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <SortIndicator
                        direction={sort.columnId === col.id ? sort.direction : null}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading skeleton */}
            {loading && (
              <>
                {Array.from({ length: 8 }).map((_, rowIdx) => (
                  <TableRow key={`skeleton-${rowIdx}`} className="hover:bg-transparent">
                    {visibleColumns.map((col) => (
                      <TableCell key={`skeleton-${rowIdx}-${col.id}`}>
                        <Skeleton className="h-4 w-full max-w-[180px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}

            {/* Empty state */}
            {!loading && processedData.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-48"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center gap-3 text-muted-foreground"
                  >
                    {emptyIcon ?? <Inbox className="h-10 w-10 text-muted-foreground/40" />}
                    <p className="text-sm">{emptyMessage}</p>
                  </motion.div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!loading && (
              <AnimatePresence mode="popLayout">
                {processedData.map((row, rowIdx) => (
                  <motion.tr
                    key={rowIdx}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{
                      duration: 0.2,
                      delay: Math.min(rowIdx * 0.03, 0.3),
                    }}
                    whileHover={onRowClick ? { scale: 1.002, backgroundColor: 'rgba(0,0,0,0.015)' } : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b transition-colors hover:bg-muted/50 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {visibleColumns.map((col) => {
                      const value = col.accessorFn(row);
                      return (
                        <td
                          key={col.id}
                          className="p-4 align-middle text-sm"
                          style={{
                            width: col.width ? `${col.width}px` : undefined,
                            minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                          }}
                        >
                          {col.cell ? col.cell(value, row) : String(value ?? '')}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Utilities ---

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string')
    return a.localeCompare(b, 'fr', { sensitivity: 'base' });
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' });
}

function applyFilter(value: unknown, filter: FilterValue): boolean {
  const { operator, value: filterVal } = filter;
  const strValue = value != null ? String(value).toLowerCase() : '';
  const strFilter = filterVal != null ? String(filterVal).toLowerCase() : '';

  switch (operator) {
    // Text
    case 'contains':
      return strValue.includes(strFilter);
    case 'equals':
      if (typeof value === 'number' && typeof filterVal === 'number')
        return value === filterVal;
      return strValue === strFilter;
    case 'starts_with':
      return strValue.startsWith(strFilter);
    case 'is_empty':
      return value == null || strValue === '';

    // Select
    case 'not_equals':
      return strValue !== strFilter;

    // Number
    case 'gt':
      return Number(value) > Number(filterVal);
    case 'lt':
      return Number(value) < Number(filterVal);
    case 'gte':
      return Number(value) >= Number(filterVal);
    case 'lte':
      return Number(value) <= Number(filterVal);

    // Boolean
    case 'is_true':
      return Boolean(value) === true;
    case 'is_false':
      return Boolean(value) === false;

    // Date
    case 'before':
      return new Date(String(value)) < new Date(String(filterVal));
    case 'after':
      return new Date(String(value)) > new Date(String(filterVal));

    default:
      return true;
  }
}

// Re-export types for convenience
export type { FilterField, FilterValue } from './dynamic-filters';
