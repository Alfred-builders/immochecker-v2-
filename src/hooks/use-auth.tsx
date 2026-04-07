import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { apiPost, apiGet, ApiError } from '@/lib/api';

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  statut: string;
  avatar_color?: string;
  role?: string;
}

interface Workspace {
  id: string;
  nom: string;
  type_workspace: string;
  couleur_primaire?: string;
  logo_url?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface LoginResponse {
  token?: string;
  user?: User;
  workspace?: Workspace;
  workspaces?: Workspace[];
  requireWorkspaceSelection?: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

interface RegisterData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  workspaceName: string;
  workspaceType: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspace: null,
    workspaces: [],
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('imv2_token');
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    apiGet<{ user: User; workspace: Workspace }>('/auth/me')
      .then((data) => {
        setState({
          user: data.user,
          workspace: data.workspace,
          workspaces: [],
          isLoading: false,
          isAuthenticated: true,
        });
      })
      .catch(() => {
        localStorage.removeItem('imv2_token');
        localStorage.removeItem('imv2_user');
        setState({
          user: null,
          workspace: null,
          workspaces: [],
          isLoading: false,
          isAuthenticated: false,
        });
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const data = await apiPost<LoginResponse>('/auth/login', {
        email,
        password,
      });

      if (data.requireWorkspaceSelection && data.workspaces) {
        // Multi-workspace: store workspaces and wait for selection
        setState((prev) => ({
          ...prev,
          workspaces: data.workspaces!,
        }));
        return data;
      }

      // Single workspace: store token and set authenticated
      if (data.token && data.user && data.workspace) {
        localStorage.setItem('imv2_token', data.token);
        localStorage.setItem('imv2_user', JSON.stringify(data.user));
        setState({
          user: data.user,
          workspace: data.workspace,
          workspaces: [],
          isLoading: false,
          isAuthenticated: true,
        });
      }

      return data;
    },
    [],
  );

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    const response = await apiPost<{
      token: string;
      user: User;
      workspace: Workspace;
    }>('/auth/register', data);

    localStorage.setItem('imv2_token', response.token);
    localStorage.setItem('imv2_user', JSON.stringify(response.user));
    setState({
      user: response.user,
      workspace: response.workspace,
      workspaces: [],
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('imv2_token');
    localStorage.removeItem('imv2_user');
    setState({
      user: null,
      workspace: null,
      workspaces: [],
      isLoading: false,
      isAuthenticated: false,
    });
    window.location.href = '/login';
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      const response = await apiPost<{
        token: string;
        user: User;
        workspace: Workspace;
      }>('/auth/select-workspace', { workspaceId });

      localStorage.setItem('imv2_token', response.token);
      localStorage.setItem('imv2_user', JSON.stringify(response.user));
      setState({
        user: response.user,
        workspace: response.workspace,
        workspaces: [],
        isLoading: false,
        isAuthenticated: true,
      });
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
