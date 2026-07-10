import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeleteActivityModal } from './DeleteActivityModal';

describe('DeleteActivityModal', () => {
    it('presenta la acción como anulación lógica', () => {
        render(
            <DeleteActivityModal
                isOpen
                preview={{
                    actividad: { id: 1, titulo: 'Actividad prueba', estado: 'Pendiente' },
                    hijos: [],
                    total_eliminaciones: 1,
                }}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />
        );

        expect(screen.getByText('Anular actividad')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Anular \(1\)/i })).toBeInTheDocument();
        expect(screen.queryByText('Eliminar actividad')).not.toBeInTheDocument();
    });
});
