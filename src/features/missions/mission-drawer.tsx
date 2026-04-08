import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ExternalLink, Calendar, Users, MapPin, Building2,
  MessageSquare, UserPlus, Trash2, Lock, CheckCircle2,
  Clock, Key, Mail, AlertTriangle, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/hooks/use-auth';
import { useMembers } from '@/features/admin/api';
import {
  useMissionDetail, useUpdateMission, useAssignTechnicien, useRemoveTechnicien,
} from './api';
import {
  STATUT_LABELS, STATUT_COLORS, STATUT_RDV_LABELS,
  CLE_TYPE_LABELS, CLE_STATUT_LABELS,
  type MissionStatut, type MissionStatutRdv,
} from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUT_RDV_COLORS: Record<MissionStatutRdv, string> = {
  a_confirmer: 'bg-warning/10 text-warning border-warning/20',
  confirme: 'bg-success/10 text-success border-success/20',
  reporte: 'bg-destructive/10 text-destructive border-destructive/20',
};

const INVITATION_COLORS: Record<string, string> = {
  en_attente: 'bg-warning/10 text-warning border-warning/20',
  accepte: 'bg-success/10 text-success border-success/20',
  refuse: 'bg-destructive/10 text-destructive border-destructive/20',
};

const INVITATION_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  accepte: 'Accepté',
  refuse: 'Refusé',
};

function initials(prenom: string, nom: string) {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase();
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon?: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── drawer ─────────────────────────────────────────────────────────────────

interface Props {
  missionId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MissionDrawer({ missionId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { data: mission, isLoading } = useMissionDetail(missionId ?? undefined);
  const { data: members = [] } = useMembers(workspace?.id);
  const updateMission = useUpdateMission(missionId ?? '');
  const assignTech = useAssignTechnicien(missionId ?? '');
  const removeTech = useRemoveTechnicien(missionId ?? '');

  // Local editable fields
  const [dateDebut, setDateDebut] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [statutRdv, setStatutRdv] = useState<MissionStatutRdv>('a_confirmer');
  const [commentaire, setCommentaire] = useState('');
  const [dirty, setDirty] = useState(false);

  // Sync from server data
  useEffect(() => {
    if (!mission) return;
    setDateDebut(mission.date_debut?.slice(0, 10) ?? '');
    setHeureDebut(mission.heure_debut?.slice(0, 5) ?? '');
    setDateFin(mission.date_fin?.slice(0, 10) ?? '');
    setHeureFin(mission.heure_fin?.slice(0, 5) ?? '');
    setStatutRdv(mission.statut_rdv);
    setCommentaire(mission.commentaire ?? '');
    setDirty(false);
  }, [mission]);

  if (!mission) return null;

  const locked = mission.statut === 'terminee' || mission.statut === 'annulee';
  const assignedIds = new Set((mission.techniciens ?? []).map((t) => t.user_id));
  const availableMembers = members.filter((m) => !assignedIds.has(m.id));

  async function handleSave() {
    try {
      await updateMission.mutateAsync({
        date_debut: dateDebut || undefined,
        heure_debut: heureDebut || undefined,
        date_fin: dateFin || undefined,
        heure_fin: heureFin || undefined,
        statut_rdv: statutRdv,
        commentaire: commentaire || undefined,
      });
      toast.success('Mission mise à jour');
      setDirty(false);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  async function handleAssign(userId: string) {
    try {
      await assignTech.mutateAsync(userId);
      toast.success('Technicien assigné');
    } catch {
      toast.error("Erreur d'assignation");
    }
  }

  async function handleRemoveTech(userId: string) {
    try {
      await removeTech.mutateAsync(userId);
      toast.success('Technicien retiré');
    } catch {
      toast.error('Erreur');
    }
  }

  const pendingInvites = (mission.techniciens ?? []).filter(
    (t) => t.statut_invitation === 'en_attente',
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-6 py-4 border-b space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-mono">{mission.reference}</p>
              <SheetTitle className="text-base leading-tight mt-0.5 truncate">
                {mission.titre ?? mission.lot_designation ?? mission.reference}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className={`text-xs ${STATUT_COLORS[mission.statut as MissionStatut]}`}
              >
                {STATUT_LABELS[mission.statut as MissionStatut]}
              </Badge>
              {locked && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
        </SheetHeader>

        {/* ── Scrollable content ── */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">

            {/* Actions en attente (inline) */}
            {(mission.statut === 'planifiee' && (mission.techniciens ?? []).length === 0) && (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <p className="text-xs text-warning font-medium">Aucun technicien assigné</p>
              </div>
            )}
            {pendingInvites.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-medium">
                  {pendingInvites.length} invitation{pendingInvites.length > 1 ? 's' : ''} en attente
                </p>
              </div>
            )}
            {mission.statut_rdv === 'a_confirmer' && mission.statut !== 'annulee' && (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                <Clock className="h-4 w-4 text-warning shrink-0" />
                <p className="text-xs text-warning font-medium">RDV à confirmer</p>
              </div>
            )}

            <Separator />

            {/* Planning */}
            <Section icon={Calendar} title="Planning">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date début</p>
                  {locked ? (
                    <p className="text-sm">{dateDebut ? format(new Date(dateDebut), 'd MMM yyyy', { locale: fr }) : '—'}</p>
                  ) : (
                    <Input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => { setDateDebut(e.target.value); setDirty(true); }}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heure début</p>
                  {locked ? (
                    <p className="text-sm">{heureDebut || '—'}</p>
                  ) : (
                    <Input
                      type="time"
                      value={heureDebut}
                      onChange={(e) => { setHeureDebut(e.target.value); setDirty(true); }}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date fin</p>
                  {locked ? (
                    <p className="text-sm">{dateFin ? format(new Date(dateFin), 'd MMM yyyy', { locale: fr }) : '—'}</p>
                  ) : (
                    <Input
                      type="date"
                      value={dateFin}
                      onChange={(e) => { setDateFin(e.target.value); setDirty(true); }}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heure fin</p>
                  {locked ? (
                    <p className="text-sm">{heureFin || '—'}</p>
                  ) : (
                    <Input
                      type="time"
                      value={heureFin}
                      onChange={(e) => { setHeureFin(e.target.value); setDirty(true); }}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              </div>
            </Section>

            <Separator />

            {/* RDV Status */}
            <Section icon={CheckCircle2} title="Statut RDV">
              {locked ? (
                <Badge variant="outline" className={`text-xs ${STATUT_RDV_COLORS[mission.statut_rdv]}`}>
                  {STATUT_RDV_LABELS[mission.statut_rdv]}
                </Badge>
              ) : (
                <Select
                  value={statutRdv}
                  onValueChange={(v) => { setStatutRdv(v as MissionStatutRdv); setDirty(true); }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_confirmer">À confirmer</SelectItem>
                    <SelectItem value="confirme">Confirmé</SelectItem>
                    <SelectItem value="reporte">Reporté</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Section>

            <Separator />

            {/* Techniciens */}
            <Section icon={Users} title="Techniciens">
              <div className="space-y-2">
                {(mission.techniciens ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun technicien assigné</p>
                )}
                {(mission.techniciens ?? []).map((t) => (
                  <div key={t.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-medium shrink-0"
                        style={{ backgroundColor: t.avatar_color ?? '#6366f1' }}
                      >
                        {initials(t.prenom, t.nom)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.prenom} {t.nom}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-4 px-1 ${INVITATION_COLORS[t.statut_invitation] ?? ''}`}
                        >
                          {INVITATION_LABELS[t.statut_invitation] ?? t.statut_invitation}
                        </Badge>
                      </div>
                    </div>
                    {!locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveTech(t.user_id)}
                        disabled={removeTech.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}

                {!locked && availableMembers.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs w-full">
                        <UserPlus className="h-3.5 w-3.5" />
                        Assigner un technicien
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {availableMembers.map((m) => (
                        <DropdownMenuItem
                          key={m.id}
                          onSelect={() => handleAssign(m.id)}
                          className="gap-2"
                        >
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-medium shrink-0"
                            style={{ backgroundColor: '#6366f1' }}
                          >
                            {initials(m.prenom, m.nom)}
                          </div>
                          {m.prenom} {m.nom}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Section>

            <Separator />

            {/* Clés */}
            {mission.cles && mission.cles.length > 0 && (
              <>
                <Section icon={Key} title="Clés">
                  <div className="space-y-1.5">
                    {mission.cles.map((cle) => (
                      <div key={cle.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{CLE_TYPE_LABELS[cle.type_cle]}</span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs">{cle.quantite}×</span>
                          <Badge variant="outline" className="text-xs h-5">
                            {CLE_STATUT_LABELS[cle.statut]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
                <Separator />
              </>
            )}


            {/* Documents EDL */}
            {(mission.edls ?? []).length > 0 && (
              <>
                <Section icon={FileText} title="Documents EDL">
                  <div className="space-y-1.5">
                    {(mission.edls ?? []).map((edl) => (
                      <div key={edl.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">
                            {edl.sens === 'entree' ? "EDL d'entrée" : 'EDL de sortie'}
                          </span>
                          {(edl.locataires ?? []).length > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {edl.locataires.map((l: any) => l.nom_complet).join(', ')}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs h-5 ${
                            edl.statut === 'signe'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {edl.statut === 'signe' ? 'Signé' : 'Brouillon'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Section>
                <Separator />
              </>
            )}

            {/* Lot & Bâtiment */}
            <Section icon={MapPin} title="Lot">
              {mission.lot ? (
                <div
                  className="rounded-md border px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => { onOpenChange(false); navigate(`/app/patrimoine/lots/${mission.lot.id}`); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{mission.lot.designation}</p>
                      <p className="text-xs text-muted-foreground">
                        {mission.lot.type_bien}
                        {mission.lot.batiment_designation && ` · ${mission.lot.batiment_designation}`}
                      </p>
                      {(mission.lot.rue || mission.lot.ville) && (
                        <p className="text-xs text-muted-foreground">
                          {[mission.lot.rue, mission.lot.ville].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </Section>

            {mission.lot?.batiment_id && (
              <>
                <Section icon={Building2} title="Bâtiment">
                  <div
                    className="rounded-md border px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => { onOpenChange(false); navigate(`/app/patrimoine/batiments/${mission.lot.batiment_id}`); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{mission.lot.batiment_designation}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </Section>
              </>
            )}

            <Separator />

            {/* Commentaire — always editable */}
            <Section icon={MessageSquare} title="Commentaire">
              <Textarea
                value={commentaire}
                onChange={(e) => { setCommentaire(e.target.value); setDirty(true); }}
                placeholder="Ajouter un commentaire..."
                className="min-h-[80px] text-sm resize-none"
              />
            </Section>

            {/* Motif annulation */}
            {mission.statut === 'annulee' && mission.motif_annulation && (
              <>
                <Separator />
                <Section icon={AlertTriangle} title="Motif d'annulation">
                  <p className="text-sm text-destructive">{mission.motif_annulation}</p>
                </Section>
              </>
            )}

          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="border-t px-6 py-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { onOpenChange(false); navigate(`/app/missions/${missionId}`); }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Voir la fiche complète
          </Button>
          {dirty && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMission.isPending}
              className="gap-1.5"
            >
              {updateMission.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
