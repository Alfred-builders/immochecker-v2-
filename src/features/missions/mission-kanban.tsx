import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Users, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUT_LABELS, STATUT_COLORS, type Mission, type MissionStatut } from './types';

// ---------------------------------------------------------------------------

const COLUMNS: { statut: MissionStatut; label: string; color: string }[] = [
  { statut: 'planifiee', label: 'Planifiée', color: 'border-t-amber-400' },
  { statut: 'assignee', label: 'Assignée', color: 'border-t-blue-400' },
  { statut: 'terminee', label: 'Terminée', color: 'border-t-emerald-400' },
  { statut: 'annulee', label: 'Annulée', color: 'border-t-red-400' },
];

interface Props {
  missions: Mission[];
  loading: boolean;
  onMissionClick: (m: Mission) => void;
}

export function MissionKanban({ missions, loading, onMissionClick }: Props) {
  const grouped = COLUMNS.reduce<Record<MissionStatut, Mission[]>>(
    (acc, col) => {
      acc[col.statut] = missions.filter((m) => m.statut === col.statut);
      return acc;
    },
    { planifiee: [], assignee: [], terminee: [], annulee: [] },
  );

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.statut} className="rounded-xl border bg-muted/30 p-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted mb-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-2 h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 min-h-[400px]">
      {COLUMNS.map((col) => (
        <div
          key={col.statut}
          className={`rounded-xl border-2 border-t-4 bg-slate-50/50 p-3 ${col.color} border-l-border border-r-border border-b-border`}
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-semibold">{col.label}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {grouped[col.statut].length}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {grouped[col.statut].length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">Aucune</p>
            )}
            {grouped[col.statut].map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onMissionClick(mission)}
                className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {mission.reference}
                  </span>
                </div>

                <p className="text-sm font-medium leading-tight mb-1">
                  {mission.lot_designation ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {mission.batiment_designation}
                </p>

                {mission.ville && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {mission.ville}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {mission.date_debut ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(mission.date_debut), 'd MMM', { locale: fr })}
                    </div>
                  ) : (
                    <span />
                  )}

                  {(mission.techniciens ?? []).length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {(mission.techniciens ?? []).length}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
