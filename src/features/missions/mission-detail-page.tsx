import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Users, Key, Edit2,
  Save, X, AlertTriangle, CheckCircle2, XCircle, Plus, Trash2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';

import {
  useMissionDetail, useUpdateMission, useCancelMission,
  useAddCle, useUpdateCle, useDeleteCle,
} from './api';
import {
  STATUT_LABELS, STATUT_COLORS, STATUT_RDV_LABELS,
  CLE_TYPE_LABELS, CLE_STATUT_LABELS,
  type MissionStatut, type CleMissionType, type CleMissionStatut,
} from './types';

// ---------------------------------------------------------------------------
// Cancel dialog
// ---------------------------------------------------------------------------

function CancelDialog({
  open, onConfirm, onClose, loading,
}: {
  open: boolean;
  onConfirm: (motif: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [motif, setMotif] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Annuler la mission</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible si la mission est terminée.
          </p>
          <Textarea
            placeholder="Motif d'annulation (optionnel)"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Retour</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(motif)}
            disabled={loading}
          >
            {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addCleOpen, setAddCleOpen] = useState(false);
  const [editValues, setEditValues] = useState<any>(null);

  const { data: mission, isLoading } = useMissionDetail(id);
  const updateMission = useUpdateMission(id!);
  const cancelMission = useCancelMission(id!);
  const addCle = useAddCle(id!);
  const deleteCle = useDeleteCle(id!);

  const isLocked = mission?.statut === 'terminee' || mission?.statut === 'annulee';

  function startEditing() {
    setEditValues({
      titre: mission?.titre ?? '',
      statut_rdv: mission?.statut_rdv ?? 'a_confirmer',
      date_debut: mission?.date_debut ?? '',
      heure_debut: mission?.heure_debut ?? '',
      date_fin: mission?.date_fin ?? '',
      heure_fin: mission?.heure_fin ?? '',
      commentaire: mission?.commentaire ?? '',
    });
    setEditing(true);
  }

  async function saveEditing() {
    const payload: any = {};
    if (!isLocked) {
      payload.titre = editValues.titre || undefined;
      payload.statut_rdv = editValues.statut_rdv;
      payload.date_debut = editValues.date_debut || undefined;
      payload.heure_debut = editValues.heure_debut || undefined;
      payload.date_fin = editValues.date_fin || undefined;
      payload.heure_fin = editValues.heure_fin || undefined;
    }
    payload.commentaire = editValues.commentaire || undefined;
    await updateMission.mutateAsync(payload);
    toast.success('Mission mise à jour');
    setEditing(false);
  }

  async function handleCancel(motif: string) {
    await cancelMission.mutateAsync(motif);
    toast.success('Mission annulée');
    setCancelOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>Mission introuvable.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/missions')}>Retour</Button>
      </div>
    );
  }

  return (
    <AnimatedPage className="p-6 space-y-6 max-w-3xl">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/missions')} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Missions
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-muted-foreground">{mission.reference}</span>
            <Badge variant="outline" className={STATUT_COLORS[mission.statut as MissionStatut]}>
              {STATUT_LABELS[mission.statut as MissionStatut]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              RDV : {STATUT_RDV_LABELS[mission.statut_rdv]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">
            {mission.titre || mission.lot_designation || 'Mission sans titre'}
          </h1>
          {mission.batiment_designation && (
            <p className="text-muted-foreground mt-1">{mission.batiment_designation}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button size="sm" onClick={saveEditing} disabled={updateMission.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateMission.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          ) : (
            <>
              {!isLocked && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit2 className="h-4 w-4 mr-1" /> Modifier
                </Button>
              )}
              {mission.statut !== 'annulee' && mission.statut !== 'terminee' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Annuler
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Infos lot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lot concerné</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start gap-3">
            <div>
              <p className="font-medium">{mission.lot_designation}</p>
              <p className="text-sm text-muted-foreground">{mission.batiment_designation}</p>
              {mission.rue && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[mission.rue, mission.ville].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs"
              onClick={() => navigate(`/app/patrimoine/lots/${mission.lot_id}`)}
            >
              Voir le lot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Planning */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Planning
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        {editing && !isLocked ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date prévue</label>
              <Input type="date" value={editValues.date_debut}
                onChange={(e) => setEditValues((v: any) => ({ ...v, date_debut: e.target.value }))}
                className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Heure</label>
              <Input type="time" value={editValues.heure_debut}
                onChange={(e) => setEditValues((v: any) => ({ ...v, heure_debut: e.target.value }))}
                className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Date fin</label>
              <Input type="date" value={editValues.date_fin}
                onChange={(e) => setEditValues((v: any) => ({ ...v, date_fin: e.target.value }))}
                className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Heure fin</label>
              <Input type="time" value={editValues.heure_fin}
                onChange={(e) => setEditValues((v: any) => ({ ...v, heure_fin: e.target.value }))}
                className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Statut RDV</label>
              <Select value={editValues.statut_rdv}
                onValueChange={(v) => setEditValues((ev: any) => ({ ...ev, statut_rdv: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_confirmer">À confirmer</SelectItem>
                  <SelectItem value="confirme">Confirmé</SelectItem>
                  <SelectItem value="reporte">Reporté</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Date prévue</p>
              <p className="font-medium mt-0.5">
                {mission.date_debut
                  ? format(new Date(mission.date_debut), 'EEEE d MMMM yyyy', { locale: fr })
                  : '—'}
                {mission.heure_debut && ` à ${mission.heure_debut.slice(0, 5)}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Date fin</p>
              <p className="font-medium mt-0.5">
                {mission.date_fin
                  ? format(new Date(mission.date_fin), 'd MMMM yyyy', { locale: fr })
                  : '—'}
                {mission.heure_fin && ` à ${mission.heure_fin.slice(0, 5)}`}
              </p>
            </div>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Techniciens */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Techniciens
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
        {(mission.techniciens ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun technicien assigné.</p>
        ) : (
          <div className="space-y-2">
            {(mission.techniciens ?? []).map((t) => (
              <div key={t.user_id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {(t.prenom?.[0] ?? '') + (t.nom?.[0] ?? '')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.prenom} {t.nom}</p>
                  <p className="text-xs text-muted-foreground">{t.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t.statut_invitation === 'accepte' ? 'Accepté' :
                   t.statut_invitation === 'refuse' ? 'Refusé' : 'En attente'}
                </Badge>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Clés */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" /> Clés
          </CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={() => setAddCleOpen(true)}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
        {(mission.cles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune clé enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {(mission.cles ?? []).map((cle) => (
              <div key={cle.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{CLE_TYPE_LABELS[cle.type_cle]}</p>
                  {cle.commentaire && (
                    <p className="text-xs text-muted-foreground truncate">{cle.commentaire}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">×{cle.quantite}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {CLE_STATUT_LABELS[cle.statut]}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    await deleteCle.mutateAsync(cle.id);
                    toast.success('Clé supprimée');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>


      {/* Documents EDL */}
      {(mission.edls ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Documents EDL
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {(mission.edls ?? []).map((edl) => (
              <div key={edl.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {edl.sens === 'entree' ? "EDL d'entrée" : 'EDL de sortie'}
                    </p>
                    {(edl.locataires ?? []).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {edl.locataires.map((l) => l.nom_complet).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    edl.statut === 'signe'
                      ? 'bg-success/10 text-success border-success/20'
                      : edl.statut === 'infructueux'
                      ? 'bg-destructive/10 text-destructive border-destructive/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {edl.statut === 'signe' ? 'Signé' : edl.statut === 'infructueux' ? 'Infructueux' : 'Brouillon'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Commentaire */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commentaire</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        {editing ? (
          <Textarea
            value={editValues?.commentaire ?? ''}
            onChange={(e) => setEditValues((v: any) => ({ ...v, commentaire: e.target.value }))}
            className="min-h-[80px]"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {mission.commentaire || '—'}
          </p>
        )}
        </CardContent>
      </Card>

      {mission.motif_annulation && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">Motif d'annulation</p>
            <p className="text-sm text-destructive/80 mt-1">{mission.motif_annulation}</p>
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <p className="text-xs text-muted-foreground">
        Créée le {format(new Date(mission.created_at), 'd MMM yyyy', { locale: fr })}
        {' · '}Modifiée le {format(new Date(mission.updated_at), 'd MMM yyyy', { locale: fr })}
      </p>

      {/* Dialogs */}
      <CancelDialog
        open={cancelOpen}
        onConfirm={handleCancel}
        onClose={() => setCancelOpen(false)}
        loading={cancelMission.isPending}
      />

      <AddCleDialog
        open={addCleOpen}
        onClose={() => setAddCleOpen(false)}
        onAdd={async (data) => {
          await addCle.mutateAsync(data);
          toast.success('Clé ajoutée');
          setAddCleOpen(false);
        }}
        loading={addCle.isPending}
      />
    </AnimatedPage>
  );
}

// ---------------------------------------------------------------------------
// Add Cle Dialog
// ---------------------------------------------------------------------------

function AddCleDialog({
  open, onClose, onAdd, loading,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  loading: boolean;
}) {
  const [type_cle, setTypeCle] = useState<CleMissionType>('cle_principale');
  const [quantite, setQuantite] = useState(1);
  const [statut, setStatut] = useState<CleMissionStatut>('remise');
  const [commentaire, setCommentaire] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une clé</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={type_cle} onValueChange={(v) => setTypeCle(v as CleMissionType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLE_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Quantité</label>
              <Input type="number" min={1} value={quantite}
                onChange={(e) => setQuantite(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Statut</label>
              <Select value={statut} onValueChange={(v) => setStatut(v as CleMissionStatut)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLE_STATUT_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Commentaire</label>
            <Input value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: Clé boîte à clés" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onAdd({ type_cle, quantite, statut, commentaire: commentaire || undefined })}
            disabled={loading}>
            {loading ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
