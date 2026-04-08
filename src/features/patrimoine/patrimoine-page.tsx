import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Home, Upload, ChevronRight, ChevronDown,
  Search, Filter, Layers,
} from 'lucide-react';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { useBatiments, useLots } from './api';
import { CreateBuildingDialog } from './create-building-dialog';
import { CreateHouseDialog } from './create-house-dialog';
import { ImportCSVDialog } from './import-csv-dialog';
import { formatAdresse, type Batiment, type Lot } from './types';

// ---------------------------------------------------------------------------
// Badge color map
// ---------------------------------------------------------------------------

const TYPE_BADGE_CLASSES: Record<string, string> = {
  immeuble: 'bg-primary/10 text-primary border-primary/20',
  maison: 'bg-success/10 text-success border-success/20',
  commercial: 'bg-warning/10 text-warning border-warning/20',
  mixte: 'bg-secondary text-secondary-foreground border-border',
};

const LOT_TYPE_ICONS: Record<string, string> = {
  appartement: '🏠',
  maison: '🏡',
  studio: '🛏️',
  box_parking: '🚗',
  bureau: '💼',
  local_commercial: '🏪',
  cave: '📦',
  autre: '📋',
};

// ---------------------------------------------------------------------------
// Sub-row: lots for a building
// ---------------------------------------------------------------------------

function LotsSubRows({
  batimentId,
  colSpan,
}: {
  batimentId: string;
  colSpan: number;
}) {
  const navigate = useNavigate();
  const { data: lots, isLoading } = useLots({ batiment_id: batimentId });

  if (isLoading) {
    return (
      <tr className="bg-muted/20">
        <td colSpan={colSpan} className="px-4 py-3">
          <div className="space-y-2 pl-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-3/4" />
            ))}
          </div>
        </td>
      </tr>
    );
  }

  if (!lots || lots.length === 0) {
    return (
      <tr className="bg-muted/20">
        <td colSpan={colSpan} className="px-4 py-3">
          <p className="text-xs text-muted-foreground pl-8 italic">Aucun lot</p>
        </td>
      </tr>
    );
  }

  return (
    <>
      {lots.map((lot) => (
        <tr
          key={lot.id}
          className="bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors border-b last:border-b-0"
          onClick={() => navigate(`/app/patrimoine/lots/${lot.id}`)}
        >
          <td className="p-3 pl-8" colSpan={colSpan}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-base">
                  {LOT_TYPE_ICONS[lot.type_bien] ?? '📋'}
                </span>
                <div>
                  <p className="text-sm font-medium">{lot.designation}</p>
                  <p className="text-xs text-muted-foreground">
                    {lot.type_bien.replace(/_/g, ' ')}
                    {lot.etage && ` · Étage ${lot.etage}`}
                    {lot.surface && ` · ${lot.surface} m²`}
                    {lot.meuble && ' · Meublé'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lot.reference_interne && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {lot.reference_interne}
                  </span>
                )}
                {lot.est_archive && (
                  <Badge variant="secondary" className="text-xs h-5">Archivé</Badge>
                )}
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PatrimoinePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: batiments, isLoading } = useBatiments({ search });
  const tableData = useMemo(() => batiments ?? [], [batiments]);

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const COL_COUNT = 5; // chevron + designation + type + adresse + lots + ref

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Parc immobilier
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos bâtiments, lots et équipements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setHouseOpen(true)}
          >
            <Home className="h-4 w-4" />
            Maison
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setBuildingOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau bâtiment
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par désignation ou adresse..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        {expandedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setExpandedIds(new Set())}
          >
            <Layers className="h-3.5 w-3.5" />
            Replier tout
          </Button>
        )}
      </div>

      {/* Expandable table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10" />
              <th className="text-left p-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Désignation
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground text-xs uppercase tracking-wide w-[130px]">
                Type
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Adresse
              </th>
              <th className="text-right p-4 font-medium text-muted-foreground text-xs uppercase tracking-wide w-[80px]">
                Lots
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground text-xs uppercase tracking-wide w-[120px]">
                Réf. interne
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Loading skeleton */}
            {isLoading && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b">
                    <td className="p-3" />
                    <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-8 ml-auto" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))}
              </>
            )}

            {/* Empty state */}
            {!isLoading && tableData.length === 0 && (
              <tr>
                <td colSpan={6} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Building2 className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm">Aucun bâtiment pour le moment</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isLoading && tableData.map((batiment) => {
              const isExpanded = expandedIds.has(batiment.id);

              return (
                <>
                  {/* Building row */}
                  <tr
                    key={batiment.id}
                    className={`border-b transition-colors hover:bg-muted/50 cursor-pointer group ${
                      isExpanded ? 'bg-muted/20' : ''
                    }`}
                    onClick={() => navigate(`/app/patrimoine/batiments/${batiment.id}`)}
                  >
                    {/* Chevron toggle */}
                    <td className="pl-3 pr-0 py-3 w-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => toggleExpand(batiment.id, e)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                        )}
                      </Button>
                    </td>

                    {/* Designation */}
                    <td className="p-4">
                      <span className="font-medium text-foreground">{batiment.designation}</span>
                    </td>

                    {/* Type badge */}
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={TYPE_BADGE_CLASSES[batiment.type] ?? 'bg-muted text-muted-foreground'}
                      >
                        {batiment.type.charAt(0).toUpperCase() + batiment.type.slice(1)}
                      </Badge>
                    </td>

                    {/* Adresse */}
                    <td className="p-4 text-muted-foreground">
                      {formatAdresse(batiment.adresse_principale) || '—'}
                    </td>

                    {/* Nb lots */}
                    <td className="p-4 text-right tabular-nums font-medium">
                      {batiment.nb_lots}
                    </td>

                    {/* Ref interne */}
                    <td className="p-4 text-muted-foreground text-xs font-mono">
                      {batiment.reference_interne || '—'}
                    </td>
                  </tr>

                  {/* Expanded lots sub-rows */}
                  {isExpanded && (
                    <LotsSubRows
                      key={`lots-${batiment.id}`}
                      batimentId={batiment.id}
                      colSpan={6}
                    />
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <CreateBuildingDialog open={buildingOpen} onOpenChange={setBuildingOpen} />
      <CreateHouseDialog open={houseOpen} onOpenChange={setHouseOpen} />
      <ImportCSVDialog open={importOpen} onOpenChange={setImportOpen} />
    </AnimatedPage>
  );
}
