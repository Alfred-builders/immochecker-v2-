import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useCreateMission } from './api';
import { apiGet } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------

const schema = z.object({
  lot_id: z.string().min(1, 'Lot requis'),
  titre: z.string().optional(),
  statut_rdv: z.enum(['a_confirmer', 'confirme', 'reporte']).default('a_confirmer'),
  date_debut: z.string().optional(),
  heure_debut: z.string().optional(),
  date_fin: z.string().optional(),
  heure_fin: z.string().optional(),
  commentaire: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Lot search
// ---------------------------------------------------------------------------

interface LotOption {
  id: string;
  designation: string;
  type_bien: string;
  batiment_designation: string;
  rue?: string;
  ville?: string;
}

function useLotSearch(search: string) {
  return useQuery({
    queryKey: ['lots-search', search],
    queryFn: async () => {
      const r = await apiGet<{ data: any[] }>(
        `/lots?search=${encodeURIComponent(search)}&limit=10`,
      );
      return (r.data ?? []).map((l: any) => ({
        id: l.id,
        designation: l.designation,
        type_bien: l.type_bien,
        batiment_designation: l.batiment_designation ?? '',
        rue: l.adresse_principale?.rue,
        ville: l.adresse_principale?.ville,
      })) as LotOption[];
    },
    enabled: search.length >= 1,
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateMissionDialog({ open, onOpenChange }: Props) {
  const [lotSearch, setLotSearch] = useState('');
  const [selectedLot, setSelectedLot] = useState<LotOption | null>(null);
  const [lotOpen, setLotOpen] = useState(false);

  const { data: lotOptions } = useLotSearch(lotSearch);
  const createMission = useCreateMission();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lot_id: '',
      titre: '',
      statut_rdv: 'a_confirmer',
      date_debut: '',
      heure_debut: '',
      date_fin: '',
      heure_fin: '',
      commentaire: '',
    },
  });

  function selectLot(lot: LotOption) {
    setSelectedLot(lot);
    form.setValue('lot_id', lot.id);
    setLotOpen(false);
    setLotSearch('');
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      titre: values.titre || undefined,
      date_debut: values.date_debut || undefined,
      heure_debut: values.heure_debut || undefined,
      date_fin: values.date_fin || undefined,
      heure_fin: values.heure_fin || undefined,
      commentaire: values.commentaire || undefined,
    };
    await createMission.mutateAsync(payload);
    toast.success('Mission créée');
    form.reset();
    setSelectedLot(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle mission</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Lot picker */}
            <FormField
              control={form.control}
              name="lot_id"
              render={() => (
                <FormItem>
                  <FormLabel>Lot *</FormLabel>
                  <div className="relative">
                    {selectedLot ? (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{selectedLot.designation}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedLot.batiment_designation}
                            {selectedLot.ville && ` · ${selectedLot.ville}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setSelectedLot(null); form.setValue('lot_id', ''); }}
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={lotSearch}
                            onChange={(e) => { setLotSearch(e.target.value); setLotOpen(true); }}
                            onFocus={() => setLotOpen(true)}
                            placeholder="Rechercher un lot..."
                            className="pl-8"
                          />
                        </div>
                        {lotOpen && lotOptions && lotOptions.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg">
                            <ul className="max-h-[200px] overflow-y-auto py-1">
                              {lotOptions.map((lot) => (
                                <li
                                  key={lot.id}
                                  className="flex cursor-pointer flex-col px-3 py-2 hover:bg-muted/60"
                                  onMouseDown={(e) => { e.preventDefault(); selectLot(lot); }}
                                >
                                  <span className="text-sm font-medium">{lot.designation}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {lot.batiment_designation}
                                    {lot.ville && ` · ${lot.ville}`}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="EDL entrée — Appt 12" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            {/* Planning */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date prévue</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heure_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heure_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="statut_rdv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut RDV</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="a_confirmer">À confirmer</SelectItem>
                      <SelectItem value="confirme">Confirmé</SelectItem>
                      <SelectItem value="reporte">Reporté</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instructions, notes..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMission.isPending}>
                {createMission.isPending ? 'Création...' : 'Créer la mission'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
