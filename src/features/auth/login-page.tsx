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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface WorkspaceOption {
  id: string;
  nom: string;
  type_workspace: string;
  role: string;
}

export function LoginPage() {
  const { login, switchWorkspace } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[] | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password);
      if (result.requireWorkspaceSelection && result.workspaces) {
        setWorkspaces(result.workspaces);
      } else {
        navigate('/app');
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? 'Email ou mot de passe incorrect'
            : err.message
          : 'Une erreur est survenue';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkspaceSelect = async () => {
    if (!selectedWorkspace) return;
    setIsSubmitting(true);
    try {
      await switchWorkspace(selectedWorkspace);
      navigate('/app');
    } catch (err) {
      toast.error('Impossible de selectionner ce workspace');
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
      <Card className="w-full max-w-[420px] border-[#e2e8f0] shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-0.5 text-2xl font-bold tracking-tight">
            <span className="text-foreground">Immo</span>
            <span className="text-[#2563eb]">Checker</span>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Gestion d'etats des lieux simplifiee
          </CardDescription>
        </CardHeader>

        {workspaces ? (
          // Workspace selection step
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Choisir un espace de travail</Label>
              <Select
                value={selectedWorkspace}
                onValueChange={setSelectedWorkspace}
              >
                <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0]">
                  <SelectValue placeholder="Selectionner un workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleWorkspaceSelect}
              disabled={!selectedWorkspace || isSubmitting}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continuer
            </Button>
          </CardContent>
        ) : (
          // Login form
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  autoComplete="email"
                  className="bg-[#f8fafc] border-[#e2e8f0]"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="bg-[#f8fafc] border-[#e2e8f0]"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Se connecter
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="font-medium text-[#2563eb] hover:underline"
            >
              Creer un compte
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
