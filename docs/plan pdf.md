# Refinamiento: Reporte de Gastos y PDF (v2)

Este plan detalla los ajustes técnicos y funcionales para el reporte de gastos, integrando lógica condicional para centros de costo, restricciones de visualización y detalles específicos en la generación del PDF.

## User Review Required

IMPORTANT

* **Lógica CC/SCC** : Si se ingresa una  **OT** , se deben usar los Centros de Costo y Subcentros asociados a dicha OT. Si la OT se deja  **vacía** , se permitirá el ingreso manual de CC (4 dígitos) y SCC (2 dígitos).
* **Visibilidad PDF** : El botón "DESCARGAR PDF" aparecerá **exclusivamente** cuando el reporte esté en estado `INICIAL`.
* **Detalles del PDF** : Se incluirán subtotales (Valor con Factura y Valor sin Factura) y un espacio para la firma de verificación al final del documento.

## Proposed Changes

---

### [Lógica de Edición y UI]

#### [MODIFY]

ExpenseLegalization.tsx

* Implementar `isReadOnly` basado en el estado (bloquear si es diferente a `BORRADOR` o `INICIAL`).
* Condicionar la aparición del botón "DESCARGAR PDF" al estado `INICIAL`.

#### [MODIFY]

ExpenseLineItem.tsx &

ExpenseMobileCard.tsx

* Modificar componentes de CC y SCC para que sean condicionales:
  * Con OT: Mantener comportamiento actual (Select o sugerencias vinculadas).
  * Sin OT: Renderizar `Input` manual con validación de longitud (4 para CC, 2 para SCC).
* Asegurar que `isReadOnly` bloquee todas las interacciones.

---

### [Generación de PDF]

#### [NEW]

generateExpenseReportPDF.ts

* Basado en

  generateAccountStatementPDF.ts pero con los siguientes ajustes:

  * **Cabecera** : Logo Refridcol, Título "REPORTE DE GASTOS DE VIÁTICOS", y tabla de control (Código FT-GFA-20, Fecha, Versión 05).
  * **Cuerpo** : Columnas de Fecha, Descripción, OT/OS, CC, SubCentro, Valor Total Factura, Valor Sin Factura.
  * **Totales** : Fila final con la suma total de "Valor Total Factura" y "Valor Sin Factura".
  * **Firmas** : Espacio en la parte inferior para "Firma de Verificación".
  * **Marca de agua** : "ERP" en la esquina inferior.

## Verification Plan

### Automated Tests

* Verificar que al vaciar el campo OT, los campos CC/SCC se conviertan en inputs manuales editables.

### Manual Verification

* Validar que el botón PDF solo sea visible en estado `INICIAL`.
* Generar el PDF y verificar que los subtotales coincidan con los datos ingresados.
* Confirmar que en estados como `APROBADO`, no se pueda modificar ninguna línea de gasto.
