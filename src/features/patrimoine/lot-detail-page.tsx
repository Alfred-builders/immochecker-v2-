import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Archive,
  Check,
  DoorOpen,
} from 'lucide-react';

import { AnimatedPage } from '@/components/animated-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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

import { useLot, useUpdateLot, useArchiveLot } from './api';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  designation: z.string().min(1, 'Designation requise'),
  type_bien: z.string().min(1, 'Type requis'),
  reference_interne: z.string().optional(),
  num_appartement: z.string().optional(),
  nb_pieces: z.string().optional(),
  nb_pieces_precision: z.string().optional(),
  etage: z.string().optional(),
  emplacement_palier: z.string().optional(),
  surface: z.coerce.number().positive().optional().or(z.literal('')),
  meuble: z.boolean(),
  chauffage_type: z.string().optional(),
  chauffage_mode: z.string().optional(),
  eau_chaude_type: z.string().optional(),
  eau_chaude_mode: z.string().optional(),
  dpe_classe: z.string().optional(),
  ges_classe: z.string().optional(),
  num_parking: z.string().optional(),
  num_cave: z.string().optional(),
  commentaire: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPES_BIEN = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'maison', label: 'Maison' },
  { value: 'local_commercial', label: 'Local commercial' },
  { value: 'parking', label: 'Parking' },
  { value: 'cave', label: 'Cave' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'autre', label: 'Autre' },
];

const NB_PIECES_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1 piece' },
  { value: '2', label: '2 pieces' },
  { value: '3', label: '3 pieces' },
  { value: '4', label: '4 pieces' },
  { value: '5', label: '5 pieces' },
  { value: '6+', label: '6+ pieces' },
];

const DPE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const TYPE_BADGE_CLASSES: Record<string, string> = {
  appartement: 'bg-blue-100 text-blue-700 border-blue-200',
  studio: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  maison: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  local_commercial: 'bg-amber-100 text-amber-700 border-amber-200',
  parking: 'bg-slate-100 text-slate-700 border-slate-200',
  cave: 'bg-stone-100 text-stone-700 border-stone-200',
  bureau: 'bg-violet-100 text-violet-700 border-violet-200',
};

const CHAUFFAGE_TYPES = [
  { value: 'individuel', label: 'Individuel' },
  { value: 'collectif', label: 'Collectif' },
];

const CHAUFFAGE_MODES = [
  { value: 'electrique', label: 'Electrique' },
  { value: 'gaz', label: 'Gaz' },
  { value: 'fioul', label: 'Fioul' },
  { value: 'pompe_chaleur', label: 'Pompe a chaleur' },
  { value: 'autre', label: 'Autre' },
];

const DPE_COLORS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B: 'bg-green-100 text-green-700 border-green-200',
  C: 'bg-lime-100 text-lime-700 border-lime-200',
  D: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  E: 'bg-orange-100 text-orange-700 border-orange-200',
  F: 'bg-red-100 text-red-700 border-red-200',
  G: 'bg-rose-100 text-rose-800 border-rose-200',
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
      className="flex items-center gap-2 text-emerald-600"
    >
      <Check className="h-5 w-5" />
      <span className="text-sm font-medium">Sauvegarde</span>
    </motion.div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <h3 className="text-sm font-semibold">{title}</h3>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lot, isLoading } = useLot(id);
  const updateLot = useUpdateLot();
  const archiveLot = useArchiveLot();

  const [editing, setEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      designation: '',
      type_bien: '',
      reference_interne: '',
      num_appartement: '',
      nb_pieces: '',
      nb_pieces_precision: '',
      etage: '',
      emplacement_palier: '',
      surface: '',
      meuble: false,
      chauffage_type: '',
      chauffage_mode: '',
      eau_chaude_type: '',
      eau_chaude_mode: '',
      dpe_classe: '',
      ges_classe: '',
      num_parking: '',
      num_cave: '',
      commentaire: '',
    },
  });

  // Sync form values with fetched data
  useEffect(() => {
    if (lot) {
      form.reset({
        designation: lot.designation,
        type_bien: lot.type_bien,
        reference_interne: lot.reference_interne ?? '',
        num_appartement: lot.num_appartement ?? '',
        nb_pieces: lot.nb_pieces ?? '',
        nb_pieces_precision: lot.nb_pieces_precision ?? '',
        etage: lot.etage ?? '',
        emplacement_palier: lot.emplacement_palier ?? '',
        surface: lot.surface ?? '',
        meuble: lot.meuble,
        chauffage_type: lot.chauffage_type ?? '',
        chauffage_mode: lot.chauffage_mode ?? '',
        eau_chaude_type: lot.eau_chaude_type ?? '',
        eau_chaude_mode: lot.eau_chaude_mode ?? '',
        dpe_classe: lot.dpe_classe ?? '',
        ges_classe: lot.ges_classe ?? '',
        num_parking: lot.num_parking ?? '',
        num_cave: lot.num_cave ?? '',
        commentaire: lot.commentaire ?? '',
      });
    }
  }, [lot, form]);

  async function onSubmit(values: FormValues) {
    if (!id) return;
    const payload = {
      id,
      ...values,
      surface:
        values.surface !== '' && values.surface !== undefined
          ? Number(values.surface)
          : null,
      dpe_classe: values.dpe_classe || null,
      ges_classe: values.ges_classe || null,
      chauffage_type: values.chauffage_type || null,
      chauffage_mode: values.chauffage_mode || null,
      eau_chaude_type: values.eau_chaude_type || null,
      eau_chaude_mode: values.eau_chaude_mode || null,
    };

    await updateLot.mutateAsync(payload);
    setEditing(false);
    setShowSuccess(true);
    toast.success('Lot mis a jour');
    setTimeout(() => setShowSuccess(false), 2000);
  }

  async function handleArchive() {
    if (!id) return;
    await archiveLot.mutateAsync(id);
    toast.success('Lot archive');
    if (lot?.batiment) {
      window.location.href = `/app/patrimoine/batiments/${lot.batiment.id}`;
    } else {
      window.location.href = '/app/patrimoine';
    }
  }

  function handleCancel() {
    if (lot) {
      form.reset({
        designation: lot.designation,
        type_bien: lot.type_bien,
        reference_interne: lot.reference_interne ?? '',
        num_appartement: lot.num_appartement ?? '',
        nb_pieces: lot.nb_pieces ?? '',
        nb_pieces_precision: lot.nb_pieces_precision ?? '',
        etage: lot.etage ?? '',
        emplacement_palier: lot.emplacement_palier ?? '',
        surface: lot.surface ?? '',
        meuble: lot.meuble,
        chauffage_type: lot.chauffage_type ?? '',
        chauffage_mode: lot.chauffage_mode ?? '',
        eau_chaude_type: lot.eau_chaude_type ?? '',
        eau_chaude_mode: lot.eau_chaude_mode ?? '',
        dpe_classe: lot.dpe_classe ?? '',
        ges_classe: lot.ges_classe ?? '',
        num_parking: lot.num_parking ?? '',
        num_cave: lot.num_cave ?? '',
        commentaire: lot.commentaire ?? '',
      });
    }
    setEditing(false);
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <AnimatedPage className="p-6 space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </AnimatedPage>
    );
  }

  if (!lot) {
    return (
      <AnimatedPage className="p-6">
        <p className="text-muted-foreground">Lot introuvable.</p>
      </AnimatedPage>
    );
  }

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
        <Link
          to={`/app/patrimoine/batiments/${lot.batiment.id}`}
          className="hover:text-foreground transition-colors"
        >
          {lot.batiment.designation}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{lot.designation}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/10">
            <DoorOpen className="h-5 w-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {lot.designation}
            </h1>
            <Badge
              variant="outline"
              className={
                TYPE_BADGE_CLASSES[lot.type_bien] ??
                'bg-muted text-muted-foreground'
              }
            >
              {lot.type_bien}
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
                className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateLot.isPending}
              >
                {updateLot.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          {/* --- Section: Informations generales --- */}
          <CollapsibleSection title="Informations generales">
            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view-general"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="divide-y"
                >
                  <InfoRow label="Designation" value={lot.designation} />
                  <InfoRow label="Type de bien" value={lot.type_bien} />
                  <InfoRow
                    label="Ref. interne"
                    value={lot.reference_interne}
                  />
                  <InfoRow
                    label="N° appartement"
                    value={lot.num_appartement}
                  />
                  <InfoRow label="Nb pieces" value={lot.nb_pieces} />
                  <InfoRow label="Etage" value={lot.etage} />
                  <InfoRow
                    label="Emplacement / palier"
                    value={lot.emplacement_palier}
                  />
                  <InfoRow
                    label="Surface"
                    value={lot.surface ? `${lot.surface} m2` : undefined}
                  />
                  <InfoRow
                    label="Meuble"
                    value={
                      lot.meuble ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-700 border-emerald-200"
                        >
                          Oui
                        </Badge>
                      ) : (
                        'Non'
                      )
                    }
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="edit-general"
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
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type_bien"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de bien</FormLabel>
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
                            {TYPES_BIEN.map((t) => (
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
                      name="reference_interne"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ref. interne</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="num_appartement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° appartement</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="nb_pieces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nb pieces</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {NB_PIECES_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="etage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Etage</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emplacement_palier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Palier</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <FormField
                      control={form.control}
                      name="surface"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface (m2)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="meuble"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Meuble</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleSection>

          {/* --- Section: Energie --- */}
          <CollapsibleSection title="Energie" defaultOpen={false}>
            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view-energy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="divide-y"
                >
                  <InfoRow
                    label="Chauffage (type)"
                    value={lot.chauffage_type}
                  />
                  <InfoRow
                    label="Chauffage (mode)"
                    value={lot.chauffage_mode}
                  />
                  <InfoRow
                    label="Eau chaude (type)"
                    value={lot.eau_chaude_type}
                  />
                  <InfoRow
                    label="Eau chaude (mode)"
                    value={lot.eau_chaude_mode}
                  />
                  <InfoRow
                    label="DPE"
                    value={
                      lot.dpe_classe ? (
                        <Badge
                          variant="outline"
                          className={
                            DPE_COLORS[lot.dpe_classe] ?? ''
                          }
                        >
                          {lot.dpe_classe}
                        </Badge>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    label="GES"
                    value={
                      lot.ges_classe ? (
                        <Badge
                          variant="outline"
                          className={
                            DPE_COLORS[lot.ges_classe] ?? ''
                          }
                        >
                          {lot.ges_classe}
                        </Badge>
                      ) : undefined
                    }
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="edit-energy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="chauffage_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chauffage (type)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CHAUFFAGE_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chauffage_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chauffage (mode)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CHAUFFAGE_MODES.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="eau_chaude_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Eau chaude (type)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CHAUFFAGE_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eau_chaude_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Eau chaude (mode)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CHAUFFAGE_MODES.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="dpe_classe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DPE</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DPE_CLASSES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ges_classe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GES</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DPE_CLASSES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleSection>

          {/* --- Section: Annexes --- */}
          <CollapsibleSection title="Annexes" defaultOpen={false}>
            <AnimatePresence mode="wait">
              {!editing ? (
                <motion.div
                  key="view-annex"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="divide-y"
                >
                  <InfoRow label="N° parking" value={lot.num_parking} />
                  <InfoRow label="N° cave" value={lot.num_cave} />
                  <InfoRow label="Commentaire" value={lot.commentaire} />
                </motion.div>
              ) : (
                <motion.div
                  key="edit-annex"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="num_parking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° parking</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="num_cave"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° cave</FormLabel>
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
          </CollapsibleSection>
        </div>
      </Form>

      {/* --- Archive confirmation dialog --- */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archiver ce lot ?</DialogTitle>
            <DialogDescription>
              Le lot ne sera plus visible dans la liste principale. Cette
              action est reversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={archiveLot.isPending}
            >
              {archiveLot.isPending ? 'Archivage...' : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}
