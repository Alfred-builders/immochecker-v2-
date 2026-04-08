import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';

const registerSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Adresse email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  workspaceName: z
    .string()
    .min(1, "Le nom de l'espace de travail est requis"),
  workspaceType: z.enum(['societe_edl', 'bailleur', 'agence'], {
    required_error: "Le type d'activité est requis",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

const WORKSPACE_TYPES = [
  { value: 'societe_edl', label: "Société d'états des lieux" },
  { value: 'bailleur', label: 'Bailleur' },
  { value: 'agence', label: 'Agence immobilière' },
] as const;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      workspaceName: '',
      workspaceType: undefined,
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await registerUser(data);
      toast.success('Compte créé avec succès');
      navigate('/app');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? 'Un compte existe déjà avec cet email'
            : err.message
          : 'Une erreur est survenue';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="w-full max-w-[480px] border-border shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-0.5 text-2xl font-bold tracking-tight">
            <span className="text-foreground">Immo</span>
            <span className="text-primary">Checker</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Créez votre espace de travail
          </p>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  placeholder="Dupont"
                  autoComplete="family-name"
                  className="bg-muted/50 border-border"
                  {...form.register('nom')}
                />
                {form.formState.errors.nom && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.nom.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  placeholder="Jean"
                  autoComplete="given-name"
                  className="bg-muted/50 border-border"
                  {...form.register('prenom')}
                />
                {form.formState.errors.prenom && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.prenom.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="nom@exemple.com"
                autoComplete="email"
                className="bg-muted/50 border-border"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="reg-password">Mot de passe</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                className="bg-muted/50 border-border"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Workspace name */}
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nom de l'espace de travail</Label>
              <Input
                id="workspaceName"
                placeholder="Ma société"
                className="bg-muted/50 border-border"
                {...form.register('workspaceName')}
              />
              {form.formState.errors.workspaceName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.workspaceName.message}
                </p>
              )}
            </div>

            {/* Workspace type */}
            <div className="space-y-2">
              <Label>Type d'activité</Label>
              <Select
                value={form.watch('workspaceType')}
                onValueChange={(val) =>
                  form.setValue('workspaceType', val as RegisterForm['workspaceType'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.workspaceType && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.workspaceType.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer mon compte
            </Button>
          </CardContent>
        </form>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
