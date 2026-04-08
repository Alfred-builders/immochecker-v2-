import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Building, User } from 'lucide-react';

import { AnimatedPage } from '@/components/animated-page';
import { DataTable, type Column, type FilterField } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useTiersList } from './api';
import { CreateTiersDialog } from './create-tiers-dialog';
import { displayName, formatRoles, type Tiers, type TiersRole } from './types';

// ---------------------------------------------------------------------------
// Badge colors
// ---------------------------------------------------------------------------

const TYPE_BADGE_CLASSES: Record<string, string> = {
  personne_physique: 'bg-blue-100 text-blue-700 border-blue-200',
  personne_morale: 'bg-violet-100 text-violet-700 border-violet-200',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  proprietaire: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  locataire: 'bg-amber-100 text-amber-700 border-amber-200',
  mandataire: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const TYPE_LABELS: Record<string, string> = {
  personne_physique: 'Personne physique',
  personne_morale: 'Personne morale',
};

const ROLE_LABELS: Record<string, string> = {
  proprietaire: 'Propriétaire',
  locataire: 'Locataire',
  mandataire: 'Mandataire',
};

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

type TabValue = 'tous' | 'proprietaire' | 'locataire' | 'mandataire';

const TABS: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: 'proprietaire', label: 'Propriétaires', icon: User },
  { value: 'locataire', label: 'Locataires', icon: User },
  { value: 'mandataire', label: 'Mandataires', icon: Building },
  { value: 'tous', label: 'Tous', icon: Users },
];

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: Column<Tiers>[] = [
  {
    id: 'nom',
    header: 'Nom',
    accessorFn: (row) => displayName(row),
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
      const t = String(value);
      return (
        <Badge
          variant="outline"
          className={TYPE_BADGE_CLASSES[t] ?? 'bg-muted text-muted-foreground'}
        >
          {TYPE_LABELS[t] ?? t}
        </Badge>
      );
    },
    sortable: true,
    width: 160,
  },
  {
    id: 'roles',
    header: 'Rôles',
    accessorFn: (row) => row.roles,
    cell: (value) => {
      const roles = value as TiersRole[] | undefined;
      if (!roles || roles.length === 0) {
        return <span className="text-muted-foreground/50">--</span>;
      }
      return (
        <div className="flex gap-1 flex-wrap">
          {roles.map((r) => (
            <Badge
              key={r}
              variant="outline"
              className={ROLE_BADGE_CLASSES[r] ?? ''}
            >
              {ROLE_LABELS[r] ?? r}
            </Badge>
          ))}
        </div>
      );
    },
    width: 200,
  },
  {
    id: 'email',
    header: 'Email',
    accessorFn: (row) => row.email ?? '',
    cell: (value) => (
      <span className="text-muted-foreground">{String(value) || '--'}</span>
    ),
    minWidth: 180,
  },
  {
    id: 'telephone',
    header: 'Téléphone',
    accessorFn: (row) => row.telephone ?? '',
    cell: (value) => (
      <span className="text-muted-foreground">{String(value) || '--'}</span>
    ),
    width: 140,
  },
  {
    id: 'ville',
    header: 'Ville',
    accessorFn: (row) => row.ville ?? '',
    cell: (value) => (
      <span className="text-muted-foreground">{String(value) || '--'}</span>
    ),
    width: 130,
  },
  {
    id: 'nb_lots',
    header: 'Lots',
    accessorFn: (row) => row.nb_lots ?? 0,
    cell: (value) => (
      <span className="block text-right tabular-nums">{String(value)}</span>
    ),
    sortable: true,
    width: 70,
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
      { label: 'Personne physique', value: 'personne_physique' },
      { label: 'Personne morale', value: 'personne_morale' },
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

export function TiersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabValue>('proprietaire');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tiers, isLoading } = useTiersList({
    search,
    role: activeTab === 'tous' ? undefined : activeTab,
  });

  const tableData = useMemo(() => tiers ?? [], [tiers]);

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tiers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos propriétaires, locataires et mandataires.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nouveau tiers
        </Button>
      </div>

      {/* Tabs (US808) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList className="bg-muted/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Data table */}
      <DataTable<Tiers>
        columns={columns}
        data={tableData}
        loading={isLoading}
        pageId={`tiers-${activeTab}`}
        searchPlaceholder="Rechercher par nom, email, téléphone..."
        onSearch={setSearch}
        searchValue={search}
        filterFields={filterFields}
        onRowClick={(row) => navigate(`/app/tiers/${row.id}`)}
        emptyIcon={<Users className="h-10 w-10 text-muted-foreground/40" />}
        emptyMessage="Aucun tiers pour le moment"
      />

      {/* Create dialog */}
      <CreateTiersDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AnimatedPage>
  );
}
