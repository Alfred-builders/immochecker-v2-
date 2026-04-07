import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { useCreateBatiment } from './api';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const adresseSchema = z.object({
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
  adresses: z
    .array(adresseSchema)
    .min(1, 'Au moins une adresse requise'),
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

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2 },
  }),
};

const adresseRowVariants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    marginBottom: 12,
    transition: { duration: 0.25 },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBuildingDialog({
  open,
  onOpenChange,
}: CreateBuildingDialogProps) {
  const createBatiment = useCreateBatiment();

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
      adresses: [
        { type: 'principale', rue: '', complement: '', code_postal: '', ville: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'adresses',
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      nb_etages:
        values.nb_etages !== '' && values.nb_etages !== undefined
          ? Number(values.nb_etages)
          : undefined,
      annee_construction:
        values.annee_construction !== '' && values.annee_construction !== undefined
          ? Number(values.annee_construction)
          : undefined,
    };

    await createBatiment.mutateAsync(payload);
    toast.success('Bâtiment créé');
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouveau bâtiment</DialogTitle>
          <DialogDescription>
            Renseignez les informations du bâtiment et ses adresses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* --- Main fields --- */}
            <motion.div
              custom={0}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Désignation *</FormLabel>
                    <FormControl>
                      <Input placeholder="Résidence Les Lilas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              custom={1}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
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
            </motion.div>

            <motion.div
              custom={2}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-3"
            >
              <FormField
                control={form.control}
                name="num_batiment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° bâtiment</FormLabel>
                    <FormControl>
                      <Input placeholder="Bat A" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Input type="number" placeholder="5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              custom={3}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-3"
            >
              <FormField
                control={form.control}
                name="annee_construction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année de construction</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1990" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Input placeholder="REF-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              custom={4}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <FormField
                control={form.control}
                name="commentaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commentaire</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes libres..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* --- Adresses --- */}
            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Adresses</h4>
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
                  Ajouter une adresse
                </Button>
              </div>

              {form.formState.errors.adresses?.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.adresses.root.message}
                </p>
              )}

              <AnimatePresence mode="popLayout">
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    variants={adresseRowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="rounded-lg border bg-muted/30 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name={`adresses.${index}.type`}
                        render={({ field: f }) => (
                          <FormItem className="flex-1 max-w-[180px]">
                            <Select
                              onValueChange={f.onChange}
                              defaultValue={f.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="principale">
                                  Principale
                                </SelectItem>
                                <SelectItem value="secondaire">
                                  Secondaire
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
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

                    <FormField
                      control={form.control}
                      name={`adresses.${index}.rue`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Rue *"
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
                                placeholder="Code postal *"
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
                                placeholder="Ville *"
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
            </div>

            {/* --- Footer --- */}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createBatiment.isPending}>
                {createBatiment.isPending ? 'Création...' : 'Créer le bâtiment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
