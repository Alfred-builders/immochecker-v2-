import { useState } from 'react';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle,
  Users, Plus, ChevronLeft, ChevronRight,
  CalendarPlus, BanknoteIcon,
} from 'lucide-react';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, isToday, startOfMonth, getDaysInMonth, getDay,
  addMonths, subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useMissions, useMissionStats, useIndisponibilites } from '@/features/missions/api';
import { STATUT_COLORS, STATUT_LABELS, type Mission, type MissionStatut, type Indisponibilite } from '@/features/missions/types';
import { CreateMissionDialog } from '@/features/missions/create-mission-dialog';
import { CreateIndisponibiliteDialog } from '@/features/missions/create-indisponibilite-dialog';
import { MissionDrawer } from '@/features/missions/mission-drawer';

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-4xl font-bold tracking-tight tabular-nums">{value}</p>
        {sub && <p className="text-sm text-muted-foreground mt-1.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Weekly calendar
// ---------------------------------------------------------------------------

const STATUT_PASTEL: Record<MissionStatut, string> = {
  planifiee: 'bg-warning/10 border-warning/30 text-warning',
  assignee: 'bg-primary/10 border-primary/30 text-primary',
  terminee: 'bg-success/10 border-success/30 text-success',
  annulee: 'bg-destructive/10 border-destructive/30 text-destructive',
};

function WeeklyCalendar({
  missions,
  indisponibilites,
  week,
  onWeekChange,
  onMissionClick,
}: {
  missions: Mission[];
  indisponibilites: Indisponibilite[];
  week: Date;
  onWeekChange: (d: Date) => void;
  onMissionClick: (m: Mission) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b px-4 py-3 space-y-0">
        <CardTitle className="text-sm font-semibold">Calendrier semaine</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => onWeekChange(subWeeks(week, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {format(week, 'd MMM', { locale: fr })} — {format(addDays(week, 6), 'd MMM yyyy', { locale: fr })}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => onWeekChange(addWeeks(week, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 divide-x">
          {days.map((day) => {
            const dayMissions = missions.filter(
              (m) => m.date_debut && isSameDay(new Date(m.date_debut), day),
            );
            const today = isToday(day);

            return (
              <div key={day.toISOString()} className="min-h-[120px] p-2">
                <div className="mb-2 flex flex-col items-center">
                  <span className="text-[11px] uppercase text-muted-foreground">
                    {format(day, 'EEE', { locale: fr })}
                  </span>
                  <span className={`text-sm font-semibold rounded-full h-6 w-6 flex items-center justify-center
                    ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {/* Indisponibilités */}
                  {indisponibilites
                    .filter((ind) => {
                      const start = new Date(ind.date_debut);
                      const end = new Date(ind.date_fin);
                      return day >= start && day <= end;
                    })
                    .map((ind) => (
                      <div
                        key={ind.id}
                        className="rounded border px-1.5 py-1 text-[11px] font-medium truncate bg-muted/50 border-muted text-muted-foreground"
                        title={`${ind.titre} — ${ind.prenom} ${ind.nom}`}
                      >
                        {ind.titre}
                      </div>
                    ))}
                  {/* Missions */}
                  {dayMissions.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onMissionClick(m)}
                      className={`cursor-pointer rounded border px-1.5 py-1 text-[11px] font-medium truncate
                        ${STATUT_PASTEL[m.statut as MissionStatut]}`}
                      title={m.lot_designation ?? m.reference}
                    >
                      {m.heure_debut ? m.heure_debut.slice(0, 5) + ' ' : ''}
                      {m.lot_designation ?? m.reference}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mini calendar
// ---------------------------------------------------------------------------

function MiniCalendar({
  month,
  missions,
  onMonthChange,
  onDayClick,
}: {
  month: Date;
  missions: Mission[];
  onMonthChange: (d: Date) => void;
  onDayClick: (d: Date) => void;
}) {
  const firstDay = startOfMonth(month);
  const daysInMonth = getDaysInMonth(month);
  const startOffset = (getDay(firstDay) + 6) % 7;

  const cells = Array.from({ length: startOffset }, () => null as Date | null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => addDays(firstDay, i)));

  const missionDays = new Set(
    missions
      .filter((m) => m.date_debut)
      .map((m) => format(new Date(m.date_debut!), 'yyyy-MM-dd')),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2 space-y-0 px-4 pt-4">
        <CardTitle className="text-sm font-semibold capitalize">
          {format(month, 'MMMM yyyy', { locale: fr })}
        </CardTitle>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
            onClick={() => onMonthChange(subMonths(month, 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
            onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const key = format(day, 'yyyy-MM-dd');
            const hasMission = missionDays.has(key);
            const today = isToday(day);

            return (
              <button
                key={key}
                onClick={() => onDayClick(day)}
                className={`relative flex items-center justify-center rounded text-xs h-7 w-full transition-colors
                  ${today ? 'bg-primary text-primary-foreground font-semibold' :
                    hasMission ? 'text-foreground hover:bg-muted font-medium' :
                    'text-muted-foreground hover:bg-muted'}`}
              >
                {format(day, 'd')}
                {hasMission && !today && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pending actions — 3 types (US-841)
// ---------------------------------------------------------------------------

function PendingActions({
  missions,
  onMissionClick,
}: {
  missions: Mission[];
  onMissionClick: (m: Mission) => void;
}) {
  // Type 1: Missions non assignées
  const unassigned = missions.filter(
    (m) => m.statut === 'planifiee' && (m.techniciens ?? []).length === 0,
  ).slice(0, 4);

  // Type 2: Invitations en attente
  const invitePending = missions.filter(
    (m) => (m.techniciens ?? []).some((t) => t.statut_invitation === 'en_attente'),
  ).slice(0, 4);

  // Type 3: RDV à confirmer (non terminées / annulées)
  const rdvPending = missions.filter(
    (m) => m.statut_rdv === 'a_confirmer' &&
      m.statut !== 'terminee' && m.statut !== 'annulee',
  ).slice(0, 4);

  const isEmpty = unassigned.length === 0 && invitePending.length === 0 && rdvPending.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Actions en attente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {unassigned.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Non assignées ({unassigned.length})
            </p>
            <div className="space-y-1.5">
              {unassigned.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onMissionClick(m)}
                  className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{m.lot_designation ?? m.reference}</p>
                    <p className="text-xs text-muted-foreground">{m.batiment_designation}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 bg-warning/10 text-warning border-warning/20">
                    Assigner
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {invitePending.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Invitations en attente ({invitePending.length})
            </p>
            <div className="space-y-1.5">
              {invitePending.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onMissionClick(m)}
                  className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{m.lot_designation ?? m.reference}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.date_debut ? format(new Date(m.date_debut), 'd MMM', { locale: fr }) : 'Sans date'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 bg-primary/10 text-primary border-primary/20">
                    En attente
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {rdvPending.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> RDV à confirmer ({rdvPending.length})
            </p>
            <div className="space-y-1.5">
              {rdvPending.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onMissionClick(m)}
                  className="flex items-center justify-between rounded-md border border-warning/20 bg-warning/5 px-3 py-2 cursor-pointer hover:bg-warning/10 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-warning">{m.lot_designation ?? m.reference}</p>
                    <p className="text-xs text-warning/70">
                      {m.date_debut && format(new Date(m.date_debut), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${STATUT_COLORS[m.statut as MissionStatut]}`}>
                    {STATUT_LABELS[m.statut as MissionStatut]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 text-success" />
            <p className="text-sm">Tout est à jour !</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const [week, setWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [month, setMonth] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [indispoOpen, setIndispoOpen] = useState(false);
  const [drawerMissionId, setDrawerMissionId] = useState<string | null>(null);

  const { data: allMissions = [] } = useMissions({});
  const { data: stats } = useMissionStats();
  const weekStart = format(week, 'yyyy-MM-dd');
  const weekEnd = format(addDays(week, 6), 'yyyy-MM-dd');
  const { data: indisponibilites = [] } = useIndisponibilites({ date_from: weekStart, date_to: weekEnd });

  function handleMissionClick(m: Mission) {
    setDrawerMissionId(m.id);
  }

  function handleDayClick(day: Date) {
    setWeek(startOfWeek(day, { weekStartsOn: 1 }));
  }

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>

        {/* US-840: "+" dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nouveau
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Nouvelle mission
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIndispoOpen(true)} className="gap-2">
              <BanknoteIcon className="h-4 w-4" />
              Indisponibilité
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Missions actives"
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
            sub={Number(stats.overdue ?? 0) > 0 ? 'Action requise' : 'Aucune en retard'}
            icon={AlertTriangle}
            color={Number(stats.overdue ?? 0) > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}
          />
        </div>
      )}

      {/* Calendar + side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <WeeklyCalendar
          missions={allMissions}
          indisponibilites={indisponibilites}
          week={week}
          onWeekChange={setWeek}
          onMissionClick={handleMissionClick}
        />

        <div className="space-y-4">
          <MiniCalendar
            month={month}
            missions={allMissions}
            onMonthChange={setMonth}
            onDayClick={handleDayClick}
          />
          <PendingActions
            missions={allMissions}
            onMissionClick={handleMissionClick}
          />
        </div>
      </div>

      {/* Prochaines missions */}
      {stats?.upcoming?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Prochaines missions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {stats.upcoming.map((m: any) => (
              <div
                key={m.id}
                onClick={() => handleMissionClick(m)}
                className="flex items-center justify-between rounded-md border px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{m.lot_designation ?? m.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.batiment_designation}{m.ville && ` · ${m.ville}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {format(new Date(m.date_debut), 'd MMM', { locale: fr })}
                  </p>
                  {m.heure_debut && (
                    <p className="text-xs text-muted-foreground">
                      {m.heure_debut.slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dialogs & Drawer */}
      <CreateMissionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateIndisponibiliteDialog open={indispoOpen} onOpenChange={setIndispoOpen} />
      <MissionDrawer
        missionId={drawerMissionId}
        open={drawerMissionId !== null}
        onOpenChange={(v) => { if (!v) setDrawerMissionId(null); }}
      />
    </AnimatedPage>
  );
}
