import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDetalleRequisicion } from '../services/requisicionService';
import type { RequisicionRP } from '../types/requisicion.types';
import logo from '../../../../../assets/images/logos/logo.png';

const PrintRequisicionRP: React.FC = () => {
  const { id } = useParams();
  const [req, setReq] = useState<RequisicionRP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDetalleRequisicion(Number(id))
      .then(data => {
        setReq(data);
        setTimeout(() => {
          window.print();
        }, 500); // Dar un poco de tiempo para renderizar
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

  const formatCOP = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    return `$${val.toLocaleString('de-DE')}`;
  };

  return (
    <div className="bg-white min-h-screen text-black">
      <style>
        {`
          @media print {
            @page {
              size: letter;
              margin: 15mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: white !important;
            }
            /* Ocultar todos los elementos de la página */
            body * {
              visibility: hidden;
            }
            /* Hacer visible solo el área de impresión y sus hijos */
            #print-area, #print-area * {
              visibility: visible;
            }
            /* Posicionar el área de impresión arriba a la izquierda para evitar espacios en blanco del layout original */
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Imprimir Documento
        </button>
      </div>

      <div id="print-area" className="max-w-[215.9mm] mx-auto p-4 sm:p-8 font-sans bg-white">
        {/* Cabecera / Logo */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
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
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="border border-slate-300 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Solicitante</div>
            <div className="font-bold">{req.nombre_solicitante}</div>
            <div className="text-xs">{req.correo_solicitante}</div>
          </div>
          <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Estado / Radicación</div>
            <div className="font-bold">{req.estado.replace(/_/g, ' ')}</div>
            <div className="text-xs">
              {req.fecha_radicacion ? new Date(req.fecha_radicacion).toLocaleDateString('es-CO') : 'N/A'}
            </div>
          </div>
        </div>

        {/* Detalles en Tabla/Grid */}
        <div className="border-t border-l border-slate-300 mb-6 text-sm flex flex-col">
          <div className="bg-slate-100 p-2 font-bold uppercase tracking-wider text-[11px] border-b border-r border-slate-300">
            Datos Generales y Ubicación
          </div>
          <div className="grid grid-cols-2">
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Ubicación:</span>
              <span className="text-right font-medium">{req.departamento && req.municipio ? `${req.departamento} - ${req.municipio}` : '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Centro de Costo:</span>
              <span className="text-right font-medium">{req.centro_costo || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">OT / Proyecto:</span>
              <span className="text-right font-medium">{req.ot || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Nombre Obra:</span>
              <span className="text-right font-medium">{req.nombre_obra_proyecto || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 col-span-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Dirección Obra:</span>
              <span className="text-right font-medium">{req.direccion_obra_proyecto || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Encargado Sitio:</span>
              <span className="text-right font-medium">{req.encargado_sitio || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Vacantes Requeridas:</span>
              <span className="text-right font-medium">{req.numero_personas_requeridas} vacante(s)</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">TSA Requerido:</span>
              <span className="text-right font-medium">{req.tsa || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Fecha Probable Ingreso:</span>
              <span className="text-right font-medium">{req.fecha_probable_ingreso || '—'}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-l border-slate-300 mb-6 text-sm flex flex-col">
          <div className="bg-slate-100 p-2 font-bold uppercase tracking-wider text-[11px] border-b border-r border-slate-300">
            Área, Cargo y Perfil
          </div>
          <div className="grid grid-cols-1">
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/4">Área:</span>
              <span className="text-left font-medium w-3/4">{req.area_nombre || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/4">Cargo:</span>
              <span className="text-left font-medium w-3/4">{req.cargo_nombre || '—'}</span>
            </div>
            <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/4">Causal / Justificación:</span>
              <span className="text-left font-medium w-3/4">{req.causal_requisicion} {req.otra_causal ? ` - ${req.otra_causal}` : ''}</span>
            </div>
            {req.perfil_requerido && (
              <div className="border-b border-r border-slate-300 p-2 flex flex-col">
                <span className="font-bold text-slate-600 text-xs mb-1">Perfil Requerido:</span>
                <span className="text-left font-medium whitespace-pre-wrap">{req.perfil_requerido}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-l border-slate-300 mb-6 text-sm flex flex-col">
          <div className="bg-slate-100 p-2 font-bold uppercase tracking-wider text-[11px] border-b border-r border-slate-300">
            Condiciones de Contratación
          </div>
          <div className="grid grid-cols-2">
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Salario Asignado:</span>
              <span className="text-right font-black">{formatCOP(req.salario_asignado)}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Horas Extras:</span>
              <span className="text-right font-medium">{req.horas_extras || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Modalidad:</span>
              <span className="text-right font-medium">{req.modalidad_contratacion || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Tipo Contrato:</span>
              <span className="text-right font-medium">{req.tipo_contratacion || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Aux. Movilización:</span>
              <span className="text-right font-medium">{formatCOP(req.auxilio_movilizacion)}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Aux. Alimentación:</span>
              <span className="text-right font-medium">{formatCOP(req.auxilio_alimentacion)}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Aux. Vivienda:</span>
              <span className="text-right font-medium">{formatCOP(req.auxilio_vivienda)}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs">Duración Contrato/Obra:</span>
              <span className="text-right font-medium">{req.duracion_obra_contrato || '—'}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-l border-slate-300 mb-8 text-sm flex flex-col">
          <div className="bg-slate-100 p-2 font-bold uppercase tracking-wider text-[11px] border-b border-r border-slate-300">
            Equipos y Dotación
          </div>
          <div className="grid grid-cols-1">
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/3">Equipos Oficina:</span>
              <span className="text-left font-medium w-2/3">{req.equipos_oficina?.map(e => e.equipo).join(', ') || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/3">Equipos Tecnológicos:</span>
              <span className="text-left font-medium w-2/3">{req.equipos_tecnologicos?.map(e => e.equipo).join(', ') || '—'}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/3">SIMCARD:</span>
              <span className="text-left font-medium w-2/3">{req.requiere_simcard === 'SI' ? `Sí - ${req.tipo_plan_simcard}` : 'No'}</span>
            </div>
             <div className="border-b border-r border-slate-300 p-2 flex justify-between">
              <span className="font-bold text-slate-600 text-xs w-1/3">Programas Especiales:</span>
              <span className="text-left font-medium w-2/3">{req.programas_especiales || (req.requiere_programas_especiales === 'NO' ? 'No' : '—')}</span>
            </div>
          </div>
        </div>

        {/* Firmas / Aprobaciones */}
        <div className="flex justify-between items-start pt-6 gap-6">
          <div className="flex-1 text-center">
             <div className="border-b border-black w-48 mx-auto mb-2"></div>
             <div className="font-bold text-xs">SOLICITADO POR</div>
             <div className="text-[10px]">{req.nombre_solicitante}</div>
             <div className="text-[9px] text-slate-500">{req.fecha_radicacion ? new Date(req.fecha_radicacion).toLocaleString('es-CO') : ''}</div>
          </div>
          
          {req.aprobador_nombre && (
            <div className="flex-1 text-center">
               <div className="border-b border-black w-48 mx-auto mb-2 relative">
                 {/* Sello de Aprobación */}
                 <div className="absolute bottom-2 right-4 rotate-[-15deg] border-2 border-emerald-600 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded opacity-70">
                   APROBADO
                 </div>
               </div>
               <div className="font-bold text-xs">DIRECTOR DE ÁREA</div>
               <div className="text-[10px]">{req.aprobador_nombre}</div>
               <div className="text-[9px] text-slate-500">{req.fecha_decision_aprobador ? new Date(req.fecha_decision_aprobador).toLocaleString('es-CO') : ''}</div>
            </div>
          )}

          {req.gerente_nombre && (
            <div className="flex-1 text-center">
               <div className="border-b border-black w-48 mx-auto mb-2 relative">
                 <div className="absolute bottom-2 right-4 rotate-[-15deg] border-2 border-blue-600 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded opacity-70">
                   AUTORIZADO
                 </div>
               </div>
               <div className="font-bold text-xs">GERENCIA</div>
               <div className="text-[10px]">{req.gerente_nombre}</div>
               <div className="text-[9px] text-slate-500">{req.fecha_decision_gerente ? new Date(req.fecha_decision_gerente).toLocaleString('es-CO') : ''}</div>
            </div>
          )}
        </div>
        
        {/* Footer Documento */}
        <div className="mt-12 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-4">
           Documento generado automáticamente por el Sistema de Requisiciones de Personal | Gestor de Proyectos TI
        </div>

      </div>
    </div>
  );
};

export default PrintRequisicionRP;
