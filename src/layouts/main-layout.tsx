import { useState, useRef, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  FileText,
  Calendar,
  LayoutDashboard,
  Settings,
  Pin,
  PinOff,
  LogOut,
  User,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { GlobalSearch } from '@/components/global-search';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operationnel',
    items: [
      { label: 'Tableau de bord', href: '/app/dashboard', icon: LayoutDashboard },
      { label: 'Missions', href: '/app/missions', icon: Calendar },
    ],
  },
  {
    title: 'Referentiel',
    items: [
      { label: 'Parc immobilier', href: '/app/patrimoine', icon: Building2 },
      { label: 'Tiers', href: '/app/tiers', icon: Users },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Templates', href: '/app/templates', icon: FileText },
      { label: 'Parametres', href: '/app/parametres', icon: Settings },
    ],
  },
];

const WORKSPACE_TYPE_LABELS: Record<string, string> = {
  societe_edl: "Societe d'EDL",
  bailleur: 'Bailleur',
  agence: 'Agence immobiliere',
};

export function MainLayout() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, workspace, logout } = useAuth();
  const location = useLocation();
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collapsed = !pinned && !hovered;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(false);
    }, 200);
  }, []);

  const userInitials = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase()
    : '??';

  const workspaceInitials = workspace
    ? workspace.nom
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'WS';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
        {/* Sidebar spacer — always collapsed width */}
        <div className="w-[72px] shrink-0" />

        {/* Sidebar — overlays content on hover */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 72 : 260 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[#e2e8f0] bg-white shadow-lg"
        >
          {/* Workspace header */}
          <div className="flex h-16 items-center gap-3 border-b border-[#e2e8f0] px-4">
            <Avatar className="h-9 w-9 shrink-0 bg-[#2563eb] text-white">
              <AvatarFallback className="bg-[#2563eb] text-sm font-semibold text-white">
                {workspaceInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-semibold text-foreground">
                  {workspace?.nom ?? 'Workspace'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {workspace?.type_workspace
                    ? WORKSPACE_TYPE_LABELS[workspace.type_workspace] ?? workspace.type_workspace
                    : ''}
                </p>
              </motion.div>
            )}
          </div>


          {/* Search button */}
          <div className="px-3 pb-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Search className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-left text-xs">Rechercher...</span>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.title} className={cn(gi > 0 && 'mt-6')}>
                {!collapsed && (
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      !item.disabled && location.pathname.startsWith(item.href);

                    const linkContent = (
                      <div
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          item.disabled
                            ? 'cursor-not-allowed text-muted-foreground/50'
                            : isActive
                              ? 'bg-[#eff6ff] text-[#2563eb]'
                              : 'text-muted-foreground hover:bg-[#f8fafc] hover:text-foreground',
                          collapsed && 'justify-center px-0',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 shrink-0',
                            item.disabled
                              ? 'text-muted-foreground/40'
                              : isActive
                                ? 'text-[#2563eb]'
                                : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );

                    if (item.disabled) {
                      if (collapsed) {
                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                              <div>{linkContent}</div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>
                                {item.label} - {item.badge}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return <div key={item.href}>{linkContent}</div>;
                    }

                    if (collapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <NavLink to={item.href}>{linkContent}</NavLink>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <NavLink key={item.href} to={item.href}>
                        {linkContent}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Pin toggle -- only visible when sidebar is expanded */}
          {!collapsed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setPinned(!pinned)}
              className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-muted/50"
              title={pinned ? 'Detacher la barre' : 'Epingler la barre'}
            >
              {pinned ? (
                <PinOff className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Pin className="h-3 w-3 text-muted-foreground" />
              )}
            </motion.button>
          )}

          {/* Footer: user info */}
          <div className="border-t border-[#e2e8f0] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[#f8fafc]',
                    collapsed && 'justify-center',
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-[#e2e8f0] text-xs font-semibold text-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {user?.prenom} {user?.nom}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => (window.location.href = '/app/parametres')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Se deconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.aside>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Breadcrumb header */}
          <header className="flex h-14 items-center border-b border-[#e2e8f0] bg-white px-6">
            <Breadcrumbs />
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </TooltipProvider>
  );
}

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname
    .replace('/app/', '')
    .split('/')
    .filter(Boolean);

  const LABELS: Record<string, string> = {
    patrimoine: 'Parc immobilier',
    batiments: 'Batiment',
    lots: 'Lot',
    parametres: 'Parametres',
    tiers: 'Tiers',
    templates: 'Templates',
    missions: 'Missions',
    dashboard: 'Tableau de bord',
  };

  if (segments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {segments.map((segment, i) => {
        const label = LABELS[segment] ?? segment;
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-muted-foreground">/</span>
            )}
            <span
              className={cn(
                isLast
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
