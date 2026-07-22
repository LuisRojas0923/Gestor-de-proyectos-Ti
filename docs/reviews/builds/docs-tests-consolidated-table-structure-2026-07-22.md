# Revisión docs/tests — estructura semántica de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx` y la estructura DOM observable de `ConsolidatedTableById`  
**Modo:** revisión estática read-only  
**Resultado:** `blocked`

## Evaluación

La suite actual tiene 14 pruebas y cubre filtros, foco, teclado, estados ARIA y responsive, pero no protege la estructura semántica de la tabla. No existe una aserción sobre seis `columnheader`, `scope="col"` ni el número de celdas por fila.

Además, el componente observado no cumple todavía el contrato solicitado:

- Los seis `th` no declaran `scope="col"` (`ConsolidatedTableById.tsx:230-273`).
- Cada fila de datos renderiza una celda adicional para la franja visual (`ConsolidatedTableById.tsx:281-283`), por lo que el DOM expone siete celdas en vez de seis.

## Prueba mínima propuesta

Agregar un único caso a `ConsolidatedTableById.test.tsx`:

```tsx
it('mantiene la semántica de seis columnas sin celda para la franja', async () => {
    render(<ConsolidatedTableById desarrolloId="HO-1" />);

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader');

    expect(headers).toHaveLength(6);
    headers.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col');
    });

    const tbody = table.querySelector('tbody');
    expect(tbody).not.toBeNull();

    const rows = within(tbody as HTMLElement).getAllByRole('row');
    expect(rows).toHaveLength(mockData.actividades.length);
    rows.forEach((row) => {
        expect(within(row).getAllByRole('cell')).toHaveLength(6);
    });
});
```

La aserción de seis celdas detecta la franja implementada como un `td` adicional: el test fallará con siete celdas. La franja debe conservarse mediante CSS sobre la fila (pseudo-elemento, borde o fondo), no mediante otra celda. El caso no debe afirmar clases visuales frágiles; si se exige verificar también la presencia visual, debe existir un contrato CSS estable separado.

## Evidencia y documentación

- No se ejecutó Vitest: el encargo es read-only y este subagente no puede ejecutar comandos npm/build.
- Comando requerido por el orquestador: `cd frontend && npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`.
- No aplican `docs/ESQUEMA_BASE_DATOS.md`, ADR ni RBAC: el alcance es exclusivamente semántica frontend. La suite ya figura en `testing/CATALOGO_PRUEBAS.md`.

## Bloqueos

1. Falta la prueba mínima de estructura semántica.
2. El DOM actual carece de `scope="col"` y expone siete celdas por fila debido a la franja adicional.
