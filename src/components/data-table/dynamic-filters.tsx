import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// --- Types ---

export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'date';
  options?: { label: string; value: string }[];
}

export interface FilterValue {
  field: string;
  operator: string;
  value: unknown;
}

interface DynamicFiltersProps {
  fields: FilterField[];
  filters: FilterValue[];
  onChange: (filters: FilterValue[]) => void;
}

// --- Operator maps ---

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: 'contains', label: 'Contient' },
    { value: 'equals', label: 'Est' },
    { value: 'starts_with', label: 'Commence par' },
    { value: 'is_empty', label: 'Est vide' },
  ],
  select: [
    { value: 'equals', label: 'Est' },
    { value: 'not_equals', label: "N'est pas" },
    { value: 'is_empty', label: 'Est vide' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
  ],
  boolean: [
    { value: 'is_true', label: 'Vrai' },
    { value: 'is_false', label: 'Faux' },
  ],
  date: [
    { value: 'equals', label: 'Le' },
    { value: 'before', label: 'Avant' },
    { value: 'after', label: 'Apres' },
  ],
};

function getOperatorsForType(type: string) {
  return OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.text;
}

function isNoValueOperator(operator: string) {
  return ['is_empty', 'is_true', 'is_false'].includes(operator);
}

function getOperatorLabel(type: string, operator: string): string {
  const ops = getOperatorsForType(type);
  return ops.find((o) => o.value === operator)?.label ?? operator;
}

// --- Components ---

interface FilterRowProps {
  filter: FilterValue;
  index: number;
  fields: FilterField[];
  onChange: (index: number, updated: FilterValue) => void;
  onRemove: (index: number) => void;
}

function FilterRow({ filter, index, fields, onChange, onRemove }: FilterRowProps) {
  const field = fields.find((f) => f.id === filter.field);
  const fieldType = field?.type ?? 'text';
  const operators = getOperatorsForType(fieldType);
  const hideValue = isNoValueOperator(filter.operator);

  const handleFieldChange = (fieldId: string) => {
    const newField = fields.find((f) => f.id === fieldId);
    const newType = newField?.type ?? 'text';
    const newOps = getOperatorsForType(newType);
    onChange(index, {
      field: fieldId,
      operator: newOps[0].value,
      value: '',
    });
  };

  const handleOperatorChange = (operator: string) => {
    onChange(index, {
      ...filter,
      operator,
      value: isNoValueOperator(operator) ? '' : filter.value,
    });
  };

  const handleValueChange = (value: unknown) => {
    onChange(index, { ...filter, value });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-2 py-1.5">
        {/* Field select */}
        <Select value={filter.field} onValueChange={handleFieldChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Champ..." />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator select */}
        <Select value={filter.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value input */}
        {!hideValue && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
          >
            <FilterValueInput
              field={field}
              value={filter.value}
              onChange={handleValueChange}
            />
          </motion.div>
        )}

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

interface FilterValueInputProps {
  field: FilterField | undefined;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FilterValueInput({ field, value, onChange }: FilterValueInputProps) {
  const type = field?.type ?? 'text';

  if (type === 'select' && field?.options) {
    return (
      <Select
        value={String(value ?? '')}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Valeur..." />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked)}
      />
    );
  }

  if (type === 'number') {
    return (
      <Input
        type="number"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        placeholder="Valeur..."
        className="h-8 w-[120px] text-xs"
      />
    );
  }

  if (type === 'date') {
    return (
      <Input
        type="date"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-[150px] text-xs"
      />
    );
  }

  // Default: text
  return (
    <Input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Valeur..."
      className="h-8 w-[160px] text-xs"
    />
  );
}

// --- Main component ---

export function DynamicFilters({ fields, filters, onChange }: DynamicFiltersProps) {
  const [isOpen, setIsOpen] = useState(filters.length > 0);

  const addFilter = useCallback(() => {
    if (fields.length === 0) return;
    const firstField = fields[0];
    const ops = getOperatorsForType(firstField.type);
    onChange([
      ...filters,
      { field: firstField.id, operator: ops[0].value, value: '' },
    ]);
    setIsOpen(true);
  }, [fields, filters, onChange]);

  const updateFilter = useCallback(
    (index: number, updated: FilterValue) => {
      const next = [...filters];
      next[index] = updated;
      onChange(next);
    },
    [filters, onChange],
  );

  const removeFilter = useCallback(
    (index: number) => {
      const next = filters.filter((_, i) => i !== index);
      onChange(next);
      if (next.length === 0) setIsOpen(false);
    },
    [filters, onChange],
  );

  const clearAll = useCallback(() => {
    onChange([]);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className="space-y-2">
      {/* Active filter badges */}
      <AnimatePresence mode="popLayout">
        {filters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap items-center gap-1.5"
          >
            {filters.map((filter, idx) => {
              const field = fields.find((f) => f.id === filter.field);
              const label = field?.label ?? filter.field;
              const opLabel = getOperatorLabel(field?.type ?? 'text', filter.operator);
              const displayValue = isNoValueOperator(filter.operator)
                ? ''
                : ` "${filter.value}"`;

              return (
                <motion.div
                  key={`badge-${idx}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 pr-1 text-xs font-normal"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">{opLabel}</span>
                    {displayValue && (
                      <span>{displayValue}</span>
                    )}
                    <button
                      onClick={() => removeFilter(idx)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </motion.div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              Tout effacer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter rows */}
      <AnimatePresence mode="popLayout">
        {isOpen && filters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-lg border bg-background p-3"
          >
            <AnimatePresence mode="popLayout">
              {filters.map((filter, idx) => (
                <FilterRow
                  key={`row-${idx}`}
                  filter={filter}
                  index={idx}
                  fields={fields}
                  onChange={updateFilter}
                  onRemove={removeFilter}
                />
              ))}
            </AnimatePresence>
            <motion.div layout className="pt-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={addFilter}
                className="h-7 gap-1.5 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un filtre
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add filter button (when no filters open) */}
      {!isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={addFilter}
          className="h-8 gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Filtre
        </Button>
      )}
    </div>
  );
}
