import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { usePreferences, useUpdatePreferences } from '@/hooks/use-preferences';

// --- Types ---

export interface ColumnDefinition {
  id: string;
  header: string;
}

export interface ColumnState {
  id: string;
  visible: boolean;
}

interface ColumnConfigProps {
  columns: ColumnDefinition[];
  pageId: string;
  onColumnsChange: (state: ColumnState[]) => void;
}

// --- Component ---

export function ColumnConfig({ columns, pageId, onColumnsChange }: ColumnConfigProps) {
  const { data: preferences } = usePreferences(pageId);
  const { mutate: updatePreferences } = useUpdatePreferences(pageId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build column state from preferences or defaults
  const [columnState, setColumnState] = useState<ColumnState[]>(() =>
    columns.map((col) => ({ id: col.id, visible: true })),
  );

  // Sync from preferences when they load
  useEffect(() => {
    const saved = preferences?.config?.columns as ColumnState[] | undefined;
    if (saved && Array.isArray(saved)) {
      // Merge saved state with current columns (handle new/removed columns)
      const savedMap = new Map(saved.map((s) => [s.id, s]));
      const merged = columns.map((col) => ({
        id: col.id,
        visible: savedMap.get(col.id)?.visible ?? true,
      }));

      // Preserve saved ordering where possible
      const savedOrder = saved.map((s) => s.id);
      merged.sort((a, b) => {
        const aIdx = savedOrder.indexOf(a.id);
        const bIdx = savedOrder.indexOf(b.id);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

      setColumnState(merged);
      onColumnsChange(merged);
    }
  }, [preferences, columns, onColumnsChange]);

  // Debounced save to API
  const persistState = useCallback(
    (state: ColumnState[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updatePreferences({
          ...(preferences?.config ?? {}),
          columns: state,
        });
      }, 500);
    },
    [updatePreferences, preferences],
  );

  const updateState = useCallback(
    (newState: ColumnState[]) => {
      setColumnState(newState);
      onColumnsChange(newState);
      persistState(newState);
    },
    [onColumnsChange, persistState],
  );

  const toggleColumn = useCallback(
    (id: string) => {
      const next = columnState.map((col) =>
        col.id === id ? { ...col, visible: !col.visible } : col,
      );
      updateState(next);
    },
    [columnState, updateState],
  );

  const moveColumn = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= columnState.length) return;
      const next = [...columnState];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      updateState(next);
    },
    [columnState, updateState],
  );

  const showAll = useCallback(() => {
    const next = columnState.map((col) => ({ ...col, visible: true }));
    updateState(next);
  }, [columnState, updateState]);

  const getColumnLabel = (id: string) =>
    columns.find((c) => c.id === id)?.header ?? id;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Settings2 className="h-3.5 w-3.5" />
          Colonnes
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-0">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Colonnes visibles</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={showAll}
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Tout afficher
            </Button>
          </div>
        </div>
        <Separator />
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          <AnimatePresence mode="popLayout">
            {columnState.map((col, index) => (
              <motion.div
                key={col.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                {/* Grip icon (visual only) */}
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />

                {/* Label */}
                <span className="flex-1 truncate text-sm">
                  {getColumnLabel(col.id)}
                </span>

                {/* Reorder buttons */}
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => moveColumn(index, 'up')}
                    disabled={index === 0}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveColumn(index, 'down')}
                    disabled={index === columnState.length - 1}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Toggle */}
                <Switch
                  checked={col.visible}
                  onCheckedChange={() => toggleColumn(col.id)}
                  className="scale-75"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
