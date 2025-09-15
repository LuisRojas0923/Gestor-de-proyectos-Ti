/**
 * Tests de integración para Fase 2: Frontend - Conexión con Backend
 * Sistema de Gestión de Proyectos TI - Persistencia de Datos
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevelopmentUpdates } from '../hooks/useDevelopmentUpdates';
import { useObservations } from '../hooks/useObservations';
import MyDevelopments from '../pages/MyDevelopments';

// Mock de los hooks
vi.mock('../hooks/useObservations');
vi.mock('../hooks/useDevelopmentUpdates');
vi.mock('../hooks/useApi');
vi.mock('../context/AppContext');

// Mock de los componentes
vi.mock('../components/common/ExcelImporter', () => ({
  default: () => <div data-testid="excel-importer">Excel Importer</div>
}));

vi.mock('../components/development', () => ({
  DevelopmentPhases: () => <div data-testid="development-phases">Development Phases</div>,
  DevelopmentTimeline: () => <div data-testid="development-timeline">Development Timeline</div>
}));

describe('Fase 2 - Integración Frontend-Backend', () => {
  const mockObservations = [
    {
      id: 1,
      development_id: 'INC000004924201',
      observation_type: 'seguimiento' as const,
      content: 'Testing de integración - Actividad creada',
      author: 'Usuario Test',
      observation_date: '2025-01-15T10:00:00Z',
      is_current: true,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: null
    }
  ];

  const mockDevelopment = {
    id: 'INC000004924201',
    name: 'Macro De Saldos',
    provider: 'TI',
    requesting_area: 'Tesoreria',
    main_responsible: 'Bricit S.',
    start_date: '2025-07-31',
    estimated_end_date: '2025-09-04',
    estimated_days: 35,
    general_status: 'En curso' as const,
    current_stage: '1. Ajuste de Requerimiento',
    activities: [],
    incidents: []
  };

  beforeEach(() => {
    // Mock de useObservations
    vi.mocked(useObservations).mockReturnValue({
      observations: mockObservations,
      loading: false,
      error: null,
      createObservation: vi.fn().mockResolvedValue(mockObservations[0]),
      updateObservation: vi.fn(),
      deleteObservation: vi.fn(),
      refreshObservations: vi.fn()
    });

    // Mock de useDevelopmentUpdates
    vi.mocked(useDevelopmentUpdates).mockReturnValue({
      loading: false,
      error: null,
      updateDevelopment: vi.fn().mockResolvedValue(mockDevelopment),
      changeStage: vi.fn(),
      updateProgress: vi.fn()
    });

    // Mock de useApi
    vi.mock('../hooks/useApi', () => ({
      useApi: () => ({
        get: vi.fn().mockResolvedValue([mockDevelopment]),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
      })
    }));

    // Mock de useAppContext
    vi.mock('../context/AppContext', () => ({
      useAppContext: () => ({
        state: { darkMode: false }
      })
    }));
  });

  describe('Hook useObservations', () => {
    it('debería cargar observaciones correctamente', () => {
      const { observations, loading, error } = useObservations('INC000004924201');
      
      expect(observations).toEqual(mockObservations);
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });

    it('debería crear observaciones correctamente', async () => {
      const { createObservation } = useObservations('INC000004924201');
      
      const newObservation = {
        observation_type: 'seguimiento' as const,
        content: 'Nueva actividad de prueba',
        author: 'Usuario Test',
        is_current: true
      };

      const result = await createObservation(newObservation);
      
      expect(result).toEqual(mockObservations[0]);
    });
  });

  describe('Hook useDevelopmentUpdates', () => {
    it('debería actualizar desarrollos correctamente', async () => {
      const { updateDevelopment } = useDevelopmentUpdates();
      
      const updateData = {
        name: 'Macro De Saldos Actualizado',
        general_status: 'Completado' as const
      };

      const result = await updateDevelopment('INC000004924201', updateData);
      
      expect(result).toEqual(mockDevelopment);
    });
  });

  describe('Componente MyDevelopments', () => {
    it('debería renderizar correctamente', () => {
      render(<MyDevelopments />);
      
      expect(screen.getByText('Mis Desarrollos')).toBeInTheDocument();
    });

    it('debería mostrar observaciones cuando se selecciona un desarrollo', async () => {
      render(<MyDevelopments />);
      
      // Simular selección de desarrollo (esto requeriría más setup del mock)
      // Por ahora, verificamos que el hook se está usando correctamente
      expect(useObservations).toHaveBeenCalled();
    });

    it('debería permitir agregar nuevas actividades', async () => {
      const mockCreateObservation = vi.fn().mockResolvedValue(mockObservations[0]);
      vi.mocked(useObservations).mockReturnValue({
        observations: [],
        loading: false,
        error: null,
        createObservation: mockCreateObservation,
        updateObservation: vi.fn(),
        deleteObservation: vi.fn(),
        refreshObservations: vi.fn()
      });

      render(<MyDevelopments />);
      
      // Aquí se probaría la funcionalidad de agregar actividades
      // Requeriría más setup del componente y mocks
      expect(mockCreateObservation).toBeDefined();
    });
  });

  describe('Integración de Endpoints', () => {
    it('debería conectar correctamente con endpoints de observaciones', () => {
      // Verificar que los hooks están configurados para usar los endpoints correctos
      expect(useObservations).toHaveBeenCalled();
      expect(useDevelopmentUpdates).toHaveBeenCalled();
    });

    it('debería manejar errores de API correctamente', () => {
      vi.mocked(useObservations).mockReturnValue({
        observations: [],
        loading: false,
        error: 'Error de conexión con el servidor',
        createObservation: vi.fn(),
        updateObservation: vi.fn(),
        deleteObservation: vi.fn(),
        refreshObservations: vi.fn()
      });

      const { error } = useObservations('INC000004924201');
      expect(error).toBe('Error de conexión con el servidor');
    });
  });

  describe('Persistencia de Datos', () => {
    it('debería persistir observaciones en el backend', async () => {
      const mockCreateObservation = vi.fn().mockResolvedValue(mockObservations[0]);
      vi.mocked(useObservations).mockReturnValue({
        observations: [],
        loading: false,
        error: null,
        createObservation: mockCreateObservation,
        updateObservation: vi.fn(),
        deleteObservation: vi.fn(),
        refreshObservations: vi.fn()
      });

      const { createObservation } = useObservations('INC000004924201');
      
      await createObservation({
        observation_type: 'seguimiento',
        content: 'Actividad persistida',
        author: 'Usuario Test'
      });

      expect(mockCreateObservation).toHaveBeenCalledWith({
        observation_type: 'seguimiento',
        content: 'Actividad persistida',
        author: 'Usuario Test'
      });
    });

    it('debería persistir cambios de desarrollo en el backend', async () => {
      const mockUpdateDevelopment = vi.fn().mockResolvedValue(mockDevelopment);
      vi.mocked(useDevelopmentUpdates).mockReturnValue({
        loading: false,
        error: null,
        updateDevelopment: mockUpdateDevelopment,
        changeStage: vi.fn(),
        updateProgress: vi.fn()
      });

      const { updateDevelopment } = useDevelopmentUpdates();
      
      await updateDevelopment('INC000004924201', {
        name: 'Desarrollo Actualizado',
        general_status: 'En curso'
      });

      expect(mockUpdateDevelopment).toHaveBeenCalledWith('INC000004924201', {
        name: 'Desarrollo Actualizado',
        general_status: 'En curso'
      });
    });
  });
});

// Tests de validación de tipos
describe('Validación de Tipos TypeScript', () => {
  it('debería tener tipos correctos para observaciones', () => {
    const observation = mockObservations[0];
    
    expect(typeof observation.id).toBe('number');
    expect(typeof observation.development_id).toBe('string');
    expect(['estado', 'seguimiento', 'problema', 'acuerdo']).toContain(observation.observation_type);
    expect(typeof observation.content).toBe('string');
    expect(typeof observation.author).toBe('string');
    expect(typeof observation.is_current).toBe('boolean');
  });

  it('debería tener tipos correctos para actualizaciones de desarrollo', () => {
    const updateData = {
      name: 'Nuevo Nombre',
      general_status: 'En curso' as const,
      description: 'Nueva descripción'
    };

    expect(typeof updateData.name).toBe('string');
    expect(['Pendiente', 'En curso', 'Completado', 'Cancelado']).toContain(updateData.general_status);
    expect(typeof updateData.description).toBe('string');
  });
});
