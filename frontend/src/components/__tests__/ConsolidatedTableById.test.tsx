import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConsolidatedTableById from '../ConsolidatedTableById';
import { API_CONFIG } from '../../config/api';

const mockData = {
    id: "HO-1",
    titulo: "Proyecto Prueba",
    fecha_inicio: "2024-01-01",
    fecha_fin: "2024-12-31",
    estado: "activo",
    actividades: [
        { id: 1, titulo: "Tarea 1", estado: "en_progreso", porcentaje_avance: 50 },
        { id: 2, titulo: "Tarea 2", estado: "pendiente", porcentaje_avance: 0 },
        { id: 3, titulo: "Tarea 3", estado: "", porcentaje_avance: 100 },
    ]
};

global.fetch = vi.fn();

describe('ConsolidatedTableById', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockData
        });
        
        // Mock getBoundingClientRect for the popover positioning
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100,
            height: 100,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
        })) as any;
    });

    it('no abre filtro en columnas no filtrables', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1'); // Wait for fetch
        
        // La columna "Tarea" no debe tener un botón (es decir, no debe ser clickeable para filtrar)
        // El texto "Tarea" se renderiza, pero verifiquemos que no abre popover
        const tareaHeader = screen.getByText('Tarea');
        fireEvent.click(tareaHeader);
        
        // "Filtrar: Tarea" no debe existir
        expect(screen.queryByText('Filtrar: Tarea')).not.toBeInTheDocument();
    });

    it('abre filtro de Estado y muestra estados normalizados', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoHeader = screen.getByText('Estado');
        fireEvent.click(estadoHeader);

        // Esperar a que abra el popover de Estado
        expect(await screen.findByText('Filtrar: Estado')).toBeInTheDocument();

        // Debe contener los 3 valores únicos: "en_progreso", "pendiente", "Sin estado"
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('en_progreso')).toBeInTheDocument();
        expect(within(dialog).getByText('pendiente')).toBeInTheDocument();
        expect(within(dialog).getByText('Sin estado')).toBeInTheDocument();
    });

    it('permite buscar dentro del popover', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByText('Estado'));
        
        const dialog = await screen.findByRole('dialog');
        const searchInput = within(dialog).getByPlaceholderText('Buscar...');
        
        fireEvent.change(searchInput, { target: { value: 'Sin' } });
        
        expect(within(dialog).getByText('Sin estado')).toBeInTheDocument();
        expect(within(dialog).queryByText('en_progreso')).not.toBeInTheDocument();
    });

    it('filtra la tabla al seleccionar un estado y permite limpiar', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByText('Estado'));
        const dialog = await screen.findByRole('dialog');
        
        // Seleccionamos "pendiente"
        // Wait, Label text might not be directly queryable if Checkbox isn't perfectly linked, 
        // let's click the text 'pendiente' since the label wraps the text
        const pendienteText = within(dialog).getByText('pendiente');
        fireEvent.click(pendienteText);

        // Tarea 2 debe estar (es la pendiente), Tarea 1 no
        expect(screen.getByText('Tarea 2')).toBeInTheDocument();
        expect(screen.queryByText('Tarea 1')).not.toBeInTheDocument();

        // Ahora limpiamos
        const clearButton = within(dialog).getByText('Limpiar');
        fireEvent.click(clearButton);

        // Debería volver a mostrar Tarea 1
        expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    });

    it('abre filtro de Progreso y normaliza valores', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByText('Progreso'));
        const dialog = await screen.findByRole('dialog');

        // Valores esperados por los porcentajes 50, 0, 100
        expect(within(dialog).getByText('26-50%')).toBeInTheDocument();
        expect(within(dialog).getByText('Sin progreso (0%)')).toBeInTheDocument();
        expect(within(dialog).getByText('Completado (100%)')).toBeInTheDocument();
    });

    it('cierra el popover al presionar Escape', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByText('Estado'));
        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
});
