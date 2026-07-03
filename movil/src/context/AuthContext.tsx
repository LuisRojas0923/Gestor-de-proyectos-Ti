import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  authenticateUser,
  clearSession,
  createAccount as serviceCreateAccount,
  deleteAccount as serviceDeleteAccount,
  getActiveSession,
  getStoredAccounts,
  getUserById,
  hasAnyAccounts,
  setActiveSession,
} from '../services/auth';
import { UserAccount, UserRole } from '../types';
import { loadServerAddress } from '../services/faceApi';

// Tipo de resultado para operaciones que pueden fallar
interface ActionResult {
  success: boolean;
  error?: string;
}

// Interfaz del contexto de autenticación
interface AuthContextType {
  // Estado
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  isFirstRun: boolean;
  isLoading: boolean;
  accounts: UserAccount[];

  // Acciones
  login: (username: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  createAccount: (
    username: string,
    password: string,
    role: UserRole,
    displayName: string
  ) => Promise<ActionResult>;
  deleteAccount: (accountId: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  // Cargar estado inicial al montar el componente
  useEffect(() => {
    async function initializeAuth() {
      try {
        await loadServerAddress();

        // 1. Verificar si existen cuentas registradas (si falla la red, asumimos false temporalmente para evitar bloquear)
        try {
          const existenCuentas = await hasAnyAccounts();
          setIsFirstRun(!existenCuentas);
        } catch (e) {
          console.warn('Asumiendo que hay cuentas temporalmente por error de red');
        }

        // 2. Verificar si hay una sesión activa guardada
        const sessionUserId = await getActiveSession();
        if (sessionUserId) {
          const user = await getUserById(sessionUserId);
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            
            // 3. Cargar la lista completa de cuentas SOLO si es administrador
            if (user.role === 'admin') {
              const storedAccounts = await getStoredAccounts(user.id);
              setAccounts(storedAccounts);
            }
          }
        }
      } catch (error) {
        console.error('Error al inicializar la autenticación:', error);
      } finally {
        // 4. Marcar la carga como finalizada
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, []);

  // Iniciar sesión con usuario y contraseña
  const login = useCallback(async (username: string, password: string): Promise<ActionResult> => {
    try {
      const user = await authenticateUser(username, password);

      if (!user) {
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      }

      // NO sobreescribir la sesión aquí, ya fue guardada como JWT en authenticateUser
      setCurrentUser(user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      return { success: false, error: error.message || 'Ocurrió un error al iniciar sesión. Verifica tu conexión e intenta nuevamente.' };
    }
  }, []);

  // Cerrar sesión actual
  const logout = useCallback(async () => {
    try {
      await clearSession();
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, []);

  // Recargar la lista de cuentas desde el almacenamiento
  const refreshAccounts = useCallback(async () => {
    try {
      // 1. Siempre verificar si existen cuentas para saber si estamos en First Run
      try {
        const existenCuentas = await hasAnyAccounts();
        setIsFirstRun(!existenCuentas);
      } catch (e) {
        // En caso de error de red, NO cambiamos el estado de isFirstRun a true
        console.warn('Error al verificar cuentas, manteniendo estado actual');
      }

      // 2. Solo intentar descargar la lista completa si somos administradores
      if (currentUser && currentUser.role === 'admin') {
        const storedAccounts = await getStoredAccounts(currentUser.id);
        setAccounts(storedAccounts);
      } else {
        setAccounts([]); // Los usuarios normales no tienen acceso a la lista
      }
    } catch (error) {
      console.error('Error al recargar las cuentas:', error);
    }
  }, [currentUser]);

  // Cargar cuentas automáticamente cuando un administrador inicia sesión
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      refreshAccounts();
    }
  }, [currentUser, refreshAccounts]);

  // Crear una nueva cuenta de usuario
  const createAccount = useCallback(async (
    username: string,
    password: string,
    role: UserRole,
    displayName: string
  ): Promise<ActionResult> => {
    // Validaciones locales
    if (!username || username.trim().length < 3) {
      return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }

    if (!password || password.length < 4) {
      return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    if (!displayName || displayName.trim().length === 0) {
      return { success: false, error: 'El nombre para mostrar no puede estar vacío.' };
    }

    try {
      await serviceCreateAccount(username, password, role, displayName);

      // Recargar la lista de cuentas tras la creación exitosa
      await refreshAccounts();

      return { success: true };
    } catch (error: unknown) {
      console.error('Error al crear la cuenta:', error);
      const mensaje = error instanceof Error ? error.message : 'Ocurrió un error al crear la cuenta. Intente nuevamente.';
      return { success: false, error: mensaje };
    }
  }, [refreshAccounts]);

  // Eliminar una cuenta de usuario
  const deleteAccount = useCallback(async (accountId: string) => {
    try {
      await serviceDeleteAccount(accountId, currentUser?.id || '');

      // Recargar la lista de cuentas tras la eliminación
      await refreshAccounts();
    } catch (error) {
      console.error('Error al eliminar la cuenta:', error);
    }
  }, [refreshAccounts]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        isFirstRun,
        isLoading,
        accounts,
        login,
        logout,
        createAccount,
        deleteAccount,
        refreshAccounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
