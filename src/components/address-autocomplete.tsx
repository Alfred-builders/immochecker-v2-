import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// BAN API types (api-adresse.data.gouv.fr)
// ---------------------------------------------------------------------------

interface BanFeature {
  properties: {
    label: string;
    name: string;
    postcode: string;
    city: string;
    context: string;
    housenumber?: string;
    street?: string;
    type: string;
  };
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
}

interface BanResponse {
  features: BanFeature[];
}

export interface AddressResult {
  rue: string;
  complement?: string;
  code_postal: string;
  ville: string;
  latitude?: number;
  longitude?: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddressAutocompleteProps {
  value?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onSelect: (result: AddressResult) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddressAutocomplete({
  value = '',
  placeholder = 'Rechercher une adresse...',
  className,
  inputClassName,
  onSelect,
  onChange,
  disabled,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<BanFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ q, limit: '5' });
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`);
      const data: BanResponse = await res.json();
      setResults(data.features ?? []);
      setIsOpen(data.features.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(feature: BanFeature) {
    const { properties: p, geometry } = feature;
    const result: AddressResult = {
      rue: p.name,
      code_postal: p.postcode,
      ville: p.city,
      latitude: geometry.coordinates[1],
      longitude: geometry.coordinates[0],
      label: p.label,
    };

    setQuery(p.label);
    setIsOpen(false);
    setResults([]);
    onSelect(result);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pl-8', inputClassName)}
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-[200px] overflow-y-auto py-1">
            {results.map((feature, i) => (
              <li
                key={`${feature.properties.label}-${i}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                  i === activeIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(feature);
                }}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {feature.properties.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {feature.properties.postcode} {feature.properties.city}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
