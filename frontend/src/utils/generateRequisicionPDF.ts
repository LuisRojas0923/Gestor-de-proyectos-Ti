import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatFriendlyDate } from './dateUtils';

// The images should be served from public/images
const logoImage = '/images/logo-refridcol.png';
const watermarkImage = '/images/watermark-erp.png';

export interface RequisicionParaPDF {
    id: string;
    solicitante_nombre: string;
    solicitante_area: string;
    solicitante_sede: string;
    solicitante_email: string;
    ciudad_contratacion: string;
    orden_trabajo: string;
    nombre_proyecto: string;
    direccion_proyecto: string;
    encargado_sitio: string;
    area_destino: string;
    cargo_nombre: string;
    numero_personas: number;
    trabajo_alturas: string;
    duracion_contrato: string;
    fecha_ingreso: string | Date;
    centro_costo: string;
    causal_requisicion: string;
    perfil_o: string;
    equipos_oficina: string;
    equipos_detalle?: string;
    equipos_tecnologicos: string;
    tecnologia_detalle?: string;
    sim_card_requerida: string;
    sim_card_plan?: string;
    programas_especiales_requeridos: string;
    programas_especiales_detalle?: string;
    salario_asignado: number;
    horas_extra: string;
    modalidad_contratacion: string;
    tipo_contratacion: string;
    auxilio_movilizacion?: number;
    auxilio_alimentacion?: number;
    auxilio_vivienda?: number;
    estado: string;
    fecha_creacion: string | Date;
    
    // Approval data
    id_jefe_aprobador?: string;
    nombre_jefe_aprobador?: string;
    fecha_revision_jefe?: string | Date;
    comentario_revision_jefe?: string;
    
    id_gh_aprobador?: string;
    nombre_gh_aprobador?: string;
    fecha_revision_gh?: string | Date;
    comentario_revision_gh?: string;
}

export const generateRequisicionPDF = async (requisicion: RequisicionParaPDF): Promise<void> => {
    // Create portrait document
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper to load images to base64
    const loadImage = (src: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = src;
        });
    };

    try {
        let logoBase64 = '';
        let watermarkBase64 = '';
        try {
            logoBase64 = await loadImage(logoImage);
            watermarkBase64 = await loadImage(watermarkImage);
        } catch (e) {
            console.warn('Could not load images for PDF', e);
        }

        // --- HEADER ---
        const headerY = 10;
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 15, headerY, 60, 15);
        }

        // Title and Info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 32, 96);
        doc.text('REQUISICIÓN DE PERSONAL', pageWidth - 15, headerY + 6, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`ID: ${requisicion.id}`, pageWidth - 15, headerY + 12, { align: 'right' });
        
        // Mappers
        const tipoContratacionMap: Record<string, string> = {
            'fijo_inferior_1_anio': 'CONTRATO FIJO INFERIOR A 1 AÑO',
            'obra_labor': 'CONTRATO OBRA LABOR',
            'indefinido': 'CONTRATO INDEFINIDO',
        };

        const modalidadMap: Record<string, string> = {
            'directo_refridcol': 'DIRECTO POR REFRIDCOL',
            'agencia_temporal': 'AGENCIA TEMPORAL',
            'aprendiz_sena': 'APRENDIZ CONVENIO SENA',
        };
        
        const formatFecha = (f: any) => {
            if (!f) return '---';
            if (typeof f === 'string' && f.includes('T')) {
                 return formatFriendlyDate(f);
            }
            try { return new Date(f).toISOString().split('T')[0]; } catch { return '---'; }
        };
        
        doc.text(`Fecha Solicitud: ${formatFecha(requisicion.fecha_creacion)}`, pageWidth - 15, headerY + 18, { align: 'right' });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(15, headerY + 22, pageWidth - 15, headerY + 22);

        let currentY = headerY + 30;

        // Helper for sections
        const addSectionTitle = (title: string, y: number) => {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(0, 32, 96);
            doc.setTextColor(255, 255, 255);
            doc.rect(15, y, pageWidth - 30, 7, 'F');
            doc.text(title.toUpperCase(), 20, y + 5);
            return y + 10;
        };

        const addDataField = (label: string, value: any, x: number, y: number, width: number) => {
            const textValue = String(value || '---').replace(/_/g, ' ');
            doc.setFontSize(9);
            const splitText = doc.splitTextToSize(textValue, width - 4);
            
            // Calculate total height: label + text lines + padding
            const boxHeight = 12 + (splitText.length * 4); 

            // Draw Box Border
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.rect(x, y, width, boxHeight);
            
            // Draw Label
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text(label.toUpperCase(), x + 2, y + 5);
            
            // Draw Value
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(splitText, x + 2, y + 10);
            
            return y + boxHeight;
        };

        const col1 = 15;
        const colWidth = 92.95; // (185.9) / 2
        const col2 = col1 + colWidth;

        // 1. SOLICITANTE
        currentY = addSectionTitle('Información del Solicitante', currentY);
        let cy1 = addDataField('Nombre', requisicion.solicitante_nombre, col1, currentY, colWidth);
        cy1 = addDataField('Cargo / Área', requisicion.solicitante_area, col1, cy1, colWidth);
        
        let cy2 = addDataField('Email', requisicion.solicitante_email, col2, currentY, colWidth);
        cy2 = addDataField('Sede', requisicion.solicitante_sede, col2, cy2, colWidth);
        currentY = Math.max(cy1, cy2) + 4;

        // 2. DETALLES OPERATIVOS
        currentY = addSectionTitle('Detalles de Operación y Proyecto', currentY);
        cy1 = addDataField('Proyecto', requisicion.nombre_proyecto, col1, currentY, colWidth);
        cy1 = addDataField('Ciudad', requisicion.ciudad_contratacion, col1, cy1, colWidth);
        cy1 = addDataField('OT', requisicion.orden_trabajo, col1, cy1, colWidth);
        
        cy2 = addDataField('Dirección', requisicion.direccion_proyecto, col2, currentY, colWidth);
        cy2 = addDataField('Encargado en Sitio', requisicion.encargado_sitio, col2, cy2, colWidth);
        
        // Equalize the bottoms of the two columns for the next row
        currentY = Math.max(cy1, cy2);
        if (cy1 < currentY) {
            // Fill empty space in col1 with blank box
            doc.setDrawColor(200, 200, 200);
            doc.rect(col1, cy1, colWidth, currentY - cy1);
        } else if (cy2 < currentY) {
            // Fill empty space in col2
            doc.rect(col2, cy2, colWidth, currentY - cy2);
        }
        currentY += 4;

        // 3. LA VACANTE
        currentY = addSectionTitle('Detalles de la Vacante', currentY);
        cy1 = addDataField('Cargo Solicitado', requisicion.cargo_nombre, col1, currentY, colWidth);
        cy1 = addDataField('Área Destino', requisicion.area_destino, col1, cy1, colWidth);
        cy1 = addDataField('Fecha Ingreso (aprox)', formatFecha(requisicion.fecha_ingreso), col1, cy1, colWidth);
        cy1 = addDataField('Duración Contrato', requisicion.duracion_contrato, col1, cy1, colWidth);
        
        cy2 = addDataField('Número de Personas', requisicion.numero_personas, col2, currentY, colWidth);
        cy2 = addDataField('Centro de Costos', requisicion.centro_costo, col2, cy2, colWidth);
        cy2 = addDataField('Trabajo en Alturas', requisicion.trabajo_alturas, col2, cy2, colWidth);
        cy2 = addDataField('Causal', requisicion.causal_requisicion, col2, cy2, colWidth);
        
        currentY = Math.max(cy1, cy2);
        // Fill blank space if columns are uneven
        if (cy1 < currentY) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(col1, cy1, colWidth, currentY - cy1);
        } else if (cy2 < currentY) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(col2, cy2, colWidth, currentY - cy2);
        }
        
        currentY = addDataField('Perfil / Observaciones', requisicion.perfil_o, col1, currentY, pageWidth - 30) + 4;

        // Manage pagination here if currentY gets too low
        if (currentY > 230) {
            doc.addPage();
            currentY = 20;
        }

        // 4. DATOS DE CONTRATACIÓN Y SALARIOS
        currentY = addSectionTitle('Condiciones y Beneficios', currentY);
        cy1 = addDataField('Salario Asignado', `$${new Intl.NumberFormat('es-CO').format(requisicion.salario_asignado)}`, col1, currentY, colWidth);
        cy1 = addDataField('Modalidad', modalidadMap[requisicion.modalidad_contratacion] || requisicion.modalidad_contratacion, col1, cy1, colWidth);
        cy1 = addDataField('Tipo Contratación', tipoContratacionMap[requisicion.tipo_contratacion] || requisicion.tipo_contratacion, col1, cy1, colWidth);
        
        cy2 = addDataField('Pago Horas Extra', requisicion.horas_extra.toUpperCase() === 'SI' ? 'SÍ' : 'NO', col2, currentY, colWidth);
        const mov = requisicion.auxilio_movilizacion ? `$${new Intl.NumberFormat('es-CO').format(requisicion.auxilio_movilizacion)}` : 'N/A';
        cy2 = addDataField('Auxilio Movilización', mov, col2, cy2, colWidth);
        const ali = requisicion.auxilio_alimentacion ? `$${new Intl.NumberFormat('es-CO').format(requisicion.auxilio_alimentacion)}` : 'N/A';
        cy2 = addDataField('Auxilio Alimentación', ali, col2, cy2, colWidth);
        const viv = requisicion.auxilio_vivienda ? `$${new Intl.NumberFormat('es-CO').format(requisicion.auxilio_vivienda)}` : 'N/A';
        cy2 = addDataField('Auxilio Vivienda', viv, col2, cy2, colWidth);
        
        currentY = Math.max(cy1, cy2);
        if (cy1 < currentY) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(col1, cy1, colWidth, currentY - cy1);
        } else if (cy2 < currentY) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(col2, cy2, colWidth, currentY - cy2);
        }
        currentY += 4;

        if (currentY > 230) {
            doc.addPage();
            currentY = 20;
        }

        // 5. EQUIPOS Y HERRAMIENTAS
        currentY = addSectionTitle('Equipos y Herramientas a Proveer', currentY);
        const eqOfi = requisicion.equipos_oficina.toUpperCase() === 'SI' ? (requisicion.equipos_detalle || 'SÍ') : 'NO';
        cy1 = addDataField('Equipos de Oficina', eqOfi, col1, currentY, colWidth);
        
        const eqTec = requisicion.equipos_tecnologicos.toUpperCase() === 'SI' ? (requisicion.tecnologia_detalle || 'SÍ') : 'NO';
        cy1 = addDataField('Equipos Tecnológicos', eqTec, col1, cy1, colWidth);
        
        const simM = requisicion.sim_card_requerida.toUpperCase() === 'SI' ? (requisicion.sim_card_plan || 'SÍ') : 'NO';
        cy2 = addDataField('Sim Card Comercial', simM, col2, currentY, colWidth);
        
        const prog = requisicion.programas_especiales_requeridos.toUpperCase() === 'SI' ? (requisicion.programas_especiales_detalle || 'SÍ') : 'NO';
        cy2 = addDataField('Programas Especiales', prog, col2, cy2, colWidth);
        
        currentY = Math.max(cy1, cy2);
        if (cy1 < currentY) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(col1, cy1, colWidth, currentY - cy1);
        } else if (cy2 < currentY) {
            doc.setDrawColor(200, 200, 200);
            doc.rect(col2, cy2, colWidth, currentY - cy2);
        }
        currentY += 6;

        if (currentY > 200) {
            doc.addPage();
            currentY = 20;
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 15, 10, 60, 15);
                currentY += 15;
            }
        }

        // 6. FIRMAS Y APROBACIONES
        currentY = addSectionTitle('Estado de Aprobaciones', currentY);
        
        // Use autotable for approvals
        const approvalData = [];
        
        // 1. Jefe de Area
        if (requisicion.id_jefe_aprobador) {
            const aprobador = requisicion.nombre_jefe_aprobador || requisicion.id_jefe_aprobador || '---';
            approvalData.push([
                'Jefe de Área',
                aprobador,
                formatFecha(requisicion.fecha_revision_jefe),
                'APROBADO',
                requisicion.comentario_revision_jefe || ''
            ]);
        } else {
            approvalData.push(['Jefe de Área', '---', '---', 'PENDIENTE', '']);
        }
        
        // 2. Gestion Humana
        if (requisicion.id_gh_aprobador) {
            const aprobador = requisicion.nombre_gh_aprobador || requisicion.id_gh_aprobador || '---';
            const estadoGH = requisicion.estado === 'Rechazada' ? 'RECHAZADO' : 'APROBADO';
            approvalData.push([
                'Gestión Humana',
                aprobador,
                formatFecha(requisicion.fecha_revision_gh),
                estadoGH,
                requisicion.comentario_revision_gh || ''
            ]);
        } else {
            const isGHRejec = requisicion.estado === 'Rechazada' && !requisicion.id_gh_aprobador;
            approvalData.push([
                'Gestión Humana', 
                '---', 
                '---', 
                isGHRejec ? 'RECHAZADO' : (requisicion.id_jefe_aprobador ? 'PENDIENTE' : 'EN ESPERA'), 
                ''
            ]);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['NIVEL', 'APROBADOR', 'FECHA', 'ESTADO', 'COMENTARIOS']],
            body: approvalData,
            theme: 'grid',
            headStyles: { 
                fillColor: [240, 240, 240], 
                textColor: [0, 32, 96], 
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold', halign: 'center' },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 32, fontStyle: 'bold', halign: 'center' },
                4: { cellWidth: 'auto' }
            }
        });

        // --- MARCA DE AGUA en todas las páginas ---
        if (watermarkBase64) {
            const pageCount = (doc.internal as any).getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.addImage(watermarkBase64, 'PNG', pageWidth - 55, pageHeight - 12, 45, 6);
            }
        }

        // Descargar PDF
        const idLimpio = requisicion.id.replace(/\s+/g, '_');
        doc.save(`Requisicion_Personal_${idLimpio}.pdf`);

    } catch (error) {
        console.error('Error generando PDF de requisición:', error);
        throw new Error('No se pudo generar el documento PDF.');
    }
};
