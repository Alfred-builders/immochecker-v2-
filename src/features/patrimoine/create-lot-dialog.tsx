import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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

import { useCreateLot, useBatiments } from './api';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  batiment_id: z.string().min(1, 'Batiment requis'),
  designation: z.string().min(1, 'Designation requise'),
  type_bien: z.string().min(1, 'Type de bien requis'),
  reference_interne: z.string().optional(),
  num_appartement: z.string().optional(),
  nb_pieces: z.string().optional(),
  etage: z.string().optional(),
  surface: z.coerce.number().positive().optional().or(z.literal('')),
  meuble: z.boolean(),
  dpe_classe: z.string().optional(),
  ges_classe: z.string().optional(),
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

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2 },
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatimentId?: string;
}

export function CreateLotDialog({
  open,
  onOpenChange,
  defaultBatimentId,
}: CreateLotDialogProps) {
  const createLot = useCreateLot();
  const { data: batiments } = useBatiments();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      batiment_id: defaultBatimentId ?? '',
      designation: '',
      type_bien: '',
      reference_interne: '',
      num_appartement: '',
      nb_pieces: '',
      etage: '',
      surface: '',
      meuble: false,
      dpe_classe: '',
      ges_classe: '',
    },
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      surface:
        values.surface !== '' && values.surface !== undefined
          ? Number(values.surface)
          : undefined,
      dpe_classe: values.dpe_classe || undefined,
      ges_classe: values.ges_classe || undefined,
    };

    await createLot.mutateAsync(payload);
    toast.success('Lot cree');
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau lot</DialogTitle>
          <DialogDescription>
            Ajoutez un lot a un batiment existant.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <motion.div
              custom={0}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <FormField
                control={form.control}
                name="batiment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batiment *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner un batiment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(batiments ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.designation}
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
              custom={1}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
            >
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation *</FormLabel>
                    <FormControl>
                      <Input placeholder="Appartement 3B" {...field} />
                    </FormControl>
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
            >
              <FormField
                control={form.control}
                name="type_bien"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de bien *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner" />
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
                name="reference_interne"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ref. interne</FormLabel>
                    <FormControl>
                      <Input placeholder="LOT-001" {...field} />
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
                      <Input placeholder="3B" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              custom={4}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3"
            >
              <FormField
                control={form.control}
                name="nb_pieces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nb pieces</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                      <Input placeholder="3" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="surface"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface (m2)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="65" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div
              custom={5}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3 items-end"
            >
              <FormField
                control={form.control}
                name="dpe_classe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DPE</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                      defaultValue={field.value}
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
            </motion.div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createLot.isPending}>
                {createLot.isPending ? 'Creation...' : 'Creer le lot'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
