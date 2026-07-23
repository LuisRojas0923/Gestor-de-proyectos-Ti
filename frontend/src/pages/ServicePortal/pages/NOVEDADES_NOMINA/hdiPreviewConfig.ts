export interface HdiRow {
    cedula: string;
    nombre_asociado: string;
    empresa: string;
    valor: number;
    valor_rdc?: number;
    valor_colaborador?: number;
    concepto: string;
    estado_erp?: string;
    estado_validacion?: string;
    observaciones?: string;
}

export interface WarningDetalle {
    cedula: string;
    nombre: string;
    motivo: string;
}

export interface HdiResponse {
    rows: HdiRow[];
    summary: {
        total_asociados: number;
        total_filas: number;
        total_valor: number;
        archivos_procesados?: number;
        total_warnings?: number;
        mes: number;
        anio: number;
    };
    warnings: string[];
    warnings_detalle: WarningDetalle[];
}

export const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
});
