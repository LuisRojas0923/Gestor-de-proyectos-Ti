import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConsolidatedTableById from '../ConsolidatedTableById';

const mockData = {
    id: "HO-1",
    nombre: "Proyecto Prueba",
    fecha_inicio: "2024-01-01",
    fecha_fin: "2024-12-31",
    estado: "activo",
    actividades: [
        { id: 1, titulo: "Tarea 1", estado: "en_progreso", porcentaje_avance: 50 },
        { id: 2, titulo: "Tarea 2", estado: "pendiente", porcentaje_avance: 0 },
        { id: 3, titulo: "Tarea 3", estado: "", porcentaje_avance: 100 },
    ]
};

const singleOptionData = {
    ...mockData,
    actividades: mockData.actividades.map((actividad) => ({
        ...actividad,
        estado: 'pendiente',
    })),
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

    it('mantiene seis columnas sin celda adicional para la franja', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);

        const table = await screen.findByRole('table');
        const headers = within(table).getAllByRole('columnheader');

        expect(headers).toHaveLength(6);
        headers.forEach((header) => {
            expect(header).toHaveAttribute('scope', 'col');
        });

        const tbody = table.querySelector('tbody') as HTMLElement;
        const rows = within(tbody).getAllByRole('row');

        rows.forEach((row) => {
            expect(within(row).getAllByRole('cell')).toHaveLength(6);
        });
        expect(within(rows[0]).getAllByRole('cell')[0]).toHaveClass('border-l-[6px]');
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
        expect(pendienteCheckbox).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(pendienteCheckbox);

        await waitFor(() => {
            expect(pendienteCheckbox).toHaveAttribute('aria-checked', 'false');
        });

        // Al desmarcar "pendiente", Tarea 2 desaparece. Tarea 1 queda visible.
        expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
        expect(screen.getByText('Tarea 1')).toBeInTheDocument();

        // Ahora limpiamos
        const clearButton = within(dialog).getByText('Limpiar');
        fireEvent.click(clearButton);

        // Debería volver a mostrar Tarea 2
        expect(screen.getByText('Tarea 2')).toBeInTheDocument();
    });

    it('representa ninguno al desmarcar todas las opciones y permite reactivarlas', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoTrigger = screen.getByRole('button', { name: /Estado/i });
        fireEvent.click(estadoTrigger);
        const dialog = await screen.findByRole('dialog');

        for (const option of ['en_progreso', 'pendiente', 'Sin estado']) {
            fireEvent.click(within(dialog).getByRole('checkbox', { name: option }));
        }

        await waitFor(() => {
            expect(screen.queryByText('Tarea 1')).not.toBeInTheDocument();
            expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
            expect(screen.queryByText('Tarea 3')).not.toBeInTheDocument();
            expect(within(dialog).getAllByRole('checkbox').every((checkbox) =>
                checkbox.getAttribute('aria-checked') === 'false'
            )).toBe(true);
            expect(estadoTrigger.querySelector('.bg-yellow-400')).toBeInTheDocument();
        });

        const pendienteCheckbox = within(dialog).getByRole('checkbox', { name: 'pendiente' });
        fireEvent.click(pendienteCheckbox);

        await waitFor(() => {
            expect(screen.getByText('Tarea 2')).toBeInTheDocument();
            expect(screen.queryByText('Tarea 1')).not.toBeInTheDocument();
            expect(pendienteCheckbox).toHaveAttribute('aria-checked', 'true');
        });
    });

    it('permite desmarcar y volver a marcar una columna con una sola opción', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => singleOptionData,
        });

        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        fireEvent.click(screen.getByRole('button', { name: /Estado/i }));
        const dialog = await screen.findByRole('dialog');
        const onlyOption = within(dialog).getByRole('checkbox', { name: 'pendiente' });

        fireEvent.click(onlyOption);

        await waitFor(() => {
            expect(screen.queryByText('Tarea 1')).not.toBeInTheDocument();
            expect(onlyOption).toHaveAttribute('aria-checked', 'false');
        });

        fireEvent.click(onlyOption);

        await waitFor(() => {
            expect(screen.getByText('Tarea 1')).toBeInTheDocument();
            expect(onlyOption).toHaveAttribute('aria-checked', 'true');
        });
    });

    it('normaliza Todo y Limpiar al estado canonico de todas las opciones', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoTrigger = screen.getByRole('button', { name: /Estado/i });
        fireEvent.click(estadoTrigger);
        const dialog = await screen.findByRole('dialog');
        const pendienteCheckbox = within(dialog).getByRole('checkbox', { name: 'pendiente' });

        fireEvent.click(pendienteCheckbox);
        await waitFor(() => {
            expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
            expect(estadoTrigger.querySelector('.bg-yellow-400')).toBeInTheDocument();
        });

        fireEvent.click(within(dialog).getByText('Todo'));
        await waitFor(() => {
            expect(screen.getByText('Tarea 2')).toBeInTheDocument();
            expect(within(dialog).getAllByRole('checkbox').every((checkbox) =>
                checkbox.getAttribute('aria-checked') === 'true'
            )).toBe(true);
            expect(estadoTrigger.querySelector('.bg-yellow-400')).not.toBeInTheDocument();
        });

        fireEvent.click(pendienteCheckbox);
        await waitFor(() => expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument());

        fireEvent.click(within(dialog).getByText('Limpiar'));
        await waitFor(() => {
            expect(screen.getByText('Tarea 2')).toBeInTheDocument();
            expect(within(dialog).getAllByRole('checkbox').every((checkbox) =>
                checkbox.getAttribute('aria-checked') === 'true'
            )).toBe(true);
            expect(estadoTrigger.querySelector('.bg-yellow-400')).not.toBeInTheDocument();
        });
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
        const originalInnerHeight = window.innerHeight;
        const originalInnerWidth = window.innerWidth;
        const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
        const originalVisualViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
        const visualViewport = {
            offsetTop: 0,
            offsetLeft: 0,
            width: 260,
            height: 300,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
        let currentAnchorRect = {
            width: 100,
            height: 40,
            top: 280,
            bottom: 320,
            left: 20,
            right: 120,
        };
        let unmount: (() => void) | undefined;

        const assertWithinViewport = (dialog: HTMLElement) => {
            const top = Number.parseFloat(dialog.style.top);
            const left = Number.parseFloat(dialog.style.left);
            const width = Number.parseFloat(dialog.style.width);
            const maxHeight = Math.min(350, visualViewport.height - 20);

            expect(top).toBeGreaterThanOrEqual(visualViewport.offsetTop + 10);
            expect(top + maxHeight).toBeLessThanOrEqual(visualViewport.offsetTop + visualViewport.height - 10);
            expect(left).toBeGreaterThanOrEqual(visualViewport.offsetLeft + 10);
            expect(left + width).toBeLessThanOrEqual(visualViewport.offsetLeft + visualViewport.width - 10);
        };

        const getViewportHandler = (eventName: 'resize' | 'scroll') => {
            const listener = visualViewport.addEventListener.mock.calls.find(([event]) => event === eventName)?.[1];
            expect(listener).toEqual(expect.any(Function));
            return listener as EventListener;
        };

        try {
            Object.defineProperty(window, 'visualViewport', {
                configurable: true,
                value: visualViewport as unknown as VisualViewport,
            });
            window.innerHeight = 300;
            window.innerWidth = 260;

            ({ unmount } = render(<ConsolidatedTableById desarrolloId="HO-1" />));
            await screen.findByText('Tarea 1');

            Element.prototype.getBoundingClientRect = vi.fn(() => currentAnchorRect) as unknown as () => DOMRect;

            fireEvent.click(screen.getByRole('button', { name: /Estado/i }));

            const dialog = await screen.findByRole('dialog');
            await waitFor(() => {
                expect(dialog).toHaveStyle({
                    top: '10px',
                    left: '10px',
                    width: '240px',
                    maxHeight: '280px',
                });
                assertWithinViewport(dialog);
            });

            const resizeHandler = getViewportHandler('resize');
            const scrollHandler = getViewportHandler('scroll');
            currentAnchorRect = {
                ...currentAnchorRect,
                top: 40,
                bottom: 80,
                left: 100,
                right: 200,
            };
            visualViewport.width = 400;
            visualViewport.height = 400;

            act(() => {
                fireEvent(window, new Event('resize'));
                fireEvent(window, new Event('scroll'));
                resizeHandler(new Event('resize'));
                scrollHandler(new Event('scroll'));
            });

            await waitFor(() => {
                expect(dialog).toHaveStyle({ top: '40px', left: '100px', width: '250px', maxHeight: '350px' });
                assertWithinViewport(dialog);
            });

            unmount();
            expect(visualViewport.removeEventListener).toHaveBeenCalledWith('resize', resizeHandler);
            expect(visualViewport.removeEventListener).toHaveBeenCalledWith('scroll', scrollHandler);
        } finally {
            unmount?.();
            Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
            window.innerHeight = originalInnerHeight;
            window.innerWidth = originalInnerWidth;
            if (originalVisualViewportDescriptor) {
                Object.defineProperty(window, 'visualViewport', originalVisualViewportDescriptor);
            } else {
                delete (window as unknown as { visualViewport?: VisualViewport }).visualViewport;
            }
        }
    });

    it('permite seleccion por teclado y filtra Estado vacío', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoTrigger = screen.getByRole('button', { name: /Estado/i });
        estadoTrigger.focus();
        fireEvent.keyDown(estadoTrigger, { key: 'Enter', code: 'Enter' });
        const dialog = await screen.findByRole('dialog');
        expect(estadoTrigger).toHaveAttribute('aria-expanded', 'true');
        const searchInput = within(dialog).getByRole('textbox', { name: 'Buscar en filtro de Estado' });
        expect(searchInput).toHaveFocus();

        const sinEstadoCheckbox = within(dialog).getByRole('checkbox', { name: 'Sin estado' });

        sinEstadoCheckbox.focus();
        expect(sinEstadoCheckbox).toHaveFocus();
        fireEvent.keyDown(sinEstadoCheckbox, { key: ' ', code: 'Space' });
        fireEvent.keyUp(sinEstadoCheckbox, { key: ' ', code: 'Space' });

        await waitFor(() => {
            expect(sinEstadoCheckbox).toHaveAttribute('aria-checked', 'false');
            // Tarea 3 tiene estado vacío, por lo que desaparece.
            expect(screen.queryByText('Tarea 3')).not.toBeInTheDocument();
            expect(screen.getByText('Tarea 1')).toBeInTheDocument();
            expect(screen.getByText('Tarea 2')).toBeInTheDocument();
        });

        fireEvent.keyDown(sinEstadoCheckbox, { key: 'Enter', code: 'Enter' });
        fireEvent.keyUp(sinEstadoCheckbox, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(sinEstadoCheckbox).toHaveAttribute('aria-checked', 'true');
            expect(screen.getByText('Tarea 3')).toBeInTheDocument();
        });
    });

    it('abre el filtro con Espacio sin doble activacion', async () => {
        render(<ConsolidatedTableById desarrolloId="HO-1" />);
        await screen.findByText('Tarea 1');

        const estadoTrigger = screen.getByRole('button', { name: /Estado/i });
        estadoTrigger.focus();
        fireEvent.keyDown(estadoTrigger, { key: ' ', code: 'Space' });
        fireEvent.keyUp(estadoTrigger, { key: ' ', code: 'Space' });

        expect(estadoTrigger).toHaveAttribute('aria-expanded', 'true');
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('textbox', { name: 'Buscar en filtro de Estado' })).toHaveFocus();
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
