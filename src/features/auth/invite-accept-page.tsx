import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiGet, apiPost, ApiError } from '@/lib/api';

const inviteSchema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface InviteInfo {
  email: string;
  workspaceName: string;
  inviterName: string;
  isExistingUser: boolean;
}

type PageState = 'loading' | 'form' | 'success' | 'error';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { prenom: '', nom: '', password: '' },
  });

  useEffect(() => {
    if (!token) {
      setErrorMessage("Lien d'invitation invalide");
      setPageState('error');
      return;
    }

    apiGet<InviteInfo>(`/auth/invite/${token}`)
      .then((data) => {
        setInviteInfo(data);
        setPageState('form');
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof ApiError && err.status === 404
            ? "Cette invitation n'existe pas ou a expiré"
            : "Impossible de charger l'invitation",
        );
        setPageState('error');
      });
  }, [token]);

  const onSubmit = async (data: InviteForm) => {
    setIsSubmitting(true);
    try {
      const response = await apiPost<{ token: string }>('/auth/accept-invite', {
        inviteToken: token,
        ...data,
      });

      localStorage.setItem('imv2_token', response.token);
      setPageState('success');
      toast.success('Invitation acceptée !');

      // Redirect after a short delay for UX
      setTimeout(() => {
        navigate('/app');
      }, 1500);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Une erreur est survenue';
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
      <Card className="w-full max-w-[420px] border-border shadow-sm">
        {/* Loading state */}
        {pageState === 'loading' && (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de l'invitation...
            </p>
          </CardContent>
        )}

        {/* Error state */}
        {pageState === 'error' && (
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="mt-4 text-sm font-medium text-foreground">
              Invitation invalide
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => navigate('/login')}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        )}

        {/* Success state */}
        {pageState === 'success' && (
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </motion.div>
            <p className="mt-4 text-sm font-medium text-foreground">
              Bienvenue dans {inviteInfo?.workspaceName} !
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Redirection en cours...
            </p>
          </CardContent>
        )}

        {/* Form state */}
        {pageState === 'form' && inviteInfo && (
          <>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-0.5 text-2xl font-bold tracking-tight">
                <span className="text-foreground">Immo</span>
                <span className="text-primary">Checker</span>
              </div>
              <CardTitle className="mt-4 text-lg">
                Rejoindre {inviteInfo.workspaceName}
              </CardTitle>
              <CardDescription>
                {inviteInfo.inviterName} vous invite à rejoindre son espace de
                travail
              </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Vous serez connecté avec
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {inviteInfo.email}
                  </p>
                </div>

                {!inviteInfo.isExistingUser && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="inv-nom">Nom</Label>
                        <Input
                          id="inv-nom"
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
                        <Label htmlFor="inv-prenom">Prénom</Label>
                        <Input
                          id="inv-prenom"
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

                    <div className="space-y-2">
                      <Label htmlFor="inv-password">Mot de passe</Label>
                      <Input
                        id="inv-password"
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
                  </>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {inviteInfo.isExistingUser
                    ? 'Rejoindre le workspace'
                    : 'Créer mon compte et rejoindre'}
                </Button>
              </CardContent>
            </form>
          </>
        )}
      </Card>
    </motion.div>
  );
}
