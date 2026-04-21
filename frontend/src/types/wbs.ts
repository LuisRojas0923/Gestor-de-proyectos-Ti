export interface WbsActivityBase {
    titulo: string;
    descripcion?: string;
    estado: 'Pendiente' | 'En Progreso' | 'Bloqueado' | 'Completada';
    responsable_id?: string;
    fecha_inicio_estimada?: string;
    fecha_fin_estimada?: string;
    horas_estimadas: number;
    porcentaje_avance: number;
    seguimiento?: string;
    compromiso?: string;
    archivo_url?: string;
}

export interface WbsActivity extends WbsActivityBase {
    id: number;
    desarrollo_id: string;
    parent_id?: number;
    fecha_inicio_real?: string;
    fecha_fin_real?: string;
    horas_reales: number;
    creado_en: string;
    actualizado_en?: string;
    nombre_plantilla?: string; // Solo usado para plantillas
}

export interface WbsActivityTree extends WbsActivity {
    subactividades: WbsActivityTree[];
}

export interface WbsActivityCreate extends WbsActivityBase {
    desarrollo_id: string;
    parent_id?: number;
}

export interface WbsActivityUpdate extends Partial<WbsActivityBase> {
    fecha_inicio_real?: string;
    fecha_fin_real?: string;
    horas_reales?: number;
    parent_id?: number;
}
