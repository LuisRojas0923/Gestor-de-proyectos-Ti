export interface PortalUserRouteData {
    id?: string;
    cedula?: string;
    name?: string;
    email?: string;
    emailVerified?: boolean;
    email_needs_update?: boolean;
    emailNeedsUpdate?: boolean;
    permissions?: string[];
    role?: string;
    rol?: string;
    viaticante?: boolean;
    [key: string]: unknown;
}

export interface ReporteResumen {
    reporte_id: string | number;
    estado?: string;
    readonly?: boolean;
    [key: string]: unknown;
}

export interface ReporteDetalle {
    id?: string | number;
    categoria?: string;
    fecharealgasto?: string;
    fecha_gasto?: string;
    fecha?: string;
    ot?: string;
    centrocosto?: string;
    cc?: string;
    subcentrocosto?: string;
    scc?: string;
    valorconfactura?: string | number;
    valor_con_factura?: string | number;
    valorsinfactura?: string | number;
    valor_sin_factura?: string | number;
    observaciones?: string;
    observaciones_linea?: string;
    observaciones_gral?: string;
    adjuntos?: string | unknown[];
}
