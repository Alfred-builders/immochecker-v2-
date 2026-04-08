import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddressAutocomplete, type AddressResult } from '@/components/address-autocomplete';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useCreateTiers } from './api';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ppSchema = z.object({
  type: z.literal('personne_physique'),
  civilite: z.string().optional(),
  nom: z.string().min(1, 'Le nom est obligatoire'),
  prenom: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  code_postal: z.string().optional(),
  ville: z.string().optional(),
  reference_interne: z.string().optional(),
  notes: z.string().optional(),
});

const pmSchema = z.object({
  type: z.literal('personne_morale'),
  raison_sociale: z.string().min(1, 'La raison sociale est obligatoire'),
  siret: z.string().optional(),
  forme_juridique: z.string().optional(),
  representant_nom: z.string().optional(),
  representant_prenom: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  code_postal: z.string().optional(),
  ville: z.string().optional(),
  reference_interne: z.string().optional(),
  notes: z.string().optional(),
});

type PPForm = z.infer<typeof ppSchema>;
type PMForm = z.infer<typeof pmSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTiersDialog({ open, onOpenChange }: Props) {
  const createTiers = useCreateTiers();

  const ppForm = useForm<PPForm>({
    resolver: zodResolver(ppSchema),
    defaultValues: {
      type: 'personne_physique',
      civilite: '',
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      code_postal: '',
      ville: '',
      reference_interne: '',
      notes: '',
    },
  });

  const pmForm = useForm<PMForm>({
    resolver: zodResolver(pmSchema),
    defaultValues: {
      type: 'personne_morale',
      raison_sociale: '',
      siret: '',
      forme_juridique: '',
      representant_nom: '',
      representant_prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      code_postal: '',
      ville: '',
      reference_interne: '',
      notes: '',
    },
  });

  async function onSubmitPP(values: PPForm) {
    await createTiers.mutateAsync(values);
    toast.success('Personne physique créée');
    ppForm.reset();
    onOpenChange(false);
  }

  async function onSubmitPM(values: PMForm) {
    await createTiers.mutateAsync(values);
    toast.success('Personne morale créée');
    pmForm.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau tiers</DialogTitle>
          <DialogDescription>
            Créez une personne physique ou morale.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pp" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="pp" className="flex-1">
              Personne physique
            </TabsTrigger>
            <TabsTrigger value="pm" className="flex-1">
              Personne morale
            </TabsTrigger>
          </TabsList>

          {/* --- PP Tab --- */}
          <TabsContent value="pp" className="mt-4">
            <Form {...ppForm}>
              <form
                onSubmit={ppForm.handleSubmit(onSubmitPP)}
                className="space-y-3"
              >
                <FormField
                  control={ppForm.control}
                  name="civilite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civilité</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
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
                        <FormControl>
                          <Input placeholder="Dupont" {...field} />
                        </FormControl>
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
                        <FormControl>
                          <Input placeholder="Jean" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={ppForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="jean@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={ppForm.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <AddressAutocomplete
                    placeholder="Rechercher une adresse..."
                    value={ppForm.watch('adresse')}
                    onSelect={(result: AddressResult) => {
                      ppForm.setValue('adresse', result.rue);
                      ppForm.setValue('code_postal', result.code_postal);
                      ppForm.setValue('ville', result.ville);
                    }}
                    onChange={(val) => ppForm.setValue('adresse', val)}
                  />
                </FormItem>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={ppForm.control}
                    name="code_postal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input placeholder="75001" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={ppForm.control}
                    name="ville"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Paris" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={ppForm.control}
                  name="reference_interne"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Réf. interne</FormLabel>
                      <FormControl>
                        <Input placeholder="REF-001" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={ppForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[60px]" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => onOpenChange(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                    disabled={createTiers.isPending}
                  >
                    {createTiers.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* --- PM Tab --- */}
          <TabsContent value="pm" className="mt-4">
            <Form {...pmForm}>
              <form
                onSubmit={pmForm.handleSubmit(onSubmitPM)}
                className="space-y-3"
              >
                <FormField
                  control={pmForm.control}
                  name="raison_sociale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison sociale *</FormLabel>
                      <FormControl>
                        <Input placeholder="SARL Immobilier" {...field} />
                      </FormControl>
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
                        <FormControl>
                          <Input placeholder="123 456 789 00001" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pmForm.control}
                    name="forme_juridique"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forme juridique</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
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
                        <FormLabel>Nom du représentant</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pmForm.control}
                    name="representant_prenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom du représentant</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={pmForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pmForm.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <AddressAutocomplete
                    placeholder="Rechercher une adresse..."
                    value={pmForm.watch('adresse')}
                    onSelect={(result: AddressResult) => {
                      pmForm.setValue('adresse', result.rue);
                      pmForm.setValue('code_postal', result.code_postal);
                      pmForm.setValue('ville', result.ville);
                    }}
                    onChange={(val) => pmForm.setValue('adresse', val)}
                  />
                </FormItem>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={pmForm.control}
                    name="code_postal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pmForm.control}
                    name="ville"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={pmForm.control}
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
                <FormField
                  control={pmForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[60px]" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => onOpenChange(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                    disabled={createTiers.isPending}
                  >
                    {createTiers.isPending ? 'Création...' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
