import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search, Building2, Home, Users, Calendar,
  ArrowRight,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';

// ---------------------------------------------------------------------------

interface SearchResults {
  batiments: Array<{
    id: string; designation: string; type: string;
    rue?: string; ville?: string; nb_lots: number;
  }>;
  lots: Array<{
    id: string; designation: string; type_bien: string;
    batiment_designation: string; rue?: string; ville?: string;
  }>;
  tiers: Array<{
    id: string; type: string; nom_complet: string;
    email?: string; telephone?: string;
  }>;
  missions: Array<{
    id: string; reference: string; statut: string;
    date_debut?: string;
    lot_designation: string; batiment_designation: string;
  }>;
}

const STATUT_LABELS: Record<string, string> = {
  planifiee: 'Planifiée',
  assignee: 'Assignée',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ['global-search', q],
    queryFn: () => apiGet<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });
}

// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data } = useGlobalSearch(query);

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  function navigate_(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  const hasResults = data && (
    data.batiments.length > 0 ||
    data.lots.length > 0 ||
    data.tiers.length > 0 ||
    data.missions.length > 0
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher bâtiments, lots, tiers, missions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.length >= 2 && !hasResults && (
          <CommandEmpty>Aucun résultat pour "{query}"</CommandEmpty>
        )}
        {query.length < 2 && (
          <CommandEmpty>Tapez au moins 2 caractères pour rechercher...</CommandEmpty>
        )}

        {/* Bâtiments */}
        {(data?.batiments ?? []).length > 0 && (
          <>
            <CommandGroup heading="Bâtiments">
              {data!.batiments.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`batiment-${b.id}`}
                  onSelect={() => navigate_(`/app/patrimoine/batiments/${b.id}`)}
                  className="flex items-center gap-3"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.designation}</p>
                    {(b.rue || b.ville) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[b.rue, b.ville].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {b.nb_lots} lot{Number(b.nb_lots) > 1 ? 's' : ''}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Lots */}
        {(data?.lots ?? []).length > 0 && (
          <>
            <CommandGroup heading="Lots">
              {data!.lots.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lot-${l.id}`}
                  onSelect={() => navigate_(`/app/patrimoine/lots/${l.id}`)}
                  className="flex items-center gap-3"
                >
                  <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.designation}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.batiment_designation}
                      {l.ville && ` · ${l.ville}`}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Tiers */}
        {(data?.tiers ?? []).length > 0 && (
          <>
            <CommandGroup heading="Tiers">
              {data!.tiers.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`tiers-${t.id}`}
                  onSelect={() => navigate_(`/app/tiers/${t.id}`)}
                  className="flex items-center gap-3"
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.nom_complet}</p>
                    {t.email && (
                      <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {t.type === 'morale' ? 'PM' : 'PP'}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Missions */}
        {(data?.missions ?? []).length > 0 && (
          <CommandGroup heading="Missions">
            {data!.missions.map((m) => (
              <CommandItem
                key={m.id}
                value={`mission-${m.id}`}
                onSelect={() => navigate_(`/app/missions/${m.id}`)}
                className="flex items-center gap-3"
              >
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium font-mono text-sm">{m.reference}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.lot_designation}
                    {m.date_debut && ` · ${format(new Date(m.date_debut), 'd MMM', { locale: fr })}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {STATUT_LABELS[m.statut] ?? m.statut}
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
