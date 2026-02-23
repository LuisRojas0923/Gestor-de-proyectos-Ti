import React, { useState } from 'react';
import { ArrowLeft, Briefcase, User, GraduationCap, FileText, ChevronRight, Clock, MapPin, Users, Mail, Monitor, DollarSign } from 'lucide-react';
import { Button, Select, Title, Text, Icon, Checkbox, Input } from '../../../components/atoms';
import { FormField, TextAreaField } from './Common';

interface UserData {
    name: string;
    area: string;
    sede: string;
    email: string;
}

interface RequisicionPersonalFormViewProps {
    user: UserData;
    onBack: () => void;
    onSubmit: (data: Record<string, any>) => void;
    isLoading?: boolean;
}

const CIUDADES_CONTRATACION = [
    "AGUACHICA", "ANDALUCÍA", "APARTADÓ", "ARAUCA", "ARMENIA", "ARMERO", "BARRANCABERMEJA", "BARRANQUILLA", "BELLO",
    "BOGOTA D.C.", "BOJACÁ", "BUCARAMANGA", "BUENAVENTURA", "BUGA", "CAICEDONIA", "CAJICÁ", "CALARCA", "CALI",
    "CANDELARIA", "CARTAGO", "CHACHAGUI", "CHAPARRAL", "CHÍA", "CHHINCHINa", "COTA", "CÚCUTA", "DAGUA",
    "DOSQUEBRADAS", "EL CERRITO", "EL PEÑOL", "ENVIGADO", "FACATATIVÁ", "FLORIDA", "FLORIDABLANCA", "FUNZA",
    "GALAPA", "GARZÓN", "GINEBRA", "GIRARDOTA", "GIRÓN", "GUACARÍ", "GUARNE", "ITAGUI", "JAMUNDÍ", "LA CUMBRE",
    "LA DORADA", "LA ESTRELLA", "LA VIRGINIA", "MALAMBO", "MANIZALES", "MARSELLA", "MEDELLÍN", "MOSQUERA", "NEIVA",
    "PALMIRA", "PASTO", "PEREIRA", "PIEDECUESTA", "PUERTO TEJADA", "PUPIALES", "RESTREPO", "RIOFRIO", "RIONEGRO",
    "SABANETA", "SAN JOSÉ DEL GUAVIARE", "SANTA ROSA DE CABAL", "SANTANDER DE QUILICHAO", "SAPUYES", "SEVILLA",
    "SIBATÉ", "SOACHA", "SOLEDAD", "SUAREZ", "SUBACHOQUE", "SUCRE", "TENJO", "TOCANCIPÁ", "TULUÁ", "TUQUERRES",
    "UBATE", "VILLA RICA", "VILLARRICA", "YOTOCO", "YUMBO", "ZIPAQUIRÁ"
].map(ciudad => ({ value: ciudad, label: ciudad }));

const CARGOS_POR_AREA: Record<string, { value: string, label: string }[]> = {
    'ADMINISTRACION': [
        { value: 'analista_contable_junior', label: 'ANALISTA CONTABLE JUNIOR' },
        { value: 'analista_contable_senior', label: 'ANALISTA CONTABLE SENIOR' },
        { value: 'analista_de_control_presupuestal', label: 'ANALISTA DE CONTROL PRESUPUESTAL' },
        { value: 'analista_de_costos', label: 'ANALISTA DE COSTOS' },
        { value: 'analista_de_mejoramiento_continuo', label: 'ANALISTA DE MEJORAMIENTO CONTINUO' },
        { value: 'analista_de_nomina', label: 'ANALISTA DE NÓMINA' },
        { value: 'aprendiz_sg_sst', label: 'APRENDÍZ SG-SST' },
        { value: 'asistente_contable_l', label: 'ASISTENTE CONTABLE L' },
        { value: 'asistente_contable_ll', label: 'ASISTENTE CONTABLE LL' },
        { value: 'asistente_de_comercio_exterior', label: 'ASISTENTE DE COMERCIO EXTERIOR' },
        { value: 'asistente_de_gerencia', label: 'ASISTENTE DE GERENCIA' },
        { value: 'asistente_de_infraestructura_tecnologica', label: 'ASISTENTE DE INFRAESTRUCTURA TECNOLÓGICA' },
        { value: 'aux_servicios_generales_oficinas', label: 'AUX. SERVICIOS GENERALES (OFICINAS)' },
        { value: 'aux_servicios_generales_sucursales', label: 'AUX. SERVICIOS GENERALES (SUCURSALES)' },
        { value: 'auxiliar_contable_l', label: 'AUXILIAR CONTABLE L' },
        { value: 'auxiliar_de_gestion_humana', label: 'AUXILIAR DE GESTION HUMANA' },
        { value: 'auxiliar_de_oficios_varios', label: 'AUXILIAR DE OFICIOS VARIOS' },
        { value: 'auxiliar_de_seguridad', label: 'AUXILIAR DE SEGURIDAD' },
        { value: 'auxiliar_de_tesoreria', label: 'AUXILIAR DE TESORERÍA' },
        { value: 'auxiliar_servicios_generales', label: 'AUXILIAR SERVICIOS GENERALES' },
        { value: 'contador_junior', label: 'CONTADOR JUNIOR' },
        { value: 'coordinador_administrativo_dti', label: 'COORDINADOR ADMINISTRATIVO DTI' },
        { value: 'coordinador_de_comercio_exterior', label: 'COORDINADOR DE COMERCIO EXTERIOR' },
        { value: 'coordinador_de_costos_y_control_presupuestal', label: 'COORDINADOR DE COSTOS Y CONTROL PRESUPUESTAL' },
        { value: 'coordinador_de_garantias', label: 'COORDINADOR DE GARANTIAS' },
        { value: 'coordinador_de_infraestructura_tecnologica', label: 'COORDINADOR DE INFRAESTRUCTURA TECNOLÓGICA' },
        { value: 'coordinador_sgi', label: 'COORDINADOR SGI' },
        { value: 'coordinador_sst', label: 'COORDINADOR SST' },
        { value: 'dibujante_de_ingenieria', label: 'DIBUJANTE DE INGENIERIA' },
        { value: 'director_administrativo', label: 'DIRECTOR ADMINISTRATIVO' },
        { value: 'director_de_contabilidad', label: 'DIRECTOR DE CONTABILIDAD' },
        { value: 'director_de_costos_y_control_presupuestal', label: 'DIRECTOR DE COSTOS Y CONTROL PRESUPUESTAL' },
        { value: 'director_division_de_nh3', label: 'DIRECTOR DIVISIÓN DE NH3' },
        { value: 'director_dti', label: 'DIRECTOR DTI' },
        { value: 'ingeniero_de_aplicacion', label: 'INGENIERO DE APLICACIÓN' },
        { value: 'ingeniero_de_diseno_y_presupuesto_division_de_nh3', label: 'INGENIERO DE DISEÑO Y PRESUPUESTO DIVISIÓN DE NH3' },
        { value: 'ingeniero_de_especialista', label: 'INGENIERO DE ESPECIALISTA' },
        { value: 'ingeniero_de_soporte_de_obra_division_de_nh3', label: 'INGENIERO DE SOPORTE DE OBRA DIVISIÓN DE NH3' },
        { value: 'ingeniero_junior_division_de_nh3', label: 'INGENIERO JUNIOR DIVISIÓN DE NH3' },
        { value: 'ingeniero_junior_de_diseno_division_de_nh3', label: 'INGENIERO JUNIOR DE DISEÑO DIVISIÓN DE NH3' },
        { value: 'ingeniero_junior_de_soporte_electrico_division_de_nh3', label: 'INGENIERO JUNIOR DE SOPORTE ELÉCTRICO DIVISIÓN DE NH3' },
        { value: 'jefe_de_comercio_exterior', label: 'JEFE DE COMERCIO EXTERIOR' },
        { value: 'jefe_de_compras', label: 'JEFE DE COMPRAS' },
        { value: 'jefe_de_control_interno', label: 'JEFE DE CONTROL INTERNO' },
        { value: 'jefe_de_costos', label: 'JEFE DE COSTOS' },
        { value: 'jefe_de_departamento_de_ingenieria', label: 'JEFE DE DEPARTAMENTO DE INGENIERIA' },
        { value: 'jefe_de_departamento_tecnico', label: 'JEFE DE DEPARTAMENTO TÉCNICO' },
        { value: 'jefe_de_gestion_humana', label: 'JEFE DE GESTION HUMANA' },
        { value: 'jefe_de_infraestructura_tecnologica', label: 'JEFE DE INFRAESTRUCTURA TECNOLÓGICA' },
        { value: 'jefe_de_negociaciones_estrategicas', label: 'JEFE DE NEGOCIACIONES ESTRATÉGICAS' },
        { value: 'jefe_de_negociaciones_internacionales', label: 'JEFE DE NEGOCIACIONES INTERNACIONALES' },
        { value: 'jefe_de_seguridad', label: 'JEFE DE SEGURIDAD' },
        { value: 'jefe_de_sgi', label: 'JEFE DE SGI' },
        { value: 'jefe_de_tesoreria', label: 'JEFE DE TESORERÍA' },
        { value: 'jefe_financiero', label: 'JEFE FINANCIERO' },
        { value: 'recepcionista', label: 'RECEPCIONISTA' },
        { value: 'supervisor_de_portafolio_yak', label: 'SUPERVISOR DE PORTAFOLIO YAK' },
        { value: 'supervisor_tecnico', label: 'SUPERVISOR TÉCNICO' },
        { value: 'trainee_de_aplicacion', label: 'TRAINEE DE APLICACIÓN' },
    ],
    'ADN': [
        { value: 'analista_de_cartera_y_facturacion', label: 'ANALISTA DE CARTERA Y FACTURACIÓN' },
        { value: 'auxiliar_administrativo_adn', label: 'AUXILIAR ADMINISTRATIVO ADN' },
        { value: 'ayudante_adn', label: 'AYUDANTE ADN' },
        { value: 'ayudante_de_armado_adn', label: 'AYUDANTE DE ARMADO ADN' },
        { value: 'ayudante_de_refrigeracion_adn', label: 'AYUDANTE DE REFRIGERACIÓN ADN' },
        { value: 'coordinador_administrativo_operaciones_adn', label: 'COORDINADOR ADMINISTRATIVO OPERACIONES ADN' },
        { value: 'coordinador_de_planeacion_adn', label: 'COORDINADOR DE PLANEACIÓN ADN' },
        { value: 'coordinador_logistico_adn', label: 'COORDINADOR LOGÍSTICO ADN' },
        { value: 'coordinador_regional_adn', label: 'COORDINADOR REGIONAL ADN' },
        { value: 'director_regional_adn', label: 'DIRECTOR REGIONAL ADN' },
        { value: 'ingeniero_de_proyectos_y_presupuestos_junior_adn', label: 'INGENIERO DE PROYECTOS Y PRESUPUESTOS JUNIOR ADN' },
        { value: 'ingeniero_de_proyectos_y_presupuestos_senior_adn', label: 'INGENIERO DE PROYECTOS Y PRESUPUESTOS SENIOR ADN' },
        { value: 'ingeniero_de_soporte_tecnico_adn', label: 'INGENIERO DE SOPORTE TÉCNICO ADN' },
        { value: 'ingeniero_de_diseno_y_presupuesto_adn', label: 'INGENIERO DE DISEÑO Y PRESUPUESTO ADN' },
        { value: 'ingeniero_regional_adn', label: 'INGENIERO REGIONAL ADN' },
        { value: 'ingeniero_residente_adn', label: 'INGENIERO RESIDENTE ADN' },
        { value: 'jefe_administrativa_adn', label: 'JEFE ADMINISTRATIVA ADN' },
        { value: 'jefe_nacional_de_operaciones_adn', label: 'JEFE NACIONAL DE OPERACIONES ADN' },
        { value: 'lider_comercial_adn', label: 'LIDER COMERCIAL ADN' },
        { value: 'supervisor_sst_adn', label: 'SUPERVISOR SST ADN' },
        { value: 'supervisor_tecnico_adn', label: 'SUPERVISOR TÉCNICO ADN' },
        { value: 'tecnico_de_armado_adn', label: 'TECNICO DE ARMADO ADN' },
        { value: 'tecnico_de_refrigeracion_adn', label: 'TECNICO DE REFRIGERACIÓN ADN' },
        { value: 'tecnico_electricista_adn', label: 'TÉCNICO ELECTRICISTA ADN' },
    ],
    'COMERCIAL': [
        { value: 'asesor_de_venta_consultiva', label: 'ASESOR DE VENTA CONSULTIVA' },
        { value: 'asistente_administrativa_rce', label: 'ASISTENTE ADMINISTRATIVA RCE' },
        { value: 'asistente_comercial', label: 'ASISTENTE COMERCIAL' },
        { value: 'asistente_de_mercadeo', label: 'ASISTENTE DE MERCADEO' },
        { value: 'dibujante_comercial', label: 'DIBUJANTE COMERCIAL' },
        { value: 'director_comercial_nacional_semi_industrial', label: 'DIRECTOR COMERCIAL NACIONAL SEMI-INDUSTRIAL' },
        { value: 'director_de_negocios_estrategicos', label: 'DIRECTOR DE NEGOCIOS ESTRATÉGICOS' },
        { value: 'ingeniero_de_diseno_y_presupuestos_mjs', label: 'INGENIERO DE DISEÑO Y PRESUPUESTOS (MASTER-JUNIOR-SENIOR)' },
    ],
    'PRODUCCION': [
        { value: 'auxiliar_administrativo_de_produccion', label: 'AUXILIAR ADMINISTRATIVO DE PRODUCCIÓN' },
        { value: 'ayudante_de_produccion', label: 'AYUDANTE DE PRODUCCIÓN' },
        { value: 'ayudante_de_soldadura', label: 'AYUDANTE DE SOLDADURA' },
        { value: 'coordinador_administrativo_de_planta', label: 'COORDINADOR ADMINISTRATIVO DE PLANTA' },
        { value: 'coordinador_de_mantenimientos', label: 'COORDINADOR DE MANTENIMIENTOS' },
        { value: 'coordinador_operativo_de_planta', label: 'COORDINADOR OPERATIVO DE PLANTA' },
        { value: 'director_de_planta', label: 'DIRECTOR DE PLANTA' },
        { value: 'lider_de_unidades_y_eq_especiales', label: 'LÍDER DE UNIDADES Y EQ. ESPECIALES' },
        { value: 'operario_de_aislamiento', label: 'OPERARIO DE AISLAMIENTO' },
        { value: 'operario_de_fontaneria', label: 'OPERARIO DE FONTANERÍA' },
        { value: 'operario_de_mantenimiento', label: 'OPERARIO DE MANTENIMIENTO' },
        { value: 'operario_de_pintura_y_acabados', label: 'OPERARIO DE PINTURA Y ACABADOS' },
        { value: 'operario_de_tableros_electricos', label: 'OPERARIO DE TABLEROS ELÉCTRICOS' },
        { value: 'operario_de_unidades_y_eq_especiales', label: 'OPERARIO DE UNIDADES Y EQ. ESPECIALES' },
        { value: 'planeador_de_produccion', label: 'PLANEADOR DE PRODUCCIÓN' },
        { value: 'siso_de_planta_2', label: 'SISO DE PLANTA 2' },
        { value: 'siso_de_planta', label: 'SISO DE PLANTA' },
        { value: 'soldador', label: 'SOLDADOR' },
        { value: 'supervisor_de_planta', label: 'SUPERVISOR DE PLANTA' },
    ],
    'PROYECTOS': [
        { value: 'coordinador_gestion_procura', label: 'COORDINADOR GESTIÓN PROCURA' },
        { value: 'director_de_proyectos', label: 'DIRECTOR DE PROYECTOS' },
        { value: 'scrum_master', label: 'SCRUM MASTER' },
        { value: 'ingeniero_de_proyectos_civiles', label: 'INGENIERO DE PROYECTOS CIVILES' },
    ],
    'LOGISTICA': [
        { value: 'analista_administrativo_logistico', label: 'ANALISTA ADMINISTRATIVO LOGÍSTICO' },
        { value: 'auxiliar_de_almacen_l', label: 'AUXILIAR DE ALMACEN L' },
        { value: 'auxiliar_de_almacen_ll', label: 'AUXILIAR DE ALMACEN LL' },
        { value: 'auxiliar_de_almacen_lll', label: 'AUXILIAR DE ALMACEN LLL' },
        { value: 'conductor_mensajero', label: 'CONDUCTOR-MENSAJERO' },
        { value: 'coordinador_administrativo_logistico', label: 'COORDINADOR ADMINISTRATIVO LOGÍSTICO' },
        { value: 'coordinador_de_suministros_y_despachos', label: 'COORDINADOR DE SUMINISTROS Y DESPACHOS' },
        { value: 'coordinador_operativo_almacen', label: 'COORDINADOR OPERATIVO ALMACEN' },
        { value: 'lider_de_almacen', label: 'LIDER DE ALMACEN' },
        { value: 'lider_de_despachos', label: 'LIDER DE DESPACHOS' },
        { value: 'lider_de_suministros', label: 'LIDER DE SUMINISTROS' },
    ],
    'OPERACIONES': [
        { value: 'asistente_de_operaciones', label: 'ASISTENTE DE OPERACIONES' },
        { value: 'ayudante_calificado', label: 'AYUDANTE CALIFICADO' },
        { value: 'ayudante_de_aislamiento', label: 'AYUDANTE DE AISLAMIENTO' },
        { value: 'ayudante_de_armado', label: 'AYUDANTE DE ARMADO' },
        { value: 'ayudante_de_soldadura', label: 'AYUDANTE DE SOLDADURA' },
        { value: 'ayudante_electrico', label: 'AYUDANTE ELÉCTRICO' },
        { value: 'coordinador_de_obra', label: 'COORDINADOR DE OBRA' },
        { value: 'director_de_operaciones', label: 'DIRECTOR DE OPERACIONES' },
        { value: 'ingeniero_regional', label: 'INGENIERO REGIONAL' },
        { value: 'ingeniero_residente', label: 'INGENIERO RESIDENTE' },
        { value: 'jefe_tecnico_de_aislamiento_termico', label: 'JEFE TÉCNICO DE AISLAMIENTO TÉRMICO' },
        { value: 'jefe_tecnico_de_refrigeracion', label: 'JEFE TÉCNICO DE REFRIGERACIÓN' },
        { value: 'operario_de_soldadura', label: 'OPERARIO DE SOLDADURA' },
        { value: 'pailero', label: 'PAILERO' },
        { value: 'supervisor_siso_proyectos', label: 'SUPERVISOR SISO PROYECTOS' },
        { value: 'tecnico_de_aislamiento_termico', label: 'TECNICO DE AISLAMIENTO TÉRMICO' },
        { value: 'tecnico_electricista', label: 'TECNICO ELECTRICISTA' },
        { value: 'tecnico_de_refrigeracion_linea', label: 'TECNICO DE REFRIGERACIÓN LÍNEA' },
        { value: 'tubero', label: 'TUBERO' },
    ],
    'YAK': [
        { value: 'asesor_comercial_yak', label: 'ASESOR COMERCIAL YAK' },
        { value: 'director_uen', label: 'DIRECTOR U.E.N' },
        { value: 'ingeniero_proyectos_yak', label: 'INGENIERO DE PROYECTOS YAK' },
        { value: 'ingeniero_diseno_y_presupuesto_junior', label: 'INGENIERO DISEÑO Y PRESUPUESTO JUNIOR' },
        { value: 'ingeniero_diseno_y_presupuesto_senior', label: 'INGENIERO DISEÑO Y PRESUPUESTO SENIOR' },
        { value: 'ingeniero_diseno_y_presupuesto_yak', label: 'INGENIERO DISEÑO Y PRESUPUESTO YAK' },
    ],
};

const RequisicionPersonalFormView: React.FC<RequisicionPersonalFormViewProps> = ({ user, onBack, onSubmit, isLoading = false }) => {
    const [areaDestino, setAreaDestino] = useState<string>('');
    const [necesitaEquipos, setNecesitaEquipos] = useState<string>('no');
    const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
    const [necesitaTecnologia, setNecesitaTecnologia] = useState<string>('no');
    const [tecnologiaSeleccionada, setTecnologiaSeleccionada] = useState<string[]>([]);
    const [necesitaSimCard, setNecesitaSimCard] = useState<string>('no');
    const [tipoPlan, setTipoPlan] = useState<string>('');
    const [necesitaProgramas, setNecesitaProgramas] = useState<string>('no');
    const [salario, setSalario] = useState<string>('');
    const [auxilioMovilizacion, setAuxilioMovilizacion] = useState<string>('');
    const [auxilioAlimentacion, setAuxilioAlimentacion] = useState<string>('');
    const [auxilioVivienda, setAuxilioVivienda] = useState<string>('');

    const formatCurrency = (value: string) => {
        const numericValue = value.replace(/\D/g, '');
        if (!numericValue) return '';
        return new Intl.NumberFormat('de-DE').format(parseInt(numericValue, 10));
    };

    const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
        const formattedValue = formatCurrency(value);
        setter(formattedValue);
    };

    const handleSalarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleCurrencyChange(e.target.value, setSalario);
    };

    const handleEquipoToggle = (equipo: string) => {
        setEquiposSeleccionados((prev: string[]) =>
            prev.includes(equipo)
                ? prev.filter((e: string) => e !== equipo)
                : [...prev, equipo]
        );
    };

    const handleTecnologiaToggle = (item: string) => {
        setTecnologiaSeleccionada((prev: string[]) =>
            prev.includes(item)
                ? prev.filter((i: string) => i !== item)
                : [...prev, item]
        );
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        // Asegurar campos que podrían faltar si están disabled/readOnly
        data.solicitante_nombre = user.name;
        data.solicitante_area = user.area;
        data.solicitante_sede = user.sede;
        // solicitante_email ya es editable y debería estar en FormData

        // Agregar equipos seleccionados si aplica
        data.equipos_detalle = necesitaEquipos === 'si' ? equiposSeleccionados.join(', ') : null;

        // Agregar tecnología seleccionada si aplica
        data.tecnologia_detalle = necesitaTecnologia === 'si' ? tecnologiaSeleccionada.join(', ') : null;

        // Agregar SIM Card y Plan si aplica
        data.sim_card_plan = necesitaSimCard === 'si' ? tipoPlan : null;

        // Limpiar puntos del salario y auxilios para almacenamiento numérico y convertir a entero
        const currencyFields = ['salario_asignado', 'auxilio_movilizacion', 'auxilio_alimentacion', 'auxilio_vivienda'];
        currencyFields.forEach(field => {
            if (data[field] && data[field].toString().trim() !== '') {
                data[field] = parseInt(data[field].toString().replace(/\./g, ''), 10);
            } else {
                data[field] = null;
            }
        });

        // Asegurar que numero_personas sea entero
        if (data.numero_personas) {
            data.numero_personas = parseInt(data.numero_personas.toString(), 10) || 1;
        }

        // id_creador (cedula)
        data.id_creador = parseInt(user.cedula || user.id, 10) || null;

        onSubmit(data);
    };

    const cargosDisponibles = areaDestino ? CARGOS_POR_AREA[areaDestino] || [] : [];

    return (
        <div className="space-y-8 py-4">
            <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold p-0"> Volver al Dashboard </Button>

            <div className="bg-[var(--color-surface)] rounded-[2.5rem] shadow-xl border border-[var(--color-border)] overflow-hidden transition-colors duration-300">
                <div className="bg-[var(--deep-navy)] p-8 text-white flex items-center justify-between">
                    <div>
                        <Text variant="caption" color="inherit" className="text-[var(--powder-blue)] font-bold uppercase tracking-widest mb-1">Nueva Requisición</Text>
                        <Title variant="h3" weight="bold" color="white">Requisición de Personal</Title>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md h-24 w-24 flex items-center justify-center">
                        <Users size={48} className="text-white" />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-10">
                    {/* Sección 1: Información del Solicitante */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={User} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Información del Solicitante</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FormField label="Nombre del Solicitante" name="solicitante_nombre" defaultValue={user.name} icon={User} readOnly />
                            <FormField label="Área del Solicitante" name="solicitante_area" defaultValue={user.area} icon={Briefcase} readOnly />
                            <FormField label="Sede" name="solicitante_sede" defaultValue={user.sede} icon={MapPin} readOnly />
                            <FormField label="Correo Electrónico" name="solicitante_email" defaultValue={user.email} icon={Mail} isRequired />
                        </div>
                    </div>

                    {/* Sección 2: INFORMACION DE LA ORDEN */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={FileText} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">INFORMACION DE LA ORDEN</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="Ciudad de contratacion"
                                name="ciudad_contratacion"
                                required
                                options={CIUDADES_CONTRATACION}
                            />
                            <FormField label="OT (Orden de trabajo)" name="orden_trabajo" placeholder="Ingrese OT o N/A" icon={FileText} isRequired />
                            <FormField label="NOMBRE OBRA / PROYECTO" name="nombre_proyecto" placeholder="Nombre completo del proyecto" icon={Briefcase} isRequired />
                            <FormField label="DIRECCIÓN DE OBRA O PROYECTO" name="direccion_proyecto" placeholder="Dirección física" icon={MapPin} isRequired />
                            <FormField label="ENCARGADO EN SITIO" name="encargado_sitio" placeholder="Nombre del responsable en sitio" icon={User} isRequired />
                        </div>
                    </div>

                    {/* Sección 3: Información de la Vacante */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={Briefcase} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Información de la Vacante</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="AREA DESTINO"
                                name="area_destino"
                                required
                                value={areaDestino}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAreaDestino(e.target.value)}
                                options={[
                                    { value: 'ADMINISTRACION', label: 'ADMINISTRACIÓN' },
                                    { value: 'ADN', label: 'ADN' },
                                    { value: 'COMERCIAL', label: 'COMERCIAL' },
                                    { value: 'LOGISTICA', label: 'LOGÍSTICA' },
                                    { value: 'OPERACIONES', label: 'OPERACIONES' },
                                    { value: 'PRODUCCION', label: 'PRODUCCIÓN' },
                                    { value: 'PROYECTOS', label: 'PROYECTOS' },
                                    { value: 'YAK', label: 'YAK' },
                                ]}
                            />
                            <Select
                                label="Nombre del Cargo"
                                name="cargo_nombre"
                                required
                                options={cargosDisponibles}
                                placeholder={areaDestino ? "Seleccione un cargo" : "Primero seleccione Área Destino"}
                                disabled={!areaDestino}
                            />
                            <FormField label="NÚMERO DE PERSONAS REQUERIDAS" name="numero_personas" type="number" defaultValue="1" icon={Users} isRequired />
                            <Select
                                label="TSA (Trabajo Seguro en Alturas)"
                                name="trabajo_alturas"
                                required
                                options={[
                                    { value: 'aplica', label: 'APLICA' },
                                    { value: 'no_aplica', label: 'NO APLICA' },
                                ]}
                            />
                            <Select
                                label="DURACIÓN OBRA O CONTRATO"
                                name="duracion_contrato"
                                required
                                options={[
                                    { value: 'menos_2_meses', label: 'Menos de 2 meses' },
                                    { value: '2_meses_o_mas', label: '2 meses o más' },
                                ]}
                            />
                            <FormField label="FECHA PROBABLE INGRESO" name="fecha_ingreso" type="date" icon={Clock} isRequired />
                            <FormField label="CENTRO DE COSTO" name="centro_costo" placeholder="Ej: 102030" icon={FileText} isRequired />
                        </div>
                    </div>

                    {/* Sección 4: Perfil */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={GraduationCap} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Perfil del Cargo</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <Select
                                label="CAUSAL DE REQUISICION"
                                name="causal_requisicion"
                                required
                                options={[
                                    { value: 'creacion_cargo', label: 'CREACION DE UN NUEVO CARGO' },
                                    { value: 'incremento_obra_labor', label: 'INCREMENTO OBRA/LABOR' },
                                    { value: 'reemplazo_incapacidad_arl', label: 'REEMPLAZO POR INCAPACIDAD ARL' },
                                    { value: 'reemplazo_retiro_voluntario', label: 'REEMPLAZO POR RETIRO VOLUNTARIO' },
                                    { value: 'reemplazo_maternidad', label: 'REEMPLAZO POR MATERNIDAD' },
                                    { value: 'reemplazo_incapacidades_eps', label: 'REEMPLAZO POR INCAPACIDADES EPS' },
                                    { value: 'terminacion_contrato', label: 'TERMINACION DEL CONTRATO' },
                                    { value: 'reemplazo_vacaciones', label: 'REEMPLAZO POR VACACIONES' },
                                    { value: 'otro', label: 'OTRO' },
                                ]}
                            />
                            <TextAreaField
                                label="PERFIL 'O' (Características adicionales)"
                                name="perfil_o"
                                placeholder="Describa características adicionales al perfil del cargo..."
                                isRequired
                            />
                        </div>
                    </div>

                    {/* Sección 5: Requisitos Generales */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={FileText} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Requisitos Generales</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="¿NECESITA EQUIPOS DE OFICINA?"
                                name="equipos_oficina"
                                required
                                value={necesitaEquipos}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNecesitaEquipos(e.target.value)}
                                options={[
                                    { value: 'si', label: 'SI' },
                                    { value: 'no', label: 'NO' },
                                ]}
                            />
                        </div>

                        {necesitaEquipos === 'si' && (
                            <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-inner space-y-6">
                                <div className="flex items-center space-x-3 text-[var(--color-primary)]">
                                    <Icon name={Briefcase} size="sm" />
                                    <Text weight="bold" variant="body1">Equipos Requeridos de Oficina</Text>
                                </div>

                                <Text variant="body2" color="text-secondary" className="mb-4">
                                    Por favor seleccione cuáles equipos de oficina requiere el nuevo colaborador:
                                </Text>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {['ESCRITORIO', 'LOCKER', 'SILLA', 'ARCHIVADOR', 'MODULO/OFICINA'].map((item) => (
                                        <div
                                            key={item}
                                            onClick={() => handleEquipoToggle(item)}
                                            className={`
                                                flex items-center space-x-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none
                                                ${equiposSeleccionados.includes(item)
                                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 shadow-sm'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'
                                                }
`}
                                        >
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                                <Checkbox
                                                    checked={equiposSeleccionados.includes(item)}
                                                    onChange={() => { }} // Handled by parent div
                                                    className="pointer-events-none"
                                                />
                                            </div>
                                            <Text
                                                variant="body2"
                                                weight="medium"
                                                className={`transition-colors ${equiposSeleccionados.includes(item) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'} `}
                                            >
                                                {item}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <Select
                                label="¿NECESITA EQUIPOS TECNOLÓGICOS?"
                                name="equipos_tecnologicos"
                                required
                                value={necesitaTecnologia}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNecesitaTecnologia(e.target.value)}
                                options={[
                                    { value: 'si', label: 'SI' },
                                    { value: 'no', label: 'NO' },
                                ]}
                            />
                        </div>

                        {necesitaTecnologia === 'si' && (
                            <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-inner space-y-6">
                                <div className="flex items-center space-x-3 text-[var(--color-primary)]">
                                    <Icon name={Monitor} size="sm" />
                                    <Text weight="bold" variant="body1">Equipos Tecnológicos Requeridos</Text>
                                </div>

                                <Text variant="body2" color="text-secondary" className="mb-4">
                                    Por favor seleccione cuáles equipos tecnológicos requiere el nuevo colaborador:
                                </Text>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        'EQUIPO DE CÓMPUTO DESKTOP',
                                        'EQUIPO DE CÓMPUTO PORTÁTIL',
                                        'CORREO CORPORATIVO',
                                        'USUARIO DE RED',
                                        'EXT: PANTALLA, MOUSE, TECLADO'
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            onClick={() => handleTecnologiaToggle(item)}
                                            className={`
                                                flex items-center space-x-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none
                                                ${tecnologiaSeleccionada.includes(item)
                                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 shadow-sm'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'
                                                }
                                            `}
                                        >
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                                <Checkbox
                                                    checked={tecnologiaSeleccionada.includes(item)}
                                                    onChange={() => { }} // Handled by parent div
                                                    className="pointer-events-none"
                                                />
                                            </div>
                                            <Text
                                                variant="body2"
                                                weight="medium"
                                                className={`transition-colors ${tecnologiaSeleccionada.includes(item) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}
                                            >
                                                {item}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--color-border)]/30">
                            <Select
                                label="¿REQUIERE SIM CARD?"
                                name="sim_card_requerida"
                                required
                                value={necesitaSimCard}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNecesitaSimCard(e.target.value)}
                                options={[
                                    { value: 'si', label: 'SI' },
                                    { value: 'no', label: 'NO' },
                                ]}
                            />

                            {necesitaSimCard === 'si' && (
                                <Select
                                    label="SELECCIONE EL TIPO DE PLAN NECESITADO"
                                    name="sim_card_plan"
                                    required
                                    value={tipoPlan}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTipoPlan(e.target.value)}
                                    options={[
                                        { value: 'PLAN BASICO', label: 'PLAN BASICO' },
                                        { value: 'PLAN MEDIO', label: 'PLAN MEDIO' },
                                        { value: 'PLAN ALTO', label: 'PLAN ALTO' },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="pt-6 border-t border-[var(--color-border)]/30 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label="¿REQUIERE PROGRAMAS ESPECIALES?"
                                    name="programas_especiales_requeridos"
                                    required
                                    value={necesitaProgramas}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNecesitaProgramas(e.target.value)}
                                    options={[
                                        { value: 'si', label: 'SI' },
                                        { value: 'no', label: 'NO' },
                                    ]}
                                />
                            </div>

                            {necesitaProgramas === 'si' && (
                                <TextAreaField
                                    label="INDIQUE QUÉ PROGRAMAS ESPECIALES REQUIERE"
                                    name="programas_especiales_detalle"
                                    placeholder="Ej: AutoCAD, Revit, Adobe Creative Cloud, etc..."
                                    isRequired
                                />
                            )}
                        </div>
                    </div>

                    {/* Sección 6: Condiciones de Contratación */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                            <Icon name={DollarSign} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Condiciones de Contratación</Title>
                            <div className="flex-grow border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="SALARIO ASIGNADO"
                                name="salario_asignado"
                                placeholder="Ingrese el valor mensual"
                                icon={DollarSign}
                                required
                                value={salario}
                                onChange={handleSalarioChange}
                            />
                            <Select
                                label="HORAS EXTRA"
                                name="horas_extra"
                                required
                                options={[
                                    { value: 'si', label: 'SI' },
                                    { value: 'no', label: 'NO' },
                                ]}
                            />
                            <Select
                                label="MODALIDAD DE CONTRATACION"
                                name="modalidad_contratacion"
                                required
                                options={[
                                    { value: 'directo_refridcol', label: 'DIRECTO POR REFRIDCOL' },
                                    { value: 'agencia_temporal', label: 'AGENCIA TEMPORAL' },
                                    { value: 'aprendiz_sena', label: 'APRENDIZ CONVENIO SENA' },
                                ]}
                            />
                            <Select
                                label="TIPO DE CONTRATACION"
                                name="tipo_contratacion"
                                required
                                options={[
                                    { value: 'fijo_inferior_1_anio', label: 'CONTRATO FIJO INFERIOR A 1 AÑO' },
                                    { value: 'obra_labor', label: 'CONTRATO OBRA LABOR' },
                                    { value: 'indefinido', label: 'CONTRATO INDEFINIDO' },
                                ]}
                            />
                        </div>

                        <div className="pt-6 border-t border-[var(--color-border)]/30 space-y-6">
                            <div>
                                <Title variant="h6" className="font-bold text-[var(--color-primary)] uppercase tracking-wider">Auxilios No Constitutivos de Salario</Title>
                                <Text variant="caption" color="text-secondary" className="mt-1">En caso de que no tenga este auxilio dejar el campo vacío</Text>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input
                                    label="AUXILIO DE MOVILIZACIÓN"
                                    name="auxilio_movilizacion"
                                    placeholder="Valor mensual"
                                    icon={DollarSign}
                                    value={auxilioMovilizacion}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCurrencyChange(e.target.value, setAuxilioMovilizacion)}
                                />
                                <Input
                                    label="AUXILIO DE ALIMENTACIÓN"
                                    name="auxilio_alimentacion"
                                    placeholder="Valor mensual"
                                    icon={DollarSign}
                                    value={auxilioAlimentacion}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCurrencyChange(e.target.value, setAuxilioAlimentacion)}
                                />
                                <Input
                                    label="AUXILIO DE VIVIENDA"
                                    name="auxilio_vivienda"
                                    placeholder="Valor mensual"
                                    icon={DollarSign}
                                    value={auxilioVivienda}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCurrencyChange(e.target.value, setAuxilioVivienda)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[var(--color-border)] flex justify-end space-x-4">
                        <Button type="button" variant="ghost" onClick={onBack}> Cancelar </Button>
                        <Button type="submit" disabled={isLoading} variant="primary" size="lg" icon={ChevronRight} iconPosition="right">
                            {isLoading ? 'Enviando...' : 'Enviar Requisición'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequisicionPersonalFormView;
