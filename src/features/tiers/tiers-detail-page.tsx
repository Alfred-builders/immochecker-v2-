import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronRight,
  Pencil,
  Archive,
  Check,
  Users,
  Building,
  User,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { AddressAutocomplete, type AddressResult } from '@/components/address-autocomplete';
import { useTiers, useUpdateTiers, useArchiveTiers } from './api';
import { displayName, type TiersDetail, type LotLink } from './types';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ppSchema = z.object({
  civilite: z.string().optional(),
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  telephone2: z.string().optional(),
  adresse: z.string().optional(),
  code_postal: z.string().optional(),
  ville: z.string().optional(),
  reference_interne: z.string().optional(),
  notes: z.string().optional(),
});

const pmSchema = z.object({
  raison_sociale: z.string().min(1, 'Raison sociale requise'),
  siret: z.string().optional(),
  forme_juridique: z.string().optional(),
  representant_nom: z.string().optional(),
  representant_prenom: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  telephone2: z.string().optional(),
  adresse: z.string().optional(),
  code_postal: z.string().optional(),
  ville: z.string().optional(),
  reference_interne: z.string().optional(),
  notes: z.string().optional(),
});

type PPForm = z.infer<typeof ppSchema>;
type PMForm = z.infer<typeof pmSchema>;

// ---------------------------------------------------------------------------
// Badge classes
// ---------------------------------------------------------------------------

const ROLE_BADGE: Record<string, string> = {
  proprietaire: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  locataire: 'bg-amber-100 text-amber-700 border-amber-200',
  mandataire: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const ROLE_LABELS: Record<string, string> = {
  proprietaire: 'Propriétaire',
  locataire: 'Locataire',
  mandataire: 'Mandataire',
};

// ---------------------------------------------------------------------------
// InfoRow
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground/50">--</span>}
      </span>
    </div>
  );
}

function SuccessCheck() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1], opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, times: [0, 0.6, 1] }}
      className="flex items-center gap-2 text-emerald-600"
    >
      <Check className="h-5 w-5" />
      <span className="text-sm font-medium">Sauvegardé</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TiersDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tiers, isLoading } = useTiers(id);
  const updateTiers = useUpdateTiers();
  const archiveTiers = useArchiveTiers();

  const [editing, setEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const isPP = tiers?.type === 'personne_physique';

  const ppForm = useForm<PPForm>({
    resolver: zodResolver(ppSchema),
    defaultValues: { civilite: '', nom: '', prenom: '', email: '', telephone: '', telephone2: '', adresse: '', code_postal: '', ville: '', reference_interne: '', notes: '' },
  });

  const pmForm = useForm<PMForm>({
    resolver: zodResolver(pmSchema),
    defaultValues: { raison_sociale: '', siret: '', forme_juridique: '', representant_nom: '', representant_prenom: '', email: '', telephone: '', telephone2: '', adresse: '', code_postal: '', ville: '', reference_interne: '', notes: '' },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeControl = (isPP ? ppForm.control : pmForm.control) as any;

  useEffect(() => {
    if (!tiers) return;
    if (isPP) {
      ppForm.reset({
        civilite: tiers.civilite ?? '',
        nom: tiers.nom ?? '',
        prenom: tiers.prenom ?? '',
        email: tiers.email ?? '',
        telephone: tiers.telephone ?? '',
        telephone2: tiers.telephone2 ?? '',
        adresse: tiers.adresse ?? '',
        code_postal: tiers.code_postal ?? '',
        ville: tiers.ville ?? '',
        reference_interne: tiers.reference_interne ?? '',
        notes: tiers.notes ?? '',
      });
    } else {
      pmForm.reset({
        raison_sociale: tiers.raison_sociale ?? '',
        siret: tiers.siret ?? '',
        forme_juridique: tiers.forme_juridique ?? '',
        representant_nom: tiers.representant_nom ?? '',
        representant_prenom: tiers.representant_prenom ?? '',
        email: tiers.email ?? '',
        telephone: tiers.telephone ?? '',
        telephone2: tiers.telephone2 ?? '',
        adresse: tiers.adresse ?? '',
        code_postal: tiers.code_postal ?? '',
        ville: tiers.ville ?? '',
        reference_interne: tiers.reference_interne ?? '',
        notes: tiers.notes ?? '',
      });
    }
  }, [tiers, isPP, ppForm, pmForm]);

  async function onSubmit(values: PPForm | PMForm) {
    if (!id) return;
    await updateTiers.mutateAsync({ id, ...values });
    setEditing(false);
    setShowSuccess(true);
    toast.success('Tiers mis à jour');
    setTimeout(() => setShowSuccess(false), 2000);
  }

  async function handleArchive() {
    if (!id) return;
    await archiveTiers.mutateAsync(id);
    toast.success(tiers?.est_archive ? 'Tiers restauré' : 'Tiers archivé');
    navigate('/app/tiers');
  }

  function handleCancel() {
    if (tiers) {
      if (isPP) {
        ppForm.reset({
          civilite: tiers.civilite ?? '',
          nom: tiers.nom ?? '',
          prenom: tiers.prenom ?? '',
          email: tiers.email ?? '',
          telephone: tiers.telephone ?? '',
          telephone2: tiers.telephone2 ?? '',
          adresse: tiers.adresse ?? '',
          code_postal: tiers.code_postal ?? '',
          ville: tiers.ville ?? '',
          reference_interne: tiers.reference_interne ?? '',
          notes: tiers.notes ?? '',
        });
      } else {
        pmForm.reset({
          raison_sociale: tiers.raison_sociale ?? '',
          siret: tiers.siret ?? '',
          forme_juridique: tiers.forme_juridique ?? '',
          representant_nom: tiers.representant_nom ?? '',
          representant_prenom: tiers.representant_prenom ?? '',
          email: tiers.email ?? '',
          telephone: tiers.telephone ?? '',
          telephone2: tiers.telephone2 ?? '',
          adresse: tiers.adresse ?? '',
          code_postal: tiers.code_postal ?? '',
          ville: tiers.ville ?? '',
          reference_interne: tiers.reference_interne ?? '',
          notes: tiers.notes ?? '',
        });
      }
    }
    setEditing(false);
  }

  if (isLoading) {
    return (
      <AnimatedPage className="p-6 space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </AnimatedPage>
    );
  }

  if (!tiers) {
    return (
      <AnimatedPage className="p-6">
        <p className="text-muted-foreground">Tiers introuvable.</p>
      </AnimatedPage>
    );
  }

  const name = displayName(tiers);

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/app/tiers" className="hover:text-foreground transition-colors">
          Tiers
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/10">
            {isPP ? (
              <User className="h-5 w-5 text-[#2563EB]" />
            ) : (
              <Building className="h-5 w-5 text-[#2563EB]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{name}</h1>
            <Badge
              variant="outline"
              className={
                isPP
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-violet-100 text-violet-700 border-violet-200'
              }
            >
              {isPP ? 'Personne physique' : 'Personne morale'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>{showSuccess && <SuccessCheck />}</AnimatePresence>

          {!editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive/10"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="h-3.5 w-3.5" />
                {tiers.est_archive ? 'Restaurer' : 'Archiver'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Annuler
              </Button>
              <Button
                size="sm"
                className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                onClick={isPP ? ppForm.handleSubmit(onSubmit) : pmForm.handleSubmit(onSubmit)}
                disabled={updateTiers.isPending}
              >
                {updateTiers.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Form {...(isPP ? ppForm : pmForm) as any}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* --- Identity card --- */}
          <Card className="p-5 space-y-1">
            <h3 className="text-sm font-semibold mb-3">
              {isPP ? 'Identité' : 'Informations société'}
            </h3>

            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="divide-y"
                >
                  {isPP ? (
                    <>
                      <InfoRow label="Civilité" value={tiers.civilite} />
                      <InfoRow label="Nom" value={tiers.nom} />
                      <InfoRow label="Prénom" value={tiers.prenom} />
                    </>
                  ) : (
                    <>
                      <InfoRow
                        label="Raison sociale"
                        value={tiers.raison_sociale}
                      />
                      <InfoRow label="SIRET" value={tiers.siret} />
                      <InfoRow
                        label="Forme juridique"
                        value={tiers.forme_juridique}
                      />
                      <InfoRow
                        label="Représentant"
                        value={
                          [tiers.representant_prenom, tiers.representant_nom]
                            .filter(Boolean)
                            .join(' ') || undefined
                        }
                      />
                    </>
                  )}
                  <InfoRow
                    label="Réf. interne"
                    value={tiers.reference_interne}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {isPP ? (
                    <>
                      <FormField
                        control={ppForm.control}
                        name="civilite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Civilité</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="M">M.</SelectItem>
                                <SelectItem value="Mme">Mme</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={ppForm.control}
                          name="nom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom *</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ppForm.control}
                          name="prenom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prénom</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <FormField
                        control={pmForm.control}
                        name="raison_sociale"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Raison sociale *</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={pmForm.control}
                          name="siret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SIRET</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pmForm.control}
                          name="forme_juridique"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Forme juridique</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="SARL">SARL</SelectItem>
                                  <SelectItem value="SAS">SAS</SelectItem>
                                  <SelectItem value="SA">SA</SelectItem>
                                  <SelectItem value="SCI">SCI</SelectItem>
                                  <SelectItem value="EI">EI</SelectItem>
                                  <SelectItem value="EURL">EURL</SelectItem>
                                  <SelectItem value="Association">Association</SelectItem>
                                  <SelectItem value="Autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={pmForm.control}
                          name="representant_nom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom représentant</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pmForm.control}
                          name="representant_prenom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prénom représentant</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                  <FormField
                    control={activeControl}
                    name="reference_interne"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Réf. interne</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* --- Contact card --- */}
          <Card className="p-5 space-y-1">
            <h3 className="text-sm font-semibold mb-3">Contact</h3>

            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view-contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="divide-y"
                >
                  <InfoRow
                    label="Email"
                    value={
                      tiers.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {tiers.email}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    label="Téléphone"
                    value={
                      tiers.telephone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {tiers.telephone}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoRow label="Téléphone 2" value={tiers.telephone2} />
                  <InfoRow
                    label="Adresse"
                    value={
                      tiers.adresse ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {[tiers.adresse, tiers.code_postal, tiers.ville]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoRow label="Notes" value={tiers.notes} />
                </motion.div>
              ) : (
                <motion.div
                  key="edit-contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={activeControl}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={activeControl}
                      name="telephone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={activeControl}
                    name="telephone2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone 2</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <AddressAutocomplete
                      placeholder="Rechercher une adresse..."
                      value={isPP ? ppForm.watch('adresse') : pmForm.watch('adresse')}
                      onSelect={(result: AddressResult) => {
                        if (isPP) {
                          ppForm.setValue('adresse', result.rue);
                          ppForm.setValue('code_postal', result.code_postal);
                          ppForm.setValue('ville', result.ville);
                        } else {
                          pmForm.setValue('adresse', result.rue);
                          pmForm.setValue('code_postal', result.code_postal);
                          pmForm.setValue('ville', result.ville);
                        }
                      }}
                      onChange={(val) => {
                        if (isPP) ppForm.setValue('adresse', val);
                        else pmForm.setValue('adresse', val);
                      }}
                    />
                  </FormItem>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={activeControl}
                      name="code_postal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={activeControl}
                      name="ville"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={activeControl}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl><Textarea className="min-h-[60px]" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </Form>

      {/* --- Lots section --- */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold">
          Lots associés ({tiers.lots?.length ?? 0})
        </h3>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot</TableHead>
                <TableHead>Bâtiment</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead className="text-right">Quote-part</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tiers.lots ?? []).map((lot: LotLink) => (
                <TableRow
                  key={lot.link_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    navigate(`/app/patrimoine/lots/${lot.lot_id}`)
                  }
                >
                  <TableCell className="text-sm font-medium">
                    {lot.lot_designation}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lot.batiment_designation}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ROLE_BADGE[lot.role] ?? ''}
                    >
                      {ROLE_LABELS[lot.role] ?? lot.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lot.adresse
                      ? [lot.adresse.rue, lot.adresse.code_postal, lot.adresse.ville]
                          .filter(Boolean)
                          .join(', ')
                      : '--'}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {lot.quote_part ? `${lot.quote_part}%` : '--'}
                  </TableCell>
                </TableRow>
              ))}
              {(tiers.lots ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-sm text-muted-foreground"
                  >
                    Aucun lot associé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* --- Organisations / Personnes section --- */}
      {isPP && (tiers.organisations ?? []).length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold">
            Organisations ({tiers.organisations.length})
          </h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Fonction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.organisations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(`/app/tiers/${org.organisation_id}`)
                    }
                  >
                    <TableCell className="text-sm font-medium flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.raison_sociale}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {org.siret ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {org.fonction ?? '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!isPP && (tiers.personnes ?? []).length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold">
            Personnes rattachées ({tiers.personnes.length})
          </h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fonction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.personnes.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/app/tiers/${p.personne_id}`)}
                  >
                    <TableCell className="text-sm font-medium flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {[p.prenom, p.nom].filter(Boolean).join(' ')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.email ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.fonction ?? '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* --- Archive confirmation dialog --- */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {tiers.est_archive ? 'Restaurer ce tiers ?' : 'Archiver ce tiers ?'}
            </DialogTitle>
            <DialogDescription>
              {tiers.est_archive
                ? 'Le tiers sera de nouveau visible dans la liste principale.'
                : 'Le tiers ne sera plus visible dans la liste principale. Cette action est réversible.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archiveTiers.isPending}
            >
              {archiveTiers.isPending
                ? tiers.est_archive
                  ? 'Restauration...'
                  : 'Archivage...'
                : tiers.est_archive
                  ? 'Restaurer'
                  : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}
