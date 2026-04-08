import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAuth } from '@/hooks/use-auth';
import { useMembers } from '@/features/admin/api';
import { useCreateIndisponibilite } from './api';

// ---------------------------------------------------------------------------

const schema = z.object({
  user_id: z.string().min(1, 'Technicien requis'),
  titre: z.string().min(1, 'Titre requis'),
  date_debut: z.string().min(1, 'Date début requise'),
  heure_debut: z.string().optional(),
  date_fin: z.string().min(1, 'Date fin requise'),
  heure_fin: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).default('none'),
  est_journee_entiere: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateIndisponibiliteDialog({ open, onOpenChange }: Props) {
  const { workspace } = useAuth();
  const { data: members = [] } = useMembers(workspace?.id);
  const createIndispo = useCreateIndisponibilite();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: '',
      titre: '',
      date_debut: '',
      heure_debut: '',
      date_fin: '',
      heure_fin: '',
      recurrence: 'none',
      est_journee_entiere: false,
    },
  });

  const isFullDay = form.watch('est_journee_entiere');

  async function onSubmit(values: FormValues) {
    const payload = {
      user_id: values.user_id,
      titre: values.titre,
      date_debut: values.date_debut,
      date_fin: values.date_fin,
      est_journee_entiere: values.est_journee_entiere,
      heure_debut: values.est_journee_entiere ? undefined : (values.heure_debut || undefined),
      heure_fin: values.est_journee_entiere ? undefined : (values.heure_fin || undefined),
      recurrence: values.recurrence === 'none' ? undefined : values.recurrence,
    };

    await createIndispo.mutateAsync(payload);
    toast.success('Indisponibilité créée');
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle indisponibilité</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Technicien */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technicien *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un technicien" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.prenom} {m.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Titre */}
            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Congés, Formation, Arrêt maladie..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Journée entière toggle */}
            <FormField
              control={form.control}
              name="est_journee_entiere"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                  <FormLabel className="text-sm cursor-pointer mb-0">Journée entière</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date début *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date fin *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Heures (hidden if full-day) */}
            {!isFullDay && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="heure_debut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure début</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
            )}

            {/* Récurrence */}
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Récurrence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="biweekly">Bimensuelle</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createIndispo.isPending}>
                {createIndispo.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
