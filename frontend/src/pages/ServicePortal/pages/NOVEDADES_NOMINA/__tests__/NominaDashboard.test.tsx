import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
}));

vi.mock('../../../../../hooks/useApi', () => ({
  useApi: () => ({ get: mocks.apiGet }),
}));

import NominaDashboard from '../NominaDashboard';

describe('NominaDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga y muestra el catálogo mediante el cliente autenticado', async () => {
    mocks.apiGet.mockResolvedValue({
      OTROS: ['SEGUROS HDI', 'MEDICINA PREPAGADA'],
    });

    render(
      <MemoryRouter>
        <NominaDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledWith(
      '/novedades-nomina/catalogo',
    ));
    expect(await screen.findByText('OTROS')).toBeInTheDocument();
    expect(screen.getByText('SEGUROS HDI')).toBeInTheDocument();
    expect(screen.getByText('MEDICINA PREPAGADA')).toBeInTheDocument();
  });
});
