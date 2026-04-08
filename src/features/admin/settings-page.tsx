import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Users,
  Save,
  Check,
  UserPlus,
  X,
  Trash2,
  Mail,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { AnimatedPage } from '@/components/animated-page';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  useWorkspaceDetail,
  useUpdateWorkspace,
  useMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useInvite,
  useInvitations,
  useCancelInvitation,
  type Member,
} from './api';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const workspaceSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type_workspace: z.string().min(1, 'Type requis'),
  siret: z.string().optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional().or(z.literal('')),
  adresse: z.string().optional().or(z.literal('')),
  code_postal: z.string().optional().or(z.literal('')),
  ville: z.string().optional().or(z.literal('')),
  couleur_primaire: z.string().optional().or(z.literal('')),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.string().min(1, 'Rôle requis'),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKSPACE_TYPES = [
  { value: 'syndic', label: 'Syndic' },
  { value: 'bailleur', label: 'Bailleur' },
  { value: 'agence', label: 'Agence immobilière' },
  { value: 'sci', label: 'SCI' },
  { value: 'autre', label: 'Autre' },
];

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'viewer', label: 'Lecteur' },
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  owner: 'bg-secondary text-secondary-foreground border-border',
  editor: 'bg-success/10 text-success border-success/20',
  viewer: 'bg-muted text-muted-foreground border-border',
  member: 'bg-muted text-muted-foreground border-border',
};

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

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(prenom: string, nom: string): string {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isLastAdmin(members: Member[] | undefined, userId: string): boolean {
  if (!members) return false;
  const admins = members.filter(
    (m) => m.role === 'admin' || m.role === 'owner',
  );
  return admins.length <= 1 && admins.some((a) => a.id === userId);
}

// ---------------------------------------------------------------------------
// Informations Tab
// ---------------------------------------------------------------------------

function InformationsTab({ workspaceId }: { workspaceId: string }) {
  const { data: workspace, isLoading } = useWorkspaceDetail(workspaceId);
  const updateWorkspace = useUpdateWorkspace();
  const [saved, setSaved] = useState(false);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: '',
      type_workspace: '',
      siret: '',
      email: '',
      telephone: '',
      adresse: '',
      code_postal: '',
      ville: '',
      couleur_primaire: '',
    },
  });

  // Sync form with loaded workspace data
  useEffect(() => {
    if (workspace) {
      form.reset({
        name: workspace.nom ?? '',
        type_workspace: workspace.type_workspace ?? '',
        siret: workspace.siret ?? '',
        email: workspace.email ?? '',
        telephone: workspace.telephone ?? '',
        adresse: workspace.adresse ?? '',
        code_postal: workspace.code_postal ?? '',
        ville: workspace.ville ?? '',
        couleur_primaire: workspace.couleur_primaire ?? '',
      });
    }
  }, [workspace, form]);

  async function onSubmit(values: WorkspaceFormValues) {
    try {
      await updateWorkspace.mutateAsync({ id: workspaceId, ...values });
      toast.success('Paramètres enregistrés');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const couleurValue = form.watch('couleur_primaire');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du workspace</CardTitle>
        <CardDescription>Configurez les informations de votre espace de travail.</CardDescription>
      </CardHeader>
      <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Nom */}
          <motion.div
            custom={0}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Mon workspace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Type workspace */}
          <motion.div
            custom={1}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <FormField
              control={form.control}
              name="type_workspace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de workspace *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORKSPACE_TYPES.map((t) => (
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

          {/* SIRET */}
          <motion.div
            custom={2}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <FormField
              control={form.control}
              name="siret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SIRET</FormLabel>
                  <FormControl>
                    <Input placeholder="123 456 789 00001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Email + Téléphone */}
          <motion.div
            custom={3}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@entreprise.fr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="01 23 45 67 89" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Adresse */}
          <motion.div
            custom={4}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <FormField
              control={form.control}
              name="adresse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="12 rue de la Paix" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Code postal + Ville */}
          <motion.div
            custom={5}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4"
          >
            <FormField
              control={form.control}
              name="code_postal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code postal</FormLabel>
                  <FormControl>
                    <Input placeholder="75001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ville"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <Input placeholder="Paris" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <Separator />

          {/* Couleur primaire */}
          <motion.div
            custom={6}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
          >
            <FormField
              control={form.control}
              name="couleur_primaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur primaire</FormLabel>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 shrink-0 rounded-md border border-border"
                      style={{
                        backgroundColor: couleurValue || '#2563EB',
                      }}
                    />
                    <FormControl>
                      <Input placeholder="#2563EB" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Save button */}
          <motion.div
            custom={7}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-end pt-2"
          >
            <Button
              type="submit"
              disabled={updateWorkspace.isPending}
              className="gap-2"
            >
              <motion.div
                key={saved ? 'check' : 'save'}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </motion.div>
              {updateWorkspace.isPending
                ? 'Enregistrement...'
                : saved
                  ? 'Enregistré !'
                  : 'Enregistrer'}
            </Button>
          </motion.div>
        </form>
      </Form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Équipe Tab
// ---------------------------------------------------------------------------

function EquipeTab({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const { data: members, isLoading: membersLoading } = useMembers(workspaceId);
  const { data: invitations, isLoading: invitationsLoading } = useInvitations();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const invite = useInvite();
  const cancelInvitation = useCancelInvitation();

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'editor' },
  });

  async function onInvite(values: InviteFormValues) {
    try {
      await invite.mutateAsync(values);
      toast.success(`Invitation envoyée à ${values.email}`);
      inviteForm.reset({ email: '', role: 'editor' });
    } catch {
      toast.error("Erreur lors de l'envoi de l'invitation");
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      await updateRole.mutateAsync({
        workspaceId,
        userId: memberId,
        role: newRole,
      });
      toast.success('Rôle mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    try {
      await removeMember.mutateAsync({ workspaceId, userId: memberId });
      toast.success(`${memberName} a été retiré`);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      await cancelInvitation.mutateAsync(invitationId);
      toast.success('Invitation annulée');
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  }

  const isLoading = membersLoading || invitationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle>Inviter un membre</CardTitle>
          <CardDescription>Envoyez une invitation par email pour ajouter un nouveau membre.</CardDescription>
        </CardHeader>
        <CardContent>
        <Form {...inviteForm}>
          <form
            onSubmit={inviteForm.handleSubmit(onInvite)}
            className="flex items-end gap-3"
          >
            <FormField
              control={inviteForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="collegue@entreprise.fr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={inviteForm.control}
              name="role"
              render={({ field }) => (
                <FormItem className="w-40">
                  <FormLabel>Rôle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={invite.isPending}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {invite.isPending ? 'Envoi...' : 'Inviter'}
            </Button>
          </form>
        </Form>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {invitations.map((inv) => (
                <motion.div
                  key={inv.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {inv.email}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expire le {formatDate(inv.expires_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        ROLE_BADGE_CLASSES[inv.role] ??
                        'bg-muted text-muted-foreground border-border'
                      }
                    >
                      {inv.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancelInvitation(inv.id)}
                      disabled={cancelInvitation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Membres de l'équipe</CardTitle>
          <CardDescription>
            {members?.length ?? 0} membre{(members?.length ?? 0) > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {members?.map((member) => {
                const isLast = isLastAdmin(members, member.id);
                const isSelf = user?.id === member.id;

                return (
                  <motion.tr
                    key={member.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(member.prenom, member.nom)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {member.prenom} {member.nom}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (vous)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {member.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.role === 'owner' || isLast ? (
                        <Badge
                          variant="outline"
                          className={
                            ROLE_BADGE_CLASSES[member.role] ??
                            'bg-muted text-muted-foreground border-border'
                          }
                        >
                          {member.role === 'owner' ? 'Propriétaire' : 'Admin'}
                        </Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(val) =>
                            handleRoleChange(member.id, val)
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isLast && member.role !== 'owner' && !isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            handleRemoveMember(
                              member.id,
                              `${member.prenom} ${member.nom}`,
                            )
                          }
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>

        {(!members || members.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucun membre pour le moment
            </p>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const { workspace } = useAuth();

  if (!workspace) {
    return (
      <AnimatedPage className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurez votre espace de travail et gérez votre équipe.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="informations">
        <TabsList>
          <TabsTrigger value="informations" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="h-4 w-4" />
            Équipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="informations" className="mt-6">
          <InformationsTab workspaceId={workspace.id} />
        </TabsContent>

        <TabsContent value="equipe" className="mt-6">
          <EquipeTab workspaceId={workspace.id} />
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  );
}
