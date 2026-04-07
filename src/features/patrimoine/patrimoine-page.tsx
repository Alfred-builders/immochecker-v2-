import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Home, Upload } from 'lucide-react';

import { AnimatedPage } from '@/components/animated-page';
import { DataTable, type Column, type FilterField } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useBatiments } from './api';
import { CreateBuildingDialog } from './create-building-dialog';
import { CreateHouseDialog } from './create-house-dialog';
import { ImportCSVDialog } from './import-csv-dialog';
import { formatAdresse, type Batiment } from './types';

// ---------------------------------------------------------------------------
// Badge color map
// ---------------------------------------------------------------------------

const TYPE_BADGE_CLASSES: Record<string, string> = {
  immeuble: 'bg-blue-100 text-blue-700 border-blue-200',
  maison: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  commercial: 'bg-amber-100 text-amber-700 border-amber-200',
  mixte: 'bg-purple-100 text-purple-700 border-purple-200',
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: Column<Batiment>[] = [
  {
    id: 'designation',
    header: 'Désignation',
    accessorFn: (row) => row.designation,
    cell: (value) => (
      <span className="font-medium text-foreground">{String(value)}</span>
    ),
    sortable: true,
    minWidth: 200,
  },
  {
    id: 'type',
    header: 'Type',
    accessorFn: (row) => row.type,
    cell: (value) => {
      const type = String(value);
      return (
        <Badge
          variant="outline"
          className={TYPE_BADGE_CLASSES[type] ?? 'bg-muted text-muted-foreground'}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    },
    sortable: true,
    width: 130,
  },
  {
    id: 'adresse_principale',
    header: 'Adresse',
    accessorFn: (row) => formatAdresse(row.adresse_principale),
    sortable: true,
    minWidth: 200,
  },
  {
    id: 'nb_lots',
    header: 'Lots',
    accessorFn: (row) => row.nb_lots,
    cell: (value) => (
      <span className="block text-right tabular-nums">{String(value)}</span>
    ),
    sortable: true,
    width: 80,
  },
  {
    id: 'reference_interne',
    header: 'Réf. interne',
    accessorFn: (row) => row.reference_interne ?? '',
    cell: (value) => (
      <span className="text-muted-foreground">{String(value)}</span>
    ),
    width: 120,
  },
];

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------

const filterFields: FilterField[] = [
  {
    id: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'Immeuble', value: 'immeuble' },
      { label: 'Maison', value: 'maison' },
      { label: 'Commercial', value: 'commercial' },
      { label: 'Mixte', value: 'mixte' },
      { label: 'Autre', value: 'autre' },
    ],
  },
  {
    id: 'est_archive',
    label: 'Archivé',
    type: 'boolean',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatrimoinePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Dialogs
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: batiments, isLoading } = useBatiments({ search });

  const tableData = useMemo(() => batiments ?? [], [batiments]);

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
            className="gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8]"
            onClick={() => setBuildingOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau bâtiment
          </Button>
        </div>
      </div>

      {/* Data table */}
      <DataTable<Batiment>
        columns={columns}
        data={tableData}
        loading={isLoading}
        pageId="patrimoine"
        searchPlaceholder="Rechercher par désignation ou adresse..."
        onSearch={setSearch}
        searchValue={search}
        filterFields={filterFields}
        onRowClick={(row) => navigate(`/app/patrimoine/batiments/${row.id}`)}
        emptyIcon={
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
        }
        emptyMessage="Aucun bâtiment pour le moment"
      />

      {/* Dialogs */}
      <CreateBuildingDialog open={buildingOpen} onOpenChange={setBuildingOpen} />
      <CreateHouseDialog open={houseOpen} onOpenChange={setHouseOpen} />
      <ImportCSVDialog open={importOpen} onOpenChange={setImportOpen} />
    </AnimatedPage>
  );
}
