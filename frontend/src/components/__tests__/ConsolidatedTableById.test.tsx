import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConsolidatedTableById from '../ConsolidatedTableById';

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

const originalFetch = global.fetch;
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

describe('ConsolidatedTableById', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
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
        })) as unknown as () => DOMRect;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
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

        // Seleccionamos "pendiente" validando que sea accesible
        // Al estar todas marcadas por defecto, hacer clic la DESMARCA
        const pendienteCheckbox = within(dialog).getByRole('checkbox', { name: 'pendiente' });
        fireEvent.click(pendienteCheckbox);

        // Al desmarcar "pendiente", Tarea 2 desaparece. Tarea 1 queda visible.
        expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
        expect(screen.getByText('Tarea 1')).toBeInTheDocument();

        // Ahora limpiamos
        const clearButton = within(dialog).getByText('Limpiar');
        fireEvent.click(clearButton);

        // Debería volver a mostrar Tarea 2
        expect(screen.getByText('Tarea 2')).toBeInTheDocument();
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
    it('cumple con el contrato ARIA (nombres accesibles, autofocus y estado expandido)', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoTrigger = screen.getByRole('button', { name: /Estado/i });
        expect(estadoTrigger).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(estadoTrigger);
        expect(estadoTrigger).toHaveAttribute('aria-expanded', 'true');

        const dialog = await screen.findByRole('dialog', { name: 'Filtrar: Estado' });
        expect(dialog).toBeInTheDocument();

        const closeButton = within(dialog).getByRole('button', { name: 'Cerrar filtro' });
        expect(closeButton).toBeInTheDocument();

        const searchInput = within(dialog).getByRole('textbox', { name: 'Buscar en filtro de Estado' });
        expect(searchInput).toHaveFocus();
    });

    it('restaura el foco al trigger y cierra al hacer clic afuera', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoTrigger = screen.getByRole('button', { name: /Estado/i });
        fireEvent.click(estadoTrigger);

        await screen.findByRole('dialog');

        // Simular clic fuera
        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(estadoTrigger).toHaveAttribute('aria-expanded', 'false');
        // El foco debe volver al trigger
        expect(estadoTrigger).toHaveFocus();
    });

    it('posiciona el popover adaptandose al scroll y viewport movil', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const originalInnerHeight = window.innerHeight;
        const originalInnerWidth = window.innerWidth;
        window.innerHeight = 300;
        window.innerWidth = 260;

        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100,
            height: 40,
            top: 280,
            bottom: 320,
            left: 20,
            right: 120,
        })) as unknown as () => DOMRect;

        fireEvent.click(screen.getByRole('button', { name: /Estado/i }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveStyle({ top: '10px' });
        expect(dialog).toHaveStyle({ width: '240px' });

        window.innerHeight = originalInnerHeight;
        window.innerWidth = originalInnerWidth;
    });

    it('permite seleccion por teclado y filtra Estado vacío', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: /Estado/i }));
        const dialog = await screen.findByRole('dialog');

        const sinEstadoCheckbox = within(dialog).getByRole('checkbox', { name: 'Sin estado' });

        sinEstadoCheckbox.focus();
        expect(sinEstadoCheckbox).toHaveFocus();
        fireEvent.click(sinEstadoCheckbox); // Desmarca "Sin estado"

        // Tarea 3 tiene estado vacio, por lo que desaparece
        expect(screen.queryByText('Tarea 3')).not.toBeInTheDocument();
        expect(screen.getByText('Tarea 1')).toBeInTheDocument();
        expect(screen.getByText('Tarea 2')).toBeInTheDocument();
    });

    it('filtra correctamente por la columna Progreso (Sin progreso 0%)', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: /Progreso/i }));
        const dialog = await screen.findByRole('dialog');

        const sinProgresoCheckbox = within(dialog).getByRole('checkbox', { name: 'Sin progreso (0%)' });
        fireEvent.click(sinProgresoCheckbox); // Desmarca "Sin progreso"

        // Tarea 2 es la unica con 0%, desaparece
        expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
        expect(screen.getByText('Tarea 1')).toBeInTheDocument();
        expect(screen.getByText('Tarea 3')).toBeInTheDocument();
    });
});
