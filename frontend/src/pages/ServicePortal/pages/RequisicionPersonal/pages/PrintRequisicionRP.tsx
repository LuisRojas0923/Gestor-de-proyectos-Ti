import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { getDetalleRequisicion } from '../services/requisicionService';
import type { RequisicionRP } from '../types/requisicion.types';
import logo from '../../../../../assets/images/logos/logo.png';

const PrintRequisicionRP: React.FC = () => {
  const { id } = useParams();
  const [req, setReq] = useState<RequisicionRP | null>(null);
  const [loading, setLoading] = useState(true);
  const printTriggered = useRef(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDetalleRequisicion(Number(id))
      .then(data => {
        setReq(data);
        if (!printTriggered.current) {
          printTriggered.current = true;
          setTimeout(() => {
            window.print();
          }, 500); // Dar un poco de tiempo para renderizar
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center font-mono">Preparando documento para impresión...</div>;
  }

  if (!req) {
    return <div className="p-10 text-center text-red-500 font-mono">No se pudo cargar la requisición.</div>;
  }

  const formatCOP = (val: number | null | undefined | string) => {
    if (val === null || val === undefined) return 'N/A';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return 'N/A';
    return `$${num.toLocaleString('de-DE')}`;
  };

  const formatDateCO = (dateStr: string | null | undefined, includeTime = true) => {
    if (!dateStr) return '';
    let safeDateStr = dateStr;
    // Si viene de Postgres sin zona horaria, lo forzamos a UTC agregando 'Z'
    if (safeDateStr.includes('T') && !safeDateStr.endsWith('Z') && !safeDateStr.includes('+') && !safeDateStr.match(/-\d{2}:\d{2}$/)) {
      safeDateStr += 'Z';
    }
    const d = new Date(safeDateStr);
    if (isNaN(d.getTime())) return '';
    return includeTime ? d.toLocaleString('es-CO') : d.toLocaleDateString('es-CO');
  };

  const totalIngresos = (Number(req.salario_asignado) || 0) + 
                        (Number(req.auxilio_movilizacion) || 0) + 
                        (Number(req.auxilio_alimentacion) || 0) + 
                        (Number(req.auxilio_vivienda) || 0);

  const printContent = (
    <div className="bg-white min-h-screen text-black print-wrapper">
      <style>
        {`
          @media print {
            @page {
              size: letter;
              margin-top: 5mm;
              margin-bottom: 5mm;
              margin-left: 5mm;
              margin-right: 5mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Ocultar el root principal para quitar la navbar y todo el layout */
            body > *:not(.print-wrapper) {
              display: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      
      {/* Botón flotante para re-imprimir si el usuario canceló el diálogo */}
      <div className="fixed top-4 right-4 no-print">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gapy-1 px-2 hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Imprimir Documento
        </button>
      </div>

      <div className="max-w-[215.9mm] mx-auto px-2 sm:px-4 pt-6 pb-4 font-sans bg-white">
        {/* Cabecera / Logo */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Requisición de Personal
            </h1>
            <span className="text-sm font-medium text-slate-600">
              RECURSOS HUMANOS — RDX SOLUTIONS
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
             {/* Fallback en caso de que logo no cargue bien en print */}
             <div className="font-bold text-xl text-blue-900 tracking-wider">RDX</div>
             <span className="font-mono text-lg font-bold bg-slate-100 px-3 py-1 rounded-md mt-1 border border-slate-300">
               {req.rp || 'SIN NÚMERO'}
             </span>
          </div>
        </div>

        {/* Resumen Principal */}
        <div className="grid grid-cols-2 gap-3 mb-2 text-[10px]">
          <div className="border border-slate-300 rounded-lg p-2.5">
            <div className="text-[8px] uppercase font-bold text-slate-500 mb-0.5">Solicitante</div>
            <div className="font-bold">{req.nombre_solicitante}</div>
            <div className="text-[9px]">{req.correo_solicitante}</div>
          </div>
          <div className="border border-slate-300 rounded-lg p-2.5 flex flex-col justify-center">
            <div className="text-[8px] uppercase font-bold text-slate-500 mb-0.5">Estado / Radicación</div>
            <div className="font-bold">{req.estado.replace(/_/g, ' ')}</div>
            <div className="text-[9px]">
              {formatDateCO(req.fecha_radicacion, false) || 'N/A'}
            </div>
            {req.modificada_por_gh && (
              <div className="mt-1 text-[8px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold self-start uppercase">
                Modificada por solicitud de GH
              </div>
            )}
          </div>
        </div>

        {/* Detalles en Tabla/Grid */}
        <div className="border-t border-l border-slate-300 mb-2 text-[10px] flex flex-col">
          <div className="bg-slate-100 p-1.5 font-bold uppercase tracking-wider text-[8px] border-b border-r border-slate-300">
            Datos Generales y Ubicación
          </div>
          <div className="grid grid-cols-2">
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Ubicación:</span>
              <span className="text-right font-medium">{req.departamento && req.municipio ? `${req.departamento} - ${req.municipio}` : '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Centro de Costo:</span>
              <span className="text-right font-medium">{req.centro_costo || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">OT / Proyecto:</span>
              <span className="text-right font-medium">{req.ot || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Nombre Obra:</span>
              <span className="text-right font-medium">{req.nombre_obra_proyecto || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 col-span-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Dirección Obra:</span>
              <span className="text-right font-medium">{req.direccion_obra_proyecto || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Encargado Sitio:</span>
              <span className="text-right font-medium">{req.encargado_sitio || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Vacantes Requeridas:</span>
              <span className="text-right font-medium">{req.numero_personas_requeridas} vacante(s)</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">TSA Requerido:</span>
              <span className="text-right font-medium">{req.tsa || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Fecha Probable Ingreso:</span>
              <span className="text-right font-medium">{req.fecha_probable_ingreso || '—'}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-l border-slate-300 mb-2 text-[10px] flex flex-col">
          <div className="bg-slate-100 p-1.5 font-bold uppercase tracking-wider text-[8px] border-b border-r border-slate-300">
            Área, Cargo y Perfil
          </div>
          <div className="grid grid-cols-1">
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/4">Área:</span>
              <span className="text-left font-medium w-3/4">{req.area_nombre || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/4">Cargo:</span>
              <span className="text-left font-medium w-3/4">{req.cargo_nombre || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/4">Causal / Justificación:</span>
              <span className="text-left font-medium w-3/4">{req.causal_requisicion} {req.otra_causal ? ` - ${req.otra_causal}` : ''}</span>
            </div>
            <div className="border-b border-r border-slate-300 py-1 px-2 flex flex-col">
              <span className="font-bold text-slate-600 text-[9px] mb-0.5">Perfil Requerido:</span>
              <span className="text-left font-medium whitespace-pre-wrap">{req.perfil_requerido || '—'}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-l border-slate-300 mb-2 text-[10px] flex flex-col">
          <div className="bg-slate-100 p-1.5 font-bold uppercase tracking-wider text-[8px] border-b border-r border-slate-300">
            Condiciones de Contratación
          </div>
          <div className="grid grid-cols-2">
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Salario Asignado:</span>
              <span className="text-right font-black">{formatCOP(req.salario_asignado)}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Horas Extras:</span>
              <span className="text-right font-medium">{req.horas_extras || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Modalidad:</span>
              <span className="text-right font-medium">{req.modalidad_contratacion || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Tipo Contrato:</span>
              <span className="text-right font-medium">{req.tipo_contratacion || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Aux. Movilización:</span>
              <span className="text-right font-medium">{formatCOP(req.auxilio_movilizacion)}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Aux. Alimentación:</span>
              <span className="text-right font-medium">{formatCOP(req.auxilio_alimentacion)}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Aux. Vivienda:</span>
              <span className="text-right font-medium">{formatCOP(req.auxilio_vivienda)}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px]">Duración Contrato/Obra:</span>
              <span className="text-right font-medium">{req.duracion_obra_contrato || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 col-span-2 flex justify-between bg-slate-50">
              <span className="font-bold text-slate-800 text-[9px]">TOTAL INGRESOS (Salario + Auxilios):</span>
              <span className="text-right font-black text-slate-800 text-[11px]">{formatCOP(totalIngresos)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-l border-slate-300 mb-3 text-[10px] flex flex-col">
          <div className="bg-slate-100 p-1.5 font-bold uppercase tracking-wider text-[8px] border-b border-r border-slate-300">
            Equipos y Dotación
          </div>
          <div className="grid grid-cols-1">
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/3">Equipos Oficina:</span>
              <span className="text-left font-medium w-2/3">{req.equipos_oficina?.map(e => e.equipo).join(', ') || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/3">Equipos Tecnológicos:</span>
              <span className="text-left font-medium w-2/3">{req.equipos_tecnologicos?.map(e => e.equipo).join(', ') || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/3">SIMCARD:</span>
              <span className="text-left font-medium w-2/3">{req.requiere_simcard === 'SI' ? `Sí - ${req.tipo_plan_simcard}` : 'No'}</span>
            </div>
             <div className="border-b border-r border-slate-300 py-1 px-2 flex justify-between">
              <span className="font-bold text-slate-600 text-[9px] w-1/3">Programas Especiales:</span>
              <span className="text-left font-medium w-2/3">{req.programas_especiales || (req.requiere_programas_especiales === 'NO' ? 'No' : '—')}</span>
            </div>
          </div>
        </div>

        {/* Firmas / Aprobaciones */}
        <div className="flex justify-between items-start pt-4 gap-6">
          <div className="flex-1 text-center">
             <div className="border-b border-black w-48 mx-auto mb-2"></div>
             <div className="font-bold text-[9px]">SOLICITADO POR</div>
             <div className="text-[9px]">{req.nombre_solicitante}</div>
             <div className="text-[8px] text-slate-500">{formatDateCO(req.fecha_radicacion)}</div>
          </div>
          
          {req.aprobador_nombre && (
            <div className="flex-1 text-center">
               <div className="border-b border-black w-48 mx-auto mb-2 relative">
                 {/* Sello de Aprobación */}
                 <div className="absolute bottom-2 right-4 rotate-[-15deg] border-2 border-emerald-600 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded opacity-70">
                   APROBADO
                 </div>
               </div>
               <div className="font-bold text-[9px]">DIRECTOR DE ÁREA</div>
               <div className="text-[9px]">{req.aprobador_nombre}</div>
               <div className="text-[8px] text-slate-500">{formatDateCO(req.fecha_decision_aprobador)}</div>
            </div>
          )}

          {req.gerente_nombre && (
            <div className="flex-1 text-center">
               <div className="border-b border-black w-48 mx-auto mb-2 relative">
                 <div className="absolute bottom-2 right-4 rotate-[-15deg] border-2 border-blue-600 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded opacity-70">
                   AUTORIZADO
                 </div>
               </div>
               <div className="font-bold text-[9px]">GERENCIA</div>
               <div className="text-[9px]">{req.gerente_nombre}</div>
               <div className="text-[8px] text-slate-500">{formatDateCO(req.fecha_decision_gerente)}</div>
            </div>
          )}

          {req.fecha_recibido_gh && (
            <div className="flex-1 text-center">
               <div className="border-b border-black w-48 mx-auto mb-2 relative">
                 <div className="absolute bottom-2 right-4 rotate-[-15deg] border-2 border-purple-600 text-purple-600 text-[9px] font-black px-2 py-0.5 rounded opacity-70">
                   RECIBIDO
                 </div>
               </div>
               <div className="font-bold text-[9px]">JEFE DE GESTIÓN HUMANA</div>
               <div className="text-[9px]">{req.responsable_gh_nombre || 'Gestión Humana'}</div>
               <div className="text-[8px] text-slate-500">{formatDateCO(req.fecha_recibido_gh)}</div>
            </div>
          )}
        </div>
        
        {/* Footer Documento */}
        <div className="mt-4 text-center text-[8px] text-slate-400 border-t border-slate-200 pt-2 pb-2">
           Documento generado automáticamente por el Sistema de Requisiciones de Personal | Gestor de Proyectos TI
        </div>

      </div>
    </div>
  );

  return createPortal(printContent, document.body);
};

export default PrintRequisicionRP;
