import React, { createContext, ReactNode, useContext, useReducer } from 'react';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'validated' | 'testing' | 'completed' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  controls: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'testing' | 'blocked' | 'approved';
  requirementId: string;
  estimatedHours: number;
  actualHours: number;
  assignedTo: string;
}

interface AppState {
  user: User | null;
  darkMode: boolean;
  sidebarOpen: boolean;
  requirements: Requirement[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_REQUIREMENTS'; payload: Requirement[] }
  | { type: 'ADD_REQUIREMENT'; payload: Requirement }
  | { type: 'UPDATE_REQUIREMENT'; payload: { id: string; data: Partial<Requirement> } }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; data: Partial<Task> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Función para obtener el estado inicial del modo oscuro desde localStorage
const getInitialDarkMode = (): boolean => {
  try {
    const savedDarkMode = localStorage.getItem('darkMode');
    return savedDarkMode ? JSON.parse(savedDarkMode) : false;
  } catch (error) {
    console.warn('Error al cargar el modo oscuro desde localStorage:', error);
    return false;
  }
};

const initialState: AppState = {
  user: null,
  darkMode: getInitialDarkMode(),
  sidebarOpen: true,
  requirements: [],
  tasks: [],
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'TOGGLE_DARK_MODE': {
      const newDarkMode = !state.darkMode;
      // Guardar en localStorage
      try {
        localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
      } catch (error) {
        console.warn('Error al guardar el modo oscuro en localStorage:', error);
      }
      return { ...state, darkMode: newDarkMode };
    }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_REQUIREMENTS':
      return { ...state, requirements: action.payload };
    case 'ADD_REQUIREMENT':
      return { ...state, requirements: [...state.requirements, action.payload] };
    case 'UPDATE_REQUIREMENT':
      return {
        ...state,
        requirements: state.requirements.map(req =>
          req.id === action.payload.id ? { ...req, ...action.payload.data } : req
        ),
      };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? { ...task, ...action.payload.data } : task
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export type { AppAction, AppState, Requirement, Task, User };
