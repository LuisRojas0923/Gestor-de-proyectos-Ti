import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdateAvailableBanner } from '../components/molecules/UpdateAvailableBanner';

describe('UpdateAvailableBanner', () => {
  it('muestra mensaje y dispara onReload al pulsar Actualizar ahora', () => {
    const onReload = vi.fn();

    render(<UpdateAvailableBanner onReload={onReload} />);

    expect(screen.getByText(/Hay una nueva versión del portal/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Actualizar ahora/i }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
