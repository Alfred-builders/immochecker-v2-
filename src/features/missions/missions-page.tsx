import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, List, LayoutGrid, Map,
  CheckCircle2, Clock, AlertTriangle, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { AnimatedPage } from '@/components/animated-page';
import { DataTable, type Column, type FilterField } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

import { useMissions, useMissionStats } from './api';
import { CreateMissionDialog } from './create-mission-dialog';
import { MissionKanban } from './mission-kanban';
import { MissionMap } from './mission-map';
import {
  STATUT_LABELS, STATUT_COLORS, STATUT_RDV_LABELS, type Mission, type MissionStatut, type MissionStatutRdv,
} from './types';

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: Column<Mission>[] = [
  {
    id: 'reference',
    header: 'Réf.',
    accessorFn: (r) => r.reference,
    cell: (v) => <span className="font-mono text-xs font-medium">{String(v)}</span>,
    sortable: true,
    width: 130,
  },
  {
    id: 'statut',
    header: 'Statut',
    accessorFn: (r) => r.statut,
    cell: (v) => {
      const s = v as MissionStatut;
      return (
        <Badge variant="outline" className={STATUT_COLORS[s]}>
          {STATUT_LABELS[s]}
        </Badge>
      );
    },
    sortable: true,
    width: 120,
  },
  {
    id: 'lot',
    header: 'Lot / Bâtiment',
    accessorFn: (r) => r.lot_designation,
    cell: (v, row) => (
      <div>
        <p className="font-medium text-sm">{String(v ?? '—')}</p>
        <p className="text-xs text-muted-foreground">{row.batiment_designation}</p>
      </div>
    ),
    sortable: true,
    minWidth: 180,
  },
  {
    id: 'adresse',
    header: 'Adresse',
    accessorFn: (r) => [r.rue, r.ville].filter(Boolean).join(', '),
    cell: (v) => <span className="text-muted-foreground text-sm">{String(v || '—')}</span>,
    minWidth: 160,
  },
  {
    id: 'date_debut',
    header: 'Date prévue',
    accessorFn: (r) => r.date_debut,
    cell: (v) => {
      if (!v) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm">
          {format(new Date(String(v)), 'd MMM yyyy', { locale: fr })}
        </span>
      );
    },
    sortable: true,
    width: 130,
  },
  {
    id: 'techniciens',
    header: 'Techniciens',
    accessorFn: (r) => r.nb_techniciens ?? 0,
    cell: (v, row) => {
      const techs = row.techniciens ?? [];
      if (techs.length === 0)
        return <span className="text-muted-foreground text-xs">Non assignée</span>;
      return (
        <div className="flex -space-x-1">
          {techs.slice(0, 3).map((t) => (
            <div
              key={t.id ?? t.user_id}
              title={`${t.prenom} ${t.nom}`}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold uppercase"
            >
              {(t.prenom?.[0] ?? '') + (t.nom?.[0] ?? '')}
            </div>
          ))}
          {techs.length > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-muted text-[10px] font-medium">
              +{techs.length - 3}
            </div>
          )}
        </div>
      );
    },
    width: 120,
  },
  {
    id: 'statut_rdv',
    header: 'Statut RDV',
    accessorFn: (r) => r.statut_rdv,
    cell: (v) => {
      const rdvColors: Record<string, string> = {
        a_confirmer: 'bg-warning/10 text-warning border-warning/20',
        confirme: 'bg-success/10 text-success border-success/20',
        reporte: 'bg-destructive/10 text-destructive border-destructive/20',
      };
      const s = String(v || 'a_confirmer');
      return (
        <Badge variant="outline" className={rdvColors[s] ?? ''}>
          {STATUT_RDV_LABELS[s as MissionStatutRdv] ?? s}
        </Badge>
      );
    },
    width: 120,
  },
];

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const filterFields: FilterField[] = [
  {
    id: 'statut',
    label: 'Statut',
    type: 'select',
    options: Object.entries(STATUT_LABELS).map(([v, l]) => ({ value: v, label: l })),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ViewTab = 'liste' | 'kanban' | 'carte';

export function MissionsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewTab>('liste');
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: missions, isLoading } = useMissions({ search, statut: statut || undefined });
  const { data: stats } = useMissionStats();

  const tableData = useMemo(() => missions ?? [], [missions]);

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Missions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planifiez et suivez vos interventions EDL.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nouvelle mission
        </Button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total actives"
            value={Number(stats.total ?? 0)}
            icon={Calendar}
            color="bg-muted text-muted-foreground"
          />
          <StatCard
            label="Planifiées"
            value={Number(stats.planifiees ?? 0)}
            icon={Clock}
            color="bg-warning/10 text-warning"
          />
          <StatCard
            label="Assignées"
            value={Number(stats.assignees ?? 0)}
            icon={CheckCircle2}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            label="En retard"
            value={Number(stats.overdue ?? 0)}
            icon={AlertTriangle}
            color="bg-destructive/10 text-destructive"
          />
        </div>
      )}

      {/* View tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewTab)}>
          <TabsList>
            <TabsTrigger value="liste" className="gap-1.5">
              <List className="h-4 w-4" /> Liste
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="carte" className="gap-1.5">
              <Map className="h-4 w-4" /> Carte
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {view === 'liste' && (
        <DataTable<Mission>
          columns={columns}
          data={tableData}
          loading={isLoading}
          pageId="missions"
          searchPlaceholder="Rechercher par référence, lot, adresse..."
          onSearch={setSearch}
          searchValue={search}
          filterFields={filterFields}
          onRowClick={(row) => navigate(`/app/missions/${row.id}`)}
          emptyIcon={<Calendar className="h-10 w-10 text-muted-foreground/40" />}
          emptyMessage="Aucune mission pour le moment"
        />
      )}

      {view === 'kanban' && (
        <MissionKanban
          missions={tableData}
          loading={isLoading}
          onMissionClick={(m) => navigate(`/app/missions/${m.id}`)}
        />
      )}

      {view === 'carte' && (
        <MissionMap
          missions={tableData}
          loading={isLoading}
          onMissionClick={(m) => navigate(`/app/missions/${m.id}`)}
        />
      )}

      <CreateMissionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AnimatedPage>
  );
}
