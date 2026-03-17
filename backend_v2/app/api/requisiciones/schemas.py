from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, computed_field

class RequisicionBase(BaseModel):
    solicitante_nombre: str
    solicitante_area: str
    solicitante_sede: str
    solicitante_email: str
    ciudad_contratacion: str
    orden_trabajo: str
    nombre_proyecto: str
    direccion_proyecto: str
    encargado_sitio: str
    area_destino: str
    cargo_nombre: str
    numero_personas: int = 1
    trabajo_alturas: str
    duracion_contrato: str
    fecha_ingreso: date
    centro_costo: str
    causal_requisicion: str
    perfil_o: str
    equipos_oficina: str
    equipos_detalle: Optional[str] = None
    equipos_tecnologicos: str
    tecnologia_detalle: Optional[str] = None
    sim_card_requerida: str
    sim_card_plan: Optional[str] = None
    programas_especiales_requeridos: str
    programas_especiales_detalle: Optional[str] = None
    salario_asignado: int
    horas_extra: str
    modalidad_contratacion: str
    tipo_contratacion: str
    auxilio_movilizacion: Optional[int] = None
    auxilio_alimentacion: Optional[int] = None
    auxilio_vivienda: Optional[int] = None
    unidad_negocio: Optional[str] = None
    fecha_recibo_gh: Optional[date] = None
    estado_rp: Optional[str] = "EN PROCESO"
    
    # Control de Temporales Centralizado
    mejora: Optional[float] = 0.0
    fecha_env_temporal: Optional[date] = None
    
    # Control SUMMAR
    fecha_rec_gh_summar: Optional[date] = None
    mejora_summar: Optional[int] = 0
    fecha_env_summar: Optional[date] = None
    
    # Control MULTIEMPLEOS
    fecha_rec_gh_multi: Optional[date] = None
    mejora_multi: Optional[int] = 0
    fecha_env_multi: Optional[date] = None
    
    # Control DIRECTO
    fecha_rec_gh_directo: Optional[date] = None
    mejora_directo: Optional[int] = 0
    fecha_env_directo: Optional[date] = None

    # Métricas Detalladas por Agencia
    # SUMMAR
    fecha_envio_hv_summar: Optional[date] = None
    na_summar: Optional[int] = 0
    a_summar: Optional[int] = 0
    cancel_tiempo_summar: Optional[int] = 0
    cancel_referido_summar: Optional[int] = 0
    cancel_mov_summar: Optional[int] = 0
    nc_exp_summar: Optional[int] = 0
    nc_em_summar: Optional[int] = 0
    nc_entrev_summar: Optional[int] = 0
    nc_antcd_summar: Optional[int] = 0
    nc_vial_summar: Optional[int] = 0
    salario_final_summar: Optional[int] = 0
    tiempo_summar: Optional[int] = 0
    tipo_contrato_summar: Optional[str] = None
    tema_personal_summar: Optional[int] = 0
    no_asistio_entrev_summar: Optional[int] = 0
    contratado_summar: Optional[int] = 0
    obs_summar: Optional[str] = None

    # MULTIEMPLEOS
    fecha_envio_hv_multi: Optional[date] = None
    na_multi: Optional[int] = 0
    a_multi: Optional[int] = 0
    cancel_tiempo_multi: Optional[int] = 0
    cancel_referido_multi: Optional[int] = 0
    cancel_mov_multi: Optional[int] = 0
    nc_exp_multi: Optional[int] = 0
    nc_em_multi: Optional[int] = 0
    nc_entrev_multi: Optional[int] = 0
    nc_antcd_multi: Optional[int] = 0
    nc_vial_multi: Optional[int] = 0
    salario_final_multi: Optional[int] = 0
    tiempo_multi: Optional[int] = 0
    tipo_contrato_multi: Optional[str] = None
    tema_personal_multi: Optional[int] = 0
    no_asistio_entrev_multi: Optional[int] = 0
    contratado_multi: Optional[int] = 0
    obs_multi: Optional[str] = None

    # DIRECTO
    fecha_envio_hv_directo: Optional[date] = None
    na_directo: Optional[int] = 0
    a_directo: Optional[int] = 0
    cancel_tiempo_directo: Optional[int] = 0
    cancel_referido_directo: Optional[int] = 0
    cancel_mov_directo: Optional[int] = 0
    nc_exp_directo: Optional[int] = 0
    nc_em_directo: Optional[int] = 0
    nc_entrev_directo: Optional[int] = 0
    nc_antcd_directo: Optional[int] = 0
    nc_vial_directo: Optional[int] = 0
    salario_final_directo: Optional[int] = 0
    tiempo_directo: Optional[int] = 0
    tipo_contrato_directo: Optional[str] = None
    tema_personal_directo: Optional[int] = 0
    no_asistio_entrev_directo: Optional[int] = 0
    contratado_directo: Optional[int] = 0
    obs_directo: Optional[str] = None

class RequisicionAgenciaDetalleBase(BaseModel):
    agencia: str
    fecha_envio_hv: Optional[date] = None
    na: int = 0
    a: int = 0
    cancel_tiempo: int = 0
    cancel_referido: int = 0
    cancel_mov: int = 0
    nc_exp: int = 0
    nc_em: int = 0
    nc_entrev: int = 0
    nc_antcd: int = 0
    nc_vial: int = 0
    salario_final: int = 0
    tiempo: int = 0
    tipo_contrato: Optional[str] = None
    tema_personal: int = 0
    no_asistio_entrev: int = 0
    contratado: int = 0
    obs: Optional[str] = None

class RequisicionAgenciaDetalleCreate(RequisicionAgenciaDetalleBase):
    pass

class RequisicionAgenciaDetalleUpdate(BaseModel):
    id: Optional[int] = None # Si tiene ID, se actualiza; si no, se crea
    agencia: Optional[str] = None
    fecha_envio_hv: Optional[date] = None
    na: Optional[int] = None
    a: Optional[int] = None
    cancel_tiempo: Optional[int] = None
    cancel_referido: Optional[int] = None
    cancel_mov: Optional[int] = None
    nc_exp: Optional[int] = None
    nc_em: Optional[int] = None
    nc_entrev: Optional[int] = None
    nc_antcd: Optional[int] = None
    nc_vial: Optional[int] = None
    salario_final: Optional[int] = None
    tiempo: Optional[int] = None
    tipo_contrato: Optional[str] = None
    tema_personal: Optional[int] = None
    no_asistio_entrev: Optional[int] = None
    contratado: Optional[int] = None
    obs: Optional[str] = None

class RequisicionAgenciaDetalleRead(RequisicionAgenciaDetalleBase):
    id: int
    requisicion_id: str
    model_config = ConfigDict(from_attributes=True)

class RequisicionCrear(RequisicionBase):
    pass

class RequisicionRevisionJefe(BaseModel):
    aprobado: bool
    comentario: Optional[str] = None

class RequisicionRevisionGH(BaseModel):
    aprobado: bool
    comentario: Optional[str] = None

class RequisicionPublica(RequisicionBase):
    id: str
    estado: str
    fecha_creacion: datetime
    id_creador: Optional[str] = None
    
    id_jefe_aprobador: Optional[str] = None
    nombre_jefe_aprobador: Optional[str] = None
    fecha_revision_jefe: Optional[datetime] = None
    comentario_revision_jefe: Optional[str] = None
    
    id_gh_aprobador: Optional[str] = None
    nombre_gh_aprobador: Optional[str] = None
    fecha_revision_gh: Optional[datetime] = None
    comentario_revision_gh: Optional[str] = None
    
    detalles_agencias: List[RequisicionAgenciaDetalleRead] = []
    
    model_config = ConfigDict(from_attributes=True)
