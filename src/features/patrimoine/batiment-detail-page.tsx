import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronRight,
  Pencil,
  Archive,
  Plus,
  X,
  Check,
  Building2,
} from 'lucide-react';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { useBatiment, useUpdateBatiment, useArchiveBatiment } from './api';
import { CreateLotDialog } from './create-lot-dialog';
import type { Adresse, Lot } from './types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const adresseSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['principale', 'secondaire']),
  rue: z.string().min(1, 'Rue requise'),
  complement: z.string().optional(),
  code_postal: z.string().min(1, 'Code postal requis'),
  ville: z.string().min(1, 'Ville requise'),
});

const schema = z.object({
  designation: z.string().min(1, 'Désignation requise'),
  type: z.string().min(1, 'Type requis'),
  num_batiment: z.string().optional(),
  nb_etages: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  annee_construction: z.coerce.number().int().optional().or(z.literal('')),
  reference_interne: z.string().optional(),
  commentaire: z.string().optional(),
  adresses: z.array(adresseSchema).min(1, 'Au moins une adresse requise'),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUILDING_TYPES = [
  { value: 'immeuble', label: 'Immeuble' },
  { value: 'maison', label: 'Maison' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixte', label: 'Mixte' },
  { value: 'autre', label: 'Autre' },
];

const TYPE_BADGE_CLASSES: Record<string, string> = {
  immeuble: 'bg-primary/10 text-primary border-primary/20',
  maison: 'bg-success/10 text-success border-success/20',
  commercial: 'bg-warning/10 text-warning border-warning/20',
  mixte: 'bg-secondary text-secondary-foreground border-border',
};

const LOT_TYPE_BADGE: Record<string, string> = {
  appartement: 'bg-primary/10 text-primary border-primary/20',
  studio: 'bg-primary/20 text-primary border-primary/30',
  maison: 'bg-success/10 text-success border-success/20',
  local_commercial: 'bg-warning/10 text-warning border-warning/20',
  parking: 'bg-muted text-muted-foreground border-border',
  cave: 'bg-muted text-muted-foreground border-border',
  bureau: 'bg-secondary text-secondary-foreground border-border',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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
      className="flex items-center gap-2 text-success"
    >
      <Check className="h-5 w-5" />
      <span className="text-sm font-medium">Sauvegardé</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BatimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: batiment, isLoading } = useBatiment(id);
  const updateBatiment = useUpdateBatiment();
  const archiveBatiment = useArchiveBatiment();

  const [editing, setEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [lotDialogOpen, setLotDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      designation: '',
      type: '',
      num_batiment: '',
      nb_etages: '',
      annee_construction: '',
      reference_interne: '',
      commentaire: '',
      adresses: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'adresses',
  });

  // Sync form with fetched data
  useEffect(() => {
    if (batiment) {
      form.reset({
        designation: batiment.designation,
        type: batiment.type,
        num_batiment: batiment.num_batiment ?? '',
        nb_etages: batiment.nb_etages ?? '',
        annee_construction: batiment.annee_construction ?? '',
        reference_interne: batiment.reference_interne ?? '',
        commentaire: batiment.commentaire ?? '',
        adresses: (batiment.adresses ?? []).map((a: Adresse) => ({
          id: a.id,
          type: a.type,
          rue: a.rue,
          complement: a.complement ?? '',
          code_postal: a.code_postal,
          ville: a.ville,
        })),
      });
    }
  }, [batiment, form]);

  async function onSubmit(values: FormValues) {
    if (!id) return;
    const payload = {
      id,
      ...values,
      nb_etages:
        values.nb_etages !== '' && values.nb_etages !== undefined
          ? Number(values.nb_etages)
          : null,
      annee_construction:
        values.annee_construction !== '' && values.annee_construction !== undefined
          ? Number(values.annee_construction)
          : null,
    };

    await updateBatiment.mutateAsync(payload);
    setEditing(false);
    setShowSuccess(true);
    toast.success('Bâtiment mis à jour');
    setTimeout(() => setShowSuccess(false), 2000);
  }

  async function handleArchive() {
    if (!id) return;
    await archiveBatiment.mutateAsync(id);
    toast.success('Bâtiment archivé');
    navigate('/app/patrimoine');
  }

  function handleCancel() {
    if (batiment) {
      form.reset({
        designation: batiment.designation,
        type: batiment.type,
        num_batiment: batiment.num_batiment ?? '',
        nb_etages: batiment.nb_etages ?? '',
        annee_construction: batiment.annee_construction ?? '',
        reference_interne: batiment.reference_interne ?? '',
        commentaire: batiment.commentaire ?? '',
        adresses: (batiment.adresses ?? []).map((a: Adresse) => ({
          id: a.id,
          type: a.type,
          rue: a.rue,
          complement: a.complement ?? '',
          code_postal: a.code_postal,
          ville: a.ville,
        })),
      });
    }
    setEditing(false);
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <AnimatedPage className="p-6 space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </AnimatedPage>
    );
  }

  if (!batiment) {
    return (
      <AnimatedPage className="p-6">
        <p className="text-muted-foreground">Bâtiment introuvable.</p>
      </AnimatedPage>
    );
  }

  const typeBadge = batiment.type;

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          to="/app/patrimoine"
          className="hover:text-foreground transition-colors"
        >
          Parc immobilier
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">
          {batiment.designation}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {batiment.designation}
            </h1>
            <Badge
              variant="outline"
              className={
                TYPE_BADGE_CLASSES[typeBadge] ??
                'bg-muted text-muted-foreground'
              }
            >
              {typeBadge.charAt(0).toUpperCase() + typeBadge.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showSuccess && <SuccessCheck />}
          </AnimatePresence>

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
                Archiver
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateBatiment.isPending}
              >
                {updateBatiment.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Form {...form}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* --- Informations card --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informations</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">

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
                  <InfoRow label="Type" value={typeBadge} />
                  <InfoRow label="N° bâtiment" value={batiment.num_batiment} />
                  <InfoRow label="Nb étages" value={batiment.nb_etages} />
                  <InfoRow
                    label="Année construction"
                    value={batiment.annee_construction}
                  />
                  <InfoRow
                    label="Réf. interne"
                    value={batiment.reference_interne}
                  />
                  <InfoRow label="Commentaire" value={batiment.commentaire} />
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
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Désignation</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BUILDING_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="num_batiment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° bâtiment</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nb_etages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nb étages</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="annee_construction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Année construction</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reference_interne"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Réf. interne</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="commentaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commentaire</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[60px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </CardContent>
          </Card>

          {/* --- Adresses card --- */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Adresses</CardTitle>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    append({
                      type: 'secondaire',
                      rue: '',
                      complement: '',
                      code_postal: '',
                      ville: '',
                    })
                  }
                >
                  <Plus className="h-3 w-3" />
                  Ajouter
                </Button>
              )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view-addr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Adresse</TableHead>
                        <TableHead className="text-xs">CP / Ville</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(batiment.adresses ?? []).map((a: Adresse) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {a.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.rue}
                            {a.complement ? `, ${a.complement}` : ''}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.code_postal} {a.ville}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(batiment.adresses ?? []).length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-xs text-muted-foreground text-center py-4"
                          >
                            Aucune adresse
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </motion.div>
              ) : (
                <motion.div
                  key="edit-addr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <AnimatePresence mode="popLayout">
                    {fields.map((field, index) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        layout
                        className="rounded-lg border bg-muted/30 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <FormField
                            control={form.control}
                            name={`adresses.${index}.type`}
                            render={({ field: f }) => (
                              <Select
                                onValueChange={f.onChange}
                                value={f.value}
                              >
                                <SelectTrigger className="h-7 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="principale">
                                    Principale
                                  </SelectItem>
                                  <SelectItem value="secondaire">
                                    Secondaire
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <AddressAutocomplete
                          placeholder="Rechercher une adresse..."
                          inputClassName="h-8 text-sm"
                          value={form.watch(`adresses.${index}.rue`)}
                          onSelect={(result: AddressResult) => {
                            form.setValue(`adresses.${index}.rue`, result.rue);
                            form.setValue(`adresses.${index}.code_postal`, result.code_postal);
                            form.setValue(`adresses.${index}.ville`, result.ville);
                          }}
                          onChange={(val) => form.setValue(`adresses.${index}.rue`, val)}
                        />
                        <FormField
                          control={form.control}
                          name={`adresses.${index}.complement`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Complément"
                                  className="h-8 text-sm"
                                  {...f}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name={`adresses.${index}.code_postal`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Code postal"
                                    className="h-8 text-sm"
                                    {...f}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`adresses.${index}.ville`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Ville"
                                    className="h-8 text-sm"
                                    {...f}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </Form>

      {/* --- Lots section --- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3 space-y-0">
          <CardTitle className="text-sm font-semibold">
            Lots ({batiment.lots?.length ?? 0})
          </CardTitle>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setLotDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un lot
          </Button>
        </CardHeader>
        <CardContent className="pt-0">

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Étage</TableHead>
                <TableHead className="text-right">Surface</TableHead>
                <TableHead>Meublé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batiment.lots ?? []).map((lot: Lot) => (
                <motion.tr
                  key={lot.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    scale: 1.002,
                    backgroundColor: 'rgba(0,0,0,0.015)',
                  }}
                  onClick={() =>
                    navigate(`/app/patrimoine/lots/${lot.id}`)
                  }
                  className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4 text-sm font-medium">
                    {lot.designation}
                  </td>
                  <td className="p-4 text-sm">
                    <Badge
                      variant="outline"
                      className={
                        LOT_TYPE_BADGE[lot.type_bien] ??
                        'bg-muted text-muted-foreground'
                      }
                    >
                      {lot.type_bien}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {lot.etage ?? '--'}
                  </td>
                  <td className="p-4 text-sm text-right tabular-nums">
                    {lot.surface ? `${lot.surface} m²` : '--'}
                  </td>
                  <td className="p-4 text-sm">
                    {lot.meuble ? (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Oui
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Non</span>
                    )}
                  </td>
                </motion.tr>
              ))}
              {(batiment.lots ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-sm text-muted-foreground"
                  >
                    Aucun lot dans ce bâtiment
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>

      {/* --- Archive confirmation dialog --- */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archiver ce bâtiment ?</DialogTitle>
            <DialogDescription>
              Le bâtiment et ses lots ne seront plus visibles dans la liste
              principale. Cette action est réversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archiveBatiment.isPending}
            >
              {archiveBatiment.isPending ? 'Archivage...' : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Create lot dialog --- */}
      <CreateLotDialog
        open={lotDialogOpen}
        onOpenChange={setLotDialogOpen}
        defaultBatimentId={id}
      />
    </AnimatedPage>
  );
}
