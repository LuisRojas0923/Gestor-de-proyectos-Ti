/**
 * Tests unitarios para HdiPreview.tsx
 *
 * Cobertura:
 * - El input acepta solo .xlsx (no .xls)
 * - Archivo > 15MB es rechazado (límite por archivo)
 * - Archivo de 15MB exacto es aceptado (en el límite)
 * - Más de 10 archivos son rechazados
 * - Total > 50MB es rechazado
 * - Estado vacío menciona Excel (.xlsx) y no PDF
 * - Botón Procesar deshabilitado sin archivos
 * - Al rechazar un lote inválido, la selección previa se limpia
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';
import { AppProvider } from '../context/AppContext';

vi.mock('axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { rows: [], summary: {}, warnings_detalle: [] } }),
        post: vi.fn(),
    }
}));

vi.mock('../config/api', () => ({
    API_CONFIG: { BASE_URL: 'http://localhost:8000/api/v2' }
}));

vi.mock('../components/atoms', () => ({
    Title: ({ children, ...p }: { children: React.ReactNode; [key: string]: unknown }) => <h1 {...(p as React.HTMLAttributes<HTMLHeadingElement>)}>{children}</h1>,
    Text: ({ children, as: Tag = 'span', ...p }: { children: React.ReactNode; as?: React.ElementType; [key: string]: unknown }) => {
        const T = Tag as React.ElementType;
        return <T {...(p as React.HTMLAttributes<HTMLElement>)}>{children}</T>;
    },
    Button: ({ children, onClick, disabled, ...p }: { children: React.ReactNode; onClick?: React.MouseEventHandler; disabled?: boolean; [key: string]: unknown }) => (
        <button onClick={onClick} disabled={disabled} {...(p as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
    ),
    Select: ({ label, value, onChange, options }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; options: { value: string; label: string }[] }) => (
        <select aria-label={label} value={value} onChange={onChange}>
            {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    ),
    Input: ({ label, onChange, value, type, ...p }: { label: string; onChange: React.ChangeEventHandler<HTMLInputElement>; value: string; type: string; [key: string]: unknown }) => (
        <input aria-label={label} onChange={onChange} value={value} type={type} {...(p as React.InputHTMLAttributes<HTMLInputElement>)} />
    ),
    Badge: ({ children, ...p }: { children: React.ReactNode; [key: string]: unknown }) => <span {...(p as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>,
}));

vi.mock('../pages/ServicePortal/pages/NOVEDADES_NOMINA/components/SubcategorySummaryCard', () => ({
    default: ({ label }: { label: string }) => <div>{label}</div>
}));

vi.mock('../components/molecules/FilterDropdown', () => ({
    FilterDropdown: () => <div data-testid="filter-dropdown" />
}));

// Helper factories
const makeXlsxFile = (name: string, sizeBytes: number) =>
    new File(
        [new ArrayBuffer(sizeBytes)],
        name,
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );

const makeXlsFile = (name: string) =>
    new File(['contenido'], name, { type: 'application/vnd.ms-excel' });

const MB = 1024 * 1024;

const renderHdiPreview = async () => {
    const { default: HdiPreview } = await import('../pages/ServicePortal/pages/NOVEDADES_NOMINA/HdiPreview');
    return render(
        <MemoryRouter>
            <AppProvider>
                <NotificationsProvider>
                    <HdiPreview />
                </NotificationsProvider>
            </AppProvider>
        </MemoryRouter>
    );
};

describe('HdiPreview — contrato de archivos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('el input de archivos acepta SOLO .xlsx (no .xls)', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        expect(fileInput).toBeInTheDocument();
        expect(fileInput.getAttribute('accept')).toBe('.xlsx');
    });

    it('rechaza archivos > 15MB y no los agrega al estado (botón sigue deshabilitado)', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const oversizedFile = makeXlsxFile('datos_hdi.xlsx', 16 * MB);
        fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).toBeDisabled();
    });

    it('acepta archivos .xlsx justo en el límite de 15MB', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        // Exactamente 15MB — debe ser aceptado
        const borderFile = makeXlsxFile('hdi_15mb.xlsx', 15 * MB);
        fireEvent.change(fileInput, { target: { files: [borderFile] } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).not.toBeDisabled();
    });

    it('acepta archivos .xlsx dentro del límite y habilita el botón Procesar', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const validFile = makeXlsxFile('hdi_julio_2026.xlsx', 5 * MB);
        fireEvent.change(fileInput, { target: { files: [validFile] } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).not.toBeDisabled();
    });

    it('rechaza exactamente 11 archivos (máximo 10)', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const elevenFiles = Array.from({ length: 11 }, (_, i) =>
            makeXlsxFile(`hdi_${i}.xlsx`, 1 * MB)
        );
        fireEvent.change(fileInput, { target: { files: elevenFiles } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).toBeDisabled();
    });

    it('acepta exactamente 10 archivos', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const tenFiles = Array.from({ length: 10 }, (_, i) =>
            makeXlsxFile(`hdi_${i}.xlsx`, 1 * MB)
        );
        fireEvent.change(fileInput, { target: { files: tenFiles } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).not.toBeDisabled();
    });

    it('rechaza lote con total > 50MB aunque cada archivo sea menor a 15MB', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        // 4 archivos × 14MB = 56MB total
        const files = Array.from({ length: 4 }, (_, i) =>
            makeXlsxFile(`hdi_${i}.xlsx`, 14 * MB)
        );
        fireEvent.change(fileInput, { target: { files } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).toBeDisabled();
    });

    it('rechaza archivos .xls (no .xlsx)', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        const xlsFile = makeXlsFile('datos_hdi.xls');
        fireEvent.change(fileInput, { target: { files: [xlsFile] } });

        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).toBeDisabled();
    });

    it('al rechazar un nuevo lote inválido, la selección previa se limpia', async () => {
        await renderHdiPreview();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;

        // Primera selección válida
        const validFile = makeXlsxFile('hdi_valid.xlsx', 1 * MB);
        fireEvent.change(fileInput, { target: { files: [validFile] } });
        const procesarBtn = screen.getByRole('button', { name: /procesar archivos/i });
        expect(procesarBtn).not.toBeDisabled();

        // Segunda selección inválida (> 15MB) — debe limpiar la previa
        const oversizedFile = makeXlsxFile('hdi_big.xlsx', 16 * MB);
        fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
        expect(procesarBtn).toBeDisabled();
    });

    it('el estado vacío menciona archivos Excel (.xlsx) y NO PDF', async () => {
        await renderHdiPreview();
        expect(screen.getByText(/archivos Excel \(\.xlsx\)/i)).toBeInTheDocument();
        expect(screen.queryByText(/archivos PDF/i)).not.toBeInTheDocument();
    });

    it('renderiza el título del módulo SEGUROS HDI', async () => {
        await renderHdiPreview();
        expect(screen.getByText(/SEGUROS HDI/i)).toBeInTheDocument();
    });
});
