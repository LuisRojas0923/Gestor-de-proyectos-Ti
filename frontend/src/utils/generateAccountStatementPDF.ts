import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Las imágenes se sirven desde la carpeta public/images
const logoImage = '/images/logo-refridcol.png';
const watermarkImage = '/images/watermark-erp.png';

// Tipos
interface Movimiento {
    fechaaplicacion: string;
    radicado: string;
    consignacion_contabilizado: number;
    legalizacion_contabilizado: number;
    consignacion_firmadas: number;
    legalizacion_firmadas: number;
    consignacion_pendientes: number;
    legalizacion_pendientes: number;
    saldo: number;
    observaciones: string;
}

interface User {
    cedula?: string;
    nrocedula?: string;
    nombre?: string;
    name?: string;  // Propiedad alternativa usada en el componente
    id?: string;
}

/**
 * Genera y descarga un PDF del estado de cuenta de viáticos
 * @param user - Datos del usuario (cédula y nombre)
 * @param movimientos - Array de movimientos financieros
 */
export const generateAccountStatementPDF = async (
    user: User,
    movimientos: Movimiento[]
): Promise<void> => {
    // Crear documento en orientación horizontal
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Función para convertir imagen a base64
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
        // Cargar imágenes
        const logoBase64 = await loadImage(logoImage);
        const watermarkBase64 = await loadImage(watermarkImage);

        // === ENCABEZADO CON RECUADROS CONECTADOS ===
        const headerY = 5;
        const headerHeight = 22;
        const logoWidth = 75;
        const cedulaWidth = 65;
        const tituloWidth = pageWidth - 20 - logoWidth - cedulaWidth; // Espacio restante

        // Recuadro del logo (izquierda)
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.25);
        doc.rect(10, headerY, logoWidth, headerHeight);
        doc.addImage(logoBase64, 'PNG', 12, headerY + 2, 70, 18);

        // Recuadro del título (centro, conectado al logo)
        const tituloX = 10 + logoWidth;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.25);
        doc.rect(tituloX, headerY, tituloWidth, headerHeight);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 32, 96); // Azul Navy corporativo
        doc.text('ESTADO DE CUENTA DE VIATICOS', tituloX + tituloWidth / 2, 18, { align: 'center' });

        // Recuadro de cédula (derecha, conectado al título)
        const cedulaBoxX = tituloX + tituloWidth;
        // Rectángulo superior navy
        doc.setFillColor(0, 32, 96);
        doc.rect(cedulaBoxX, headerY, cedulaWidth, 10, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.25);
        doc.rect(cedulaBoxX, headerY, cedulaWidth, 10);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('CEDULA VIATICANTE', cedulaBoxX + cedulaWidth / 2, 11, { align: 'center' });
        // Rectángulo inferior blanco con borde
        doc.setFillColor(255, 255, 255);
        doc.rect(cedulaBoxX, headerY + 10, cedulaWidth, 12, 'FD');
        doc.setTextColor(0, 32, 96); // Azul Navy corporativo
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const cedula = user.cedula || user.nrocedula || user.id || 'N/A';
        doc.text(cedula, cedulaBoxX + cedulaWidth / 2, 23, { align: 'center' });

        // Barra de nombre empleado (recuadro completo)
        const nameBoxY = 30;
        const nameBoxHeight = 8;
        const nameLabelWidth = 55;

        // Rectángulo navy para la etiqueta "NOMBRE EMPLEADO"
        doc.setFillColor(0, 32, 96);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.25);
        doc.rect(10, nameBoxY, nameLabelWidth, nameBoxHeight, 'F');
        doc.rect(10, nameBoxY, nameLabelWidth, nameBoxHeight, 'D'); // Borde gris
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('NOMBRE EMPLEADO', 10 + nameLabelWidth / 2, nameBoxY + 5.5, { align: 'center' });

        // Rectángulo blanco con borde para el valor del nombre (hasta el final del header)
        const totalHeaderWidth = pageWidth - 20;
        const nameValueWidth = totalHeaderWidth - nameLabelWidth;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.rect(10 + nameLabelWidth, nameBoxY, nameValueWidth, nameBoxHeight, 'D');
        doc.setTextColor(0, 32, 96); // Azul Navy corporativo
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const nombreEmpleado = user.nombre || user.name || cedula || 'EMPLEADO';
        doc.text(nombreEmpleado.toUpperCase(), 10 + nameLabelWidth + 3, nameBoxY + 5.5);

        // === TABLA ===
        const tableData = movimientos.map((mov) => [
            new Date(mov.fechaaplicacion).toLocaleDateString('es-CO'),
            mov.radicado,
            mov.consignacion_contabilizado > 0 ? `$${mov.consignacion_contabilizado.toLocaleString('es-CO')}` : '',
            mov.legalizacion_contabilizado > 0 ? `$${mov.legalizacion_contabilizado.toLocaleString('es-CO')}` : '',
            mov.consignacion_firmadas > 0 ? `$${mov.consignacion_firmadas.toLocaleString('es-CO')}` : '',
            mov.legalizacion_firmadas > 0 ? `$${mov.legalizacion_firmadas.toLocaleString('es-CO')}` : '',
            mov.consignacion_pendientes > 0 ? `$${mov.consignacion_pendientes.toLocaleString('es-CO')}` : '',
            mov.legalizacion_pendientes > 0 ? `$${mov.legalizacion_pendientes.toLocaleString('es-CO')}` : '',
            `$${mov.saldo.toLocaleString('es-CO')}`,
            mov.observaciones || ''
        ]);

        autoTable(doc, {
            startY: 42,
            margin: { left: 10, right: 10 },
            head: [
                [
                    { content: 'FECHA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'RADICADO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'CONTABILIZADO', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'EN CANJE', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'PENDIENTES', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'SALDO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'OBSERVACIONES', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
                ],
                [
                    { content: 'Consignación', styles: { halign: 'center' } },
                    { content: 'Legalización', styles: { halign: 'center' } },
                    { content: 'Consignación', styles: { halign: 'center' } },
                    { content: 'Legalización', styles: { halign: 'center' } },
                    { content: 'Consignación', styles: { halign: 'center' } },
                    { content: 'Legalización', styles: { halign: 'center' } }
                ]
            ],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: [180, 180, 180], // GRIS para el cuerpo
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [0, 32, 96],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                lineWidth: 0.1,
                lineColor: [255, 255, 255] // BLANCO para los encabezados de tabla
            },
            columnStyles: {
                0: { cellWidth: 18, halign: 'center' }, // Fecha
                1: { cellWidth: 25, halign: 'left' }, // Radicado
                2: { cellWidth: 23, halign: 'right' }, // Cons. Cont.
                3: { cellWidth: 23, halign: 'right' }, // Leg. Cont.
                4: { cellWidth: 23, halign: 'right' }, // Cons. Canje
                5: { cellWidth: 23, halign: 'right' }, // Leg. Canje
                6: { cellWidth: 23, halign: 'right' }, // Cons. Pend.
                7: { cellWidth: 23, halign: 'right' }, // Leg. Pend.
                8: { cellWidth: 23, halign: 'right', fontStyle: 'bold' }, // Saldo
                9: { cellWidth: 'auto' } // Observaciones (ganará el espacio restante)
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        // === MARCA DE AGUA ===
        doc.addImage(watermarkBase64, 'PNG', pageWidth - 55, pageHeight - 12, 45, 6);

        // === DESCARGAR ===
        const fecha = new Date().toISOString().split('T')[0];
        const cedulaFile = user.cedula || user.nrocedula || user.id || 'usuario';
        doc.save(`EstadoCuenta_${cedulaFile}_${fecha}.pdf`);

    } catch (error) {
        console.error('Error generando PDF:', error);
        throw new Error('No se pudo generar el PDF');
    }
};

export default generateAccountStatementPDF;
