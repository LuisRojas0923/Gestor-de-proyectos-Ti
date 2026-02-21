import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const logoImage = '/images/logo-refridcol.png';
const watermarkImage = '/images/watermark-erp.png';

interface ExpenseLine {
    fecha: string;
    observaciones: string;
    ot: string;
    cc: string;
    scc: string;
    valorConFactura: number;
    valorSinFactura: number;
}

interface User {
    name?: string;
    cedula?: string;
    id?: string;
    sede?: string;
}

/**
 * Genera y descarga el PDF del Reporte de Gastos de Viáticos (FT-GFA-20)
 * Layout Vertical A4 - Navy Blue Branding
 */
export const generateExpenseReportPDF = async (
    user: User,
    lineas: ExpenseLine[],
    observacionesGral: string = ''
): Promise<void> => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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
        const logoBase64 = await loadImage(logoImage);
        const watermarkBase64 = await loadImage(watermarkImage);

        const margin = 10;
        const headerY = 5;
        const headerHeight = 22;
        const navyBlue = [0, 32, 96];

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);

        // === ENCABEZADO LOGO Y TITULO ===
        doc.rect(margin, headerY, 40, headerHeight);
        doc.addImage(logoBase64, 'PNG', margin + 2, headerY + 2, 36, 18);

        const titleX = margin + 40;
        const titleW = pageWidth - margin * 2 - 80;
        doc.rect(titleX, headerY, titleW, headerHeight);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE GASTOS DE VIÁTICOS', titleX + titleW / 2, headerY + 13, { align: 'center' });

        const ctrlX = pageWidth - margin - 40;
        doc.rect(ctrlX, headerY, 40, headerHeight);
        doc.line(ctrlX, headerY + 7.3, ctrlX + 40, headerY + 7.3);
        doc.line(ctrlX, headerY + 14.6, ctrlX + 40, headerY + 14.6);
        doc.line(ctrlX + 18, headerY, ctrlX + 18, headerY + headerHeight);
        doc.setFontSize(7);
        doc.text('CODIGO', ctrlX + 9, headerY + 4, { align: 'center' });
        doc.text('FT-GFA-20', ctrlX + 29, headerY + 4, { align: 'center' });
        doc.text('FECHA', ctrlX + 9, headerY + 11, { align: 'center' });
        doc.text('mar-2024', ctrlX + 29, headerY + 11, { align: 'center' });
        doc.text('VERSION', ctrlX + 9, headerY + 18, { align: 'center' });
        doc.text('05', ctrlX + 29, headerY + 18, { align: 'center' });

        // === INFORMACIÓN SOLICITANTE ===
        const infoY = headerY + headerHeight + 2;
        const infoH = 10;
        doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2]);
        doc.rect(margin, infoY, pageWidth - margin * 2, infoH / 2, 'F');
        doc.rect(margin, infoY, pageWidth - margin * 2, infoH);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        const colW = (pageWidth - margin * 2) / 4;
        doc.text('FECHA ENTREGA REPORTE', margin + colW * 0.5, infoY + 3.5, { align: 'center' });
        doc.text('NOMBRE', margin + colW * 1.5, infoY + 3.5, { align: 'center' });
        doc.text('DOC. IDENTIDAD', margin + colW * 2.5, infoY + 3.5, { align: 'center' });
        doc.text('CIUDAD', margin + colW * 3.5, infoY + 3.5, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        const hoy = new Date();
        const dateStr = `${hoy.getDate().toString().padStart(2, '0')} / ${(hoy.getMonth() + 1).toString().padStart(2, '0')} / ${hoy.getFullYear().toString().slice(-2)}`;
        doc.text(dateStr, margin + colW * 0.5, infoY + 8.5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text((user.name || '').toUpperCase(), margin + colW * 1.5, infoY + 8.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(user.cedula || user.id || '', margin + colW * 2.5, infoY + 8.5, { align: 'center' });
        doc.text((user.sede || '').toUpperCase(), margin + colW * 3.5, infoY + 8.5, { align: 'center' });

        // === TABLA DE GASTOS ===
        const safeNum = (val: any) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            // Limpieza básica: quitar símbolos de moneda, espacios. 
            // Manejar coma decimal si es necesario, pero usualmente en el estado son números puros tras Number()
            const clean = String(val).replace(/[^\d.-]/g, '');
            return parseFloat(clean) || 0;
        };

        const totalConFactura = lineas.reduce((acc, l: any) => acc + (safeNum(l.valorConFactura) || safeNum(l.valorconfactura) || 0), 0);
        const totalSinFactura = lineas.reduce((acc, l: any) => acc + (safeNum(l.valorSinFactura) || safeNum(l.valorsinfactura) || 0), 0);
        const totalGastos = totalConFactura + totalSinFactura;

        const tableData = lineas.map((l, idx) => {
            const f = new Date(l.fecha);
            const fStr = isNaN(f.getTime()) ? '' : `${f.getDate().toString().padStart(2, '0')}/${(f.getMonth() + 1).toString().padStart(2, '0')}/${f.getFullYear().toString().slice(-2)}`;
            const vcf = safeNum((l as any).valorConFactura) || safeNum((l as any).valorconfactura) || 0;
            const vsf = safeNum((l as any).valorSinFactura) || safeNum((l as any).valorsinfactura) || 0;

            return [
                (idx + 1).toString(),
                l.observaciones || '',
                fStr,
                l.ot || '',
                l.cc || '',
                l.scc || '',
                vcf > 0 ? vcf.toLocaleString('es-CO') : '',
                vsf > 0 ? vsf.toLocaleString('es-CO') : ''
            ];
        });

        while (tableData.length < 15) {
            tableData.push(['', '', '', '', '', '', '', '']);
        }

        autoTable(doc, {
            startY: infoY + infoH + 1,
            margin: { left: margin, right: margin },
            head: [[
                { content: 'ID', styles: { halign: 'center' } },
                { content: 'DESCRIPCIÓN', styles: { halign: 'center' } },
                { content: 'FECHA', styles: { halign: 'center' } },
                { content: 'OT / OS', styles: { halign: 'center' } },
                { content: 'C. COSTO', styles: { halign: 'center' } },
                { content: 'S. CENTRO', styles: { halign: 'center' } },
                { content: 'CON FACTURA', styles: { halign: 'center' } },
                { content: 'SIN FACTURA', styles: { halign: 'center' } }
            ]],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: navyBlue as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 7, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 15, halign: 'center' },
                6: { cellWidth: 22, halign: 'right' },
                7: { cellWidth: 22, halign: 'right' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 150;

        // Subtotales al final de la tabla
        doc.setFillColor(245, 245, 245);
        doc.rect(pageWidth - margin - 44, finalY, 22, 5, 'F');
        doc.rect(pageWidth - margin - 22, finalY, 22, 5, 'F');
        doc.rect(pageWidth - margin - 44, finalY, 22, 5);
        doc.rect(pageWidth - margin - 22, finalY, 22, 5);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`$ ${totalConFactura.toLocaleString('es-CO')}`, pageWidth - margin - 23, finalY + 3.8, { align: 'right' });
        doc.text(`$ ${totalSinFactura.toLocaleString('es-CO')}`, pageWidth - margin - 1, finalY + 3.8, { align: 'right' });

        // === TOTAL Y FIRMAS ===
        const summY = finalY + 8;
        doc.rect(margin, summY, 120, 15);
        doc.setFillColor(235, 235, 235);
        doc.rect(margin, summY, 40, 5, 'F');
        doc.rect(margin, summY, 40, 5);
        doc.text('FIRMA VIAJERO', margin + 5, summY + 3.5);

        const totalX = margin + 120;
        doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2]);
        doc.rect(totalX, summY, pageWidth - margin - totalX, 5, 'F');
        doc.rect(totalX, summY, pageWidth - margin - totalX, 5);
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL GASTOS', totalX + 1, summY + 3.5);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text(`$ ${totalGastos.toLocaleString('es-CO')}`, pageWidth - margin - 2, summY + 3.8, { align: 'right' });

        let nextY = summY + 18;
        if (observacionesGral && observacionesGral.trim() !== '') {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVACIONES:', margin, nextY);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(observacionesGral, 115);
            doc.text(lines, margin, nextY + 4);
            nextY += (lines.length * 4) + 6;
        }

        doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2]);
        doc.rect(margin, nextY, pageWidth - margin * 2, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Espacio para ser usado por el responsable de verificación del reporte', margin + (pageWidth - margin * 2) / 2, nextY + 3.5, { align: 'center' });

        const aprY = nextY + 7;
        doc.rect(margin, aprY, 120, 10);
        doc.setFillColor(235, 235, 235);
        doc.rect(margin, aprY, 40, 5, 'F');
        doc.rect(margin, aprY, 40, 5);
        doc.setTextColor(0, 0, 0);
        doc.text('APROBACIÓN GENERAL', margin + 5, aprY + 3.5);

        doc.addImage(watermarkBase64, 'PNG', pageWidth - 55, pageHeight - 12, 45, 6);
        doc.save(`Reporte_Gastos_${user.cedula || 'usuario'}.pdf`);

    } catch (error) {
        console.error('Error generando PDF:', error);
        throw new Error('No se pudo generar el PDF');
    }
};
