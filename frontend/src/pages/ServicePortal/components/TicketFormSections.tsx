import React from 'react';
import { Database, FileText, Search, Clock } from 'lucide-react';
import { FormField, TextAreaField } from '../Common';
import { Select, Title, Text, Icon } from '../../../components/atoms';

interface Category {
    id: string;
    name: string;
    form_type: 'support' | 'development' | 'asset' | 'change_control';
    section: 'soporte' | 'mejoramiento';
}

// --- SECCIÓN SOPORTE / MEJORAMIENTO ---
export const SupportSection: React.FC<{ category: Category }> = ({ category }) => (
    <div className="space-y-6">
        {category.section === 'soporte' ? (
            <>
                <Select
                    label="¿Cuál es la situación que se presenta?"
                    name="situacion_presentada"
                    required
                    options={[
                        { value: 'Funcionalidad Específica', label: 'Necesito ayuda con una funcionalidad específica' },
                        { value: 'Error Sistema', label: 'El sistema no responde como esperaba' },
                        { value: 'Asistencia Tarea', label: 'Requiero asistencia para completar una tarea' },
                    ]}
                />
                <TextAreaField label="Descripción Detallada del Problema o Solicitud" name="descripcion_detallada" placeholder="Sea lo más específico posible..." rows={4} isRequired />
                <TextAreaField label="Impacto de la Situación: ¿Qué áreas o procesos afecta?" name="impacto_procesos" placeholder="Describa el impacto en la operación..." rows={2} />
            </>
        ) : (
            <div className="space-y-8 bg-[var(--color-primary)]/5 p-6 rounded-3xl border border-[var(--color-primary)]/10">
                <Title variant="h5" className="text-[var(--color-primary)] font-bold">Detalles de Mejoramiento</Title>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                        label="¿Existe actualmente alguna herramienta similar?"
                        name="existe_herramienta_similar"
                        options={[{ value: 'SI', label: 'Sí Existe' }, { value: 'NO', label: 'No Existe' }]}
                    />
                    <FormField label="Si existe, ¿cómo se llama y para qué se usa?" name="nombre_herramienta_actual" />
                </div>
                <TextAreaField label="¿Cuál es la necesidad específica que desea resolver?" name="necesidad_especifica" rows={2} isRequired />
                <TextAreaField label="¿Por qué considera necesaria esta implementación?" name="justificacion_necesidad" rows={2} isRequired />
                <TextAreaField label="¿Cómo planea utilizar esta herramienta en sus actividades diarias?" name="plan_uso" rows={2} isRequired />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                        label="Frecuencia de Uso"
                        name="frecuencia_uso"
                        options={[
                            { value: 'Diariamente', label: 'Diariamente' },
                            { value: 'Semanalmente', label: 'Semanalmente' },
                            { value: 'Mensualmente', label: 'Mensualmente' },
                            { value: 'Puntual', label: 'Puntual / Ocasional' },
                        ]}
                    />
                    <FormField label="Responsable principal de utilizar la herramienta" name="responsable_uso" placeholder="Nombre y Cargo" isRequired />
                </div>
            </div>
        )}
    </div>
);

// --- SECCIÓN DESARROLLO ---
export const DevelopmentSection: React.FC<{ userArea: string, userName: string }> = ({ userArea, userName }) => (
    <div className="space-y-8 bg-[var(--color-surface-variant)]/30 p-8 rounded-3xl border border-[var(--color-border)]">
        <div className="space-y-4">
            <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">1. Identificación del Proceso</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre del Proceso" name="nombre_proceso" placeholder="Ej: Gestión de Activos" />
                <FormField label="Área Solicitante" name="area_solicitante" defaultValue={userArea} />
                <FormField label="Usuario Líder" name="lider_requerimiento" defaultValue={userName} />
            </div>
        </div>
        <div className="space-y-4">
            <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">2. Diagnóstico Actual</Title>
            <Select label="¿Existe actualmente una herramienta en Excel para este proceso?" name="existe_herramienta" options={[{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }]} />
            <FormField label="Referencia de archivos (Ruta compartida o nombre)" name="ruta_archivos" placeholder="Ej: \\SERVIDOR-TI\compartido\archivo.xlsx" />
            <TextAreaField label="Limitaciones: ¿Qué funcionalidades faltan o qué errores se buscan solucionar?" name="limitaciones_actuales" placeholder="Describa los problemas actuales..." rows={3} />
        </div>
        <div className="space-y-4">
            <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">3. Dinámica (Entrada)</Title>
            <TextAreaField label="¿Cuál es la acción o condición que da inicio al proceso en el sistema?" name="evento_iniciador" placeholder="Evento iniciador..." rows={2} />
            <TextAreaField label="Liste los datos mínimos necesarios para crear un registro (Campos Obligatorios)" name="campos_obligatorios" placeholder="Lista de campos..." rows={3} />
            <TextAreaField label="¿Qué debe validar el sistema antes de permitir el ingreso del dato?" name="validaciones_seguridad" placeholder="Validaciones de seguridad..." rows={2} />
        </div>
        <div className="space-y-4">
            <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">4. Flujo de Trabajo (Workflow)</Title>
            <TextAreaField label="Defina la secuencia de estados (Ciclo de Vida)" name="ciclo_vida" placeholder="Ej: Registrado -> Aprobado -> Cerrado" rows={2} />
            <TextAreaField label="¿Quién tiene la facultad de mover el registro de un estado a otro? (Actores)" name="actores_permisos" placeholder="Roles y permisos..." rows={3} />
            <TextAreaField label="Si el flujo no puede continuar, ¿hacia qué estado regresa? (Rechazos)" name="gestion_rechazos" placeholder="Lógica de devolución..." rows={2} />
        </div>
        <div className="space-y-4">
            <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">5. Reglas de Negocio</Title>
            <TextAreaField label="Describa los cálculos automáticos requeridos" name="calculos_automaticos" placeholder="Fórmulas (usar referencias de Excel)..." rows={3} />
            <TextAreaField label="¿Bajo qué condiciones el sistema debe bloquear una acción? (Restricciones)" name="reglas_restriccion" placeholder="Reglas de bloqueo..." rows={2} />
            <TextAreaField label="Defina qué datos deben quedar protegidos/inmutables tras avanzar etapas" name="inmutabilidad" placeholder="Campos no editables..." rows={2} />
        </div>
        <div className="space-y-4">
            <Title variant="h5" className="text-[var(--color-primary)] border-b pb-2">6. Integración y Salida</Title>
            <TextAreaField label="¿Qué otros procesos del sistema deben actualizarse automáticamente?" name="impacto_modulos" placeholder="Impacto en otros módulos..." rows={2} />
            <TextAreaField label="¿El sistema debe generar algún PDF, ticket o alerta por correo?" name="notificaciones_docs" placeholder="Documentos y notificaciones..." rows={2} />
            <TextAreaField label="¿Qué información consolidada necesita extraer? (Reportabilidad y KPIs)" name="reportabilidad" placeholder="Métricas esperadas..." rows={3} />
        </div>
    </div>
);

// --- SECCIÓN CONTROL DE CAMBIOS ---
export const ChangeControlSection: React.FC<{
    modules: any[],
    components: any[],
    selectedModuleId: string,
    setSelectedModuleId: (id: string) => void,
    handleImpactChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}> = ({ modules, components, selectedModuleId, setSelectedModuleId, handleImpactChange }) => (
    <div className="space-y-8 bg-emerald-50/30 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800">
        <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
                <Icon name={Database} size="sm" className="text-emerald-500" />
                <Title variant="h5" className="text-emerald-600 dark:text-emerald-400">1. Origen del Cambio</Title>
            </div>
            <Select
                label="Modulo a Modificar"
                name="modulo_solid_id"
                required
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                options={[{ value: '', label: '-- Seleccione un modulo --' }, ...modules.map(m => ({ value: m.id, label: m.nombre }))]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Componente"
                    name="componente_solid_id"
                    required
                    options={[{ value: '', label: '-- Seleccione un componente --' }, ...components.map(c => ({ value: c.id, label: c.nombre }))]}
                />
                <Select
                    label="Acción Requerida"
                    name="accion_requerida"
                    required
                    options={[
                        { value: 'Corregir Error', label: 'Corregir Error' },
                        { value: 'Agregar Funcionalidad', label: 'Nueva Funcionalidad' },
                        { value: 'Modificar Existente', label: 'Modificar Existente' },
                        { value: 'Eliminar Campo', label: 'Eliminar Campo / Lógica' }
                    ]}
                />
            </div>
        </div>
        <div className="space-y-4 border-t border-emerald-100 dark:border-emerald-800 pt-4">
            <div className="flex items-center space-x-3 mb-2">
                <Icon name={FileText} size="sm" className="text-emerald-500" />
                <Title variant="h5" className="text-emerald-600 dark:text-emerald-400">2. Detalle de la Solicitud</Title>
            </div>
            <FormField label="Título del Ajuste" name="asunto" placeholder="Ej: Agregar NIT en Informe de Gastos" isRequired icon={Search} />
            <TextAreaField label="Descripción del Cambio" name="descripcion_cambio" placeholder="Describa qué se debe cambiar a nivel técnico o funcional..." rows={3} isRequired />
            <TextAreaField label="Justificación de Negocio" name="justificacion_cambio" placeholder="¿Por qué es necesario este cambio? ¿Qué impacto genera si no se hace?" rows={2} isRequired />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 border-t border-emerald-100 dark:border-emerald-800 pt-4">
            <Select
                label="Impacto Operativo"
                name="impacto_operativo"
                defaultValue="Medio"
                onChange={handleImpactChange}
                options={[
                    { value: 'Bajo', label: 'Bajo (Estético / Informativo)' },
                    { value: 'Medio', label: 'Medio (Funcionalidad importante)' },
                    { value: 'Alto', label: 'Alto (Bloqueante / Error crítico)' }
                ]}
            />
        </div>
    </div>
);

// --- SECCIÓN ACTIVOS / COMPRAS ---
export const AssetSection: React.FC<{ categoryId: string }> = ({ categoryId }) => (
    <div className="space-y-8 bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-200 dark:border-amber-800">
        <Title variant="h5" className="text-amber-700 dark:text-amber-400 font-bold">Información de Compra / Activo</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categoryId === 'compra_licencias' ? (
                <TextAreaField label="Especificaciones de la Licencia" name="especificaciones" placeholder="Detalles de la licencia requerida..." rows={2} isRequired />
            ) : (
                <Select
                    label="Hardware Solicitado"
                    name="hardware_solicitado"
                    required
                    options={[
                        { value: 'MOUSE', label: 'MOUSE' }, { value: 'TECLADO', label: 'TECLADO' }, { value: 'MEMORIA USB', label: 'MEMORIA USB' },
                        { value: 'MEMORIA RAM', label: 'MEMORIA RAM' }, { value: 'DISCO DURO', label: 'DISCO DURO' }, { value: 'BASE PORTÁTIL', label: 'BASE PORTÁTIL' },
                        { value: 'CABLE HDMI', label: 'CABLE HDMI' }, { value: 'ADAPTADOR VGA', label: 'ADAPTADOR VGA' }, { value: 'CABLE DE RED', label: 'CABLE DE RED' },
                        { value: 'ADAPTADOR DE RED', label: 'ADAPTADOR DE RED' }, { value: 'MONITOR', label: 'MONITOR' }, { value: 'PAD MOUSE', label: 'PAD MOUSE' },
                        { value: 'IMPRESORA', label: 'IMPRESORA' }, { value: 'ESCÁNER', label: 'ESCÁNER' }, { value: 'PROYECTOR', label: 'PROYECTOR' },
                        { value: 'UPS', label: 'UPS (SISTEMA DE ALIMENTACIÓN)' }, { value: 'CÁMARA WEBCAM', label: 'CÁMARA WEBCAM' }, { value: 'SPEAKERS', label: 'SPEAKERS (ALTAVOCES)' },
                        { value: 'MICRÓFONO', label: 'MICRÓFONO' }, { value: 'CABLES ALIMENTACIÓN', label: 'CABLES DE ALIMENTACIÓN' }, { value: 'OTROS', label: 'OTROS (Especificar en descripción)' },
                    ]}
                />
            )}
            <FormField label="Cantidad" name="cantidad" type="number" defaultValue="1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            <Select
                label="Director que autorizó la compra"
                name="director_autoriza"
                required
                options={[
                    { value: 'Director Operaciones', label: 'Director de Operaciones Administrativas' },
                    { value: 'Director Amoniaco', label: 'Director de División de Amoniaco' },
                    { value: 'Director Proyectos', label: 'Director de Proyectos Administrativas' },
                    { value: 'Directora Contabilidad', label: 'Directora de Contabilidad' },
                    { value: 'Director Mercadeo', label: 'Director de Mercadeo' },
                    { value: 'Otros', label: 'Otros...' },
                ]}
            />
            <Select
                label="Gerencia vinculada"
                name="gerencia_vinculada"
                required
                options={[
                    { value: 'Gerente General', label: 'Gerencia General' },
                    { value: 'Gerente Administrativo', label: 'Gerente Administrativa y Financiera' },
                    { value: 'Gerente Comercial', label: 'Gerente Comercial' },
                    { value: 'Gerente Produccion', label: 'Gerente de Producción' },
                ]}
            />
        </div>
        <Text variant="caption" className="text-amber-600 block italic">Recuerde adjuntar el documento de autorización firmado al final de este formulario.</Text>
    </div>
);
