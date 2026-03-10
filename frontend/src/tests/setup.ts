import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extender los matchers de vitest para incluir jest-dom
expect.extend(matchers);

// Limpiar después de cada test
afterEach(() => {
    cleanup();
});
