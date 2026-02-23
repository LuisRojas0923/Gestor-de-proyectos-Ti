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
    categoria: string;
}

interface User {
    name?: string;
    cedula?: string;
    id?: string;
    sede?: string;
}

/**
 * Genera y descarga el PDF del Reporte de Gastos de Viáticos.
 * Iguala visualmente el diseño histórico del ERP (Landscape).
 */
export const generateExpenseReportPDF = async (
    reporteId: string,
    user: User,
    lineas: ExpenseLine[],
    observacionesGral: string = ''
): Promise<void> => {
    // Formato vertical (portrait)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
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

        const margin = 5; // Estrechado para respirar mejor en vertical
        const navyBlue = [0, 32, 96] as [number, number, number]; // #002060

        doc.setLineWidth(0.4);
        doc.setDrawColor(navyBlue[0], navyBlue[1], navyBlue[2]); // Bordes azules oscuros como en Java

        // ==========================================
        // 1. ENCABEZADO PRINCIPAL (HEADER)
        // ==========================================
        const headerY = margin;
        const headerHeight = 22;

        // Caja Logo (Izquierda)
        doc.rect(margin, headerY, 60, headerHeight);
        doc.addImage(logoBase64, 'PNG', margin + 3, headerY + 2, 54, 18);

        // Caja Título (Centro)
        const titleX = margin + 60;
        const titleW = pageWidth - margin * 2 - 100; // Ajustado para paredes compartidas
        doc.rect(titleX, headerY, titleW, headerHeight);
        doc.setFontSize(14);
        doc.setTextColor(navyBlue[0], navyBlue[1], navyBlue[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE GASTOS DE VIATICOS', titleX + titleW / 2, headerY + 13, { align: 'center' });

        // Caja Radicado (Derecha)
        const radX = titleX + titleW;
        const radW = 40;
        doc.rect(radX, headerY, radW, headerHeight);

        // Fondo azul para la palabra RADICADO
        doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2]);
        // Centrado horizontalmente y con márgenes para dar efecto de "cajita interior"
        doc.rect(radX + 3, headerY + 2, radW - 6, 6, 'FD'); // FD dibuja borde y fondo
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('RADICADO', radX + radW / 2, headerY + 6.5, { align: 'center' });

        // Caja interior blanca con borde para el ID
        doc.setFillColor(255, 255, 255);
        doc.rect(radX + 3, headerY + 8, radW - 6, 9, 'FD');
        // ID del Radicado
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(reporteId || 'SIN RADICAR', radX + radW / 2, headerY + 14.5, { align: 'center' });


        // ==========================================
        // 2. TABLA 1: DATOS DEL USUARIO Y TOTALES
        // ==========================================
        const safeNum = (val: any) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const clean = String(val).replace(/[^\d.-]/g, '');
            return parseFloat(clean) || 0;
        };

        const totalConFactura = lineas.reduce((acc, l: any) => acc + (safeNum(l.valorConFactura) || safeNum(l.valorconfactura) || 0), 0);
        const totalSinFactura = lineas.reduce((acc, l: any) => acc + (safeNum(l.valorSinFactura) || safeNum(l.valorsinfactura) || 0), 0);
        const totalGastos = totalConFactura + totalSinFactura;

        const dateObj = new Date();
        const currentDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;

        const userInfoY = headerY + headerHeight + 5;

        autoTable(doc, {
            startY: userInfoY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            headStyles: { fillColor: navyBlue, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            bodyStyles: { halign: 'center', textColor: 0, fontSize: 9, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            head: [['FECHA ENTREGA', 'NOMBRE', 'CEDULA', 'TOTAL SOLICITADO', 'TOTAL APROBADO']],
            body: [[
                { content: currentDate, styles: { fillColor: [240, 240, 240] as [number, number, number] } },
                { content: (user.name || '').toUpperCase(), styles: { fillColor: [240, 240, 240] as [number, number, number] } },
                { content: user.cedula || user.id || '', styles: { fillColor: [240, 240, 240] as [number, number, number] } },
                { content: `$   ${totalGastos.toLocaleString('es-CO')}`, styles: { fillColor: [240, 240, 240] as [number, number, number] } },
                { content: `$   ${totalGastos.toLocaleString('es-CO')}`, styles: { fillColor: [240, 240, 240] as [number, number, number] } } // Asumimos aprobado = solicitado en esta versión
            ]],
            columnStyles: {
                0: { cellWidth: 28 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 28 },
                3: { cellWidth: 32, halign: 'right' },
                4: { cellWidth: 32, halign: 'right' }
            }
        });


        // ==========================================
        // 3. TABLAS DE AGRUPACIÓN (3 Lado a Lado Unidas)
        // ==========================================
        const aggY = (doc as any).lastAutoTable.finalY + 3; // Menor espacio debajo


        // 3a. Agrupar por OT
        const otMap = new Map<string, number>();
        // 3b. Agrupar por C.Costo
        const ccMap = new Map<string, number>();
        // 3c. Agrupar por Rubro (Categoría)
        const rubroMap = new Map<string, number>();

        lineas.forEach(l => {
            const vTotal = (safeNum((l as any).valorConFactura) || safeNum((l as any).valorconfactura) || 0) +
                (safeNum((l as any).valorSinFactura) || safeNum((l as any).valorsinfactura) || 0);

            if (l.ot) {
                otMap.set(l.ot, (otMap.get(l.ot) || 0) + vTotal);
            }

            const ccKey = `${l.cc || ''}-${l.scc || ''}`;
            if (ccKey !== '-') {
                ccMap.set(ccKey, (ccMap.get(ccKey) || 0) + vTotal);
            }

            const catKey = l.categoria || 'Sin Categoría';
            rubroMap.set(catKey, (rubroMap.get(catKey) || 0) + vTotal);
        });

        // Convertir a arrays para jspdf-autotable y ordenar (ascendente/alfabético)
        const sortedOT = Array.from(otMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
        const otData = sortedOT.map(([k, v]) => [
            { content: k, styles: { fillColor: [240, 240, 240] as [number, number, number] } },
            `$   ${v.toLocaleString('es-CO')}`
        ]);
        const totalOT = Array.from(otMap.values()).reduce((a, b) => a + b, 0);

        const sortedCC = Array.from(ccMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
        const ccData = sortedCC.map(([k, v]) => [
            { content: k, styles: { fillColor: [240, 240, 240] as [number, number, number] } },
            `$   ${v.toLocaleString('es-CO')}`
        ]);
        const totalCC = Array.from(ccMap.values()).reduce((a, b) => a + b, 0);

        const sortedRubro = Array.from(rubroMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
        const rubroData = sortedRubro.map(([k, v]) => [
            { content: k + ':', styles: { fillColor: [240, 240, 240] as [number, number, number] } },
            `$   ${v.toLocaleString('es-CO')}`,
            `$   ${v.toLocaleString('es-CO')}`
        ]);
        const totalRubro = Array.from(rubroMap.values()).reduce((a, b) => a + b, 0);

        // --- LÓGICA DE RELLENO (PADDING) ---
        // Buscamos cuál de las 3 tablas tiene más filas de datos (sin contar el TOTAL)
        const maxRows = Math.max(otData.length, ccData.length, rubroData.length);

        // Rellenamos las tablas que tengan menos filas con "filas fantasma"
        while (otData.length < maxRows) {
            otData.push([{ content: '', styles: { fillColor: [240, 240, 240] as [number, number, number] } }, ''] as any);
        }
        while (ccData.length < maxRows) {
            ccData.push([{ content: '', styles: { fillColor: [240, 240, 240] as [number, number, number] } }, ''] as any);
        }
        while (rubroData.length < maxRows) {
            rubroData.push([{ content: '', styles: { fillColor: [240, 240, 240] as [number, number, number] } }, '', ''] as any);
        }

        // --- AHORA SÍ AGREGAMOS LA FILA DE TOTALES ---
        otData.push([
            { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number] } },
            { content: `$   ${totalOT.toLocaleString('es-CO')}`, styles: { fontStyle: 'bold', textColor: [0, 0, 0] as [number, number, number] } }
        ] as any);

        ccData.push([
            { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number] } },
            { content: `$   ${totalCC.toLocaleString('es-CO')}`, styles: { fontStyle: 'bold', textColor: [0, 0, 0] as [number, number, number] } }
        ] as any);

        rubroData.push([
            { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number] } },
            { content: `$   ${totalRubro.toLocaleString('es-CO')}`, styles: { fontStyle: 'bold', textColor: [0, 0, 0] as [number, number, number] } },
            { content: `$   ${totalRubro.toLocaleString('es-CO')}`, styles: { fontStyle: 'bold', textColor: [0, 0, 0] as [number, number, number] } }
        ] as any);

        // Anchos y espaciado exactos para que las tres tablas se toquen. (Portrait respect)
        const leftBoxW = 62;
        const middleBoxW = 62;
        const rightBoxW = pageWidth - margin * 2 - leftBoxW - middleBoxW;

        // Tabla OT (Izquierda)
        autoTable(doc, {
            startY: aggY,
            margin: { left: margin, right: margin + middleBoxW + rightBoxW },
            theme: 'grid',
            headStyles: { fillColor: navyBlue, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 8, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            bodyStyles: { fontSize: 8, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            head: [['OT', 'VALOR TOTAL']],
            body: otData,
            columnStyles: { 0: { halign: 'center', cellWidth: 31 }, 1: { halign: 'right', cellWidth: 31 } }
        });

        const finalOTY = (doc as any).lastAutoTable.finalY;

        // Tabla C.Costo (Centro)
        autoTable(doc, {
            startY: aggY,
            margin: { left: margin + leftBoxW, right: margin + rightBoxW },
            theme: 'grid',
            headStyles: { fillColor: navyBlue, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 8, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            bodyStyles: { fontSize: 8, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            head: [['C.COSTO', 'VALOR TOTAL']],
            body: ccData,
            columnStyles: { 0: { halign: 'center', cellWidth: 31 }, 1: { halign: 'right', cellWidth: 31 } }
        });

        const finalCCY = (doc as any).lastAutoTable.finalY;

        // Tabla Rubro (Derecha)
        autoTable(doc, {
            startY: aggY,
            margin: { left: margin + leftBoxW + middleBoxW, right: margin },
            theme: 'grid',
            headStyles: { fillColor: navyBlue, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 8, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            bodyStyles: { fontSize: 8, cellPadding: 1, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            head: [['RUBRO', 'SOLICITADO', 'APROBADO']],
            body: rubroData,
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' } }
        });

        const finalRubroY = (doc as any).lastAutoTable.finalY;

        // ==========================================
        // 4. TABLA DETALLADA PRINCIPAL
        // ==========================================
        const detailY = Math.max(finalOTY, finalCCY, finalRubroY) + 3;

        const tableData = lineas.map(l => {
            const vcf = safeNum((l as any).valorConFactura) || safeNum((l as any).valorconfactura) || 0;
            const vsf = safeNum((l as any).valorSinFactura) || safeNum((l as any).valorsinfactura) || 0;
            const tot = vcf + vsf;

            // Arreglar timezone issue de la DB
            let fStr = Object(l).fechaaplicacion || l.fecha || '';
            if (fStr.includes('T')) fStr = fStr.split('T')[0];

            // Descripción: Rubro + Observación. (En la imagen es Alimentación: Prueba)
            const desc = l.categoria ? `${l.categoria}: ${l.observaciones || ''}` : l.observaciones || '';

            return [
                fStr,
                desc,
                l.ot || '',
                l.cc || '',
                l.scc || '',
                `$   ${vcf.toLocaleString('es-CO')}`,
                `$   ${vsf.toLocaleString('es-CO')}`,
                { content: `$   ${tot.toLocaleString('es-CO')}`, styles: { fontStyle: 'bold' } }
            ];
        });

        // Fila de TOTALES final
        tableData.push([
            { content: 'TOTALES', colSpan: 5, styles: { halign: 'center', fillColor: navyBlue, textColor: 255, fontStyle: 'bold', lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 } },
            { content: `$   ${totalConFactura.toLocaleString('es-CO')}`, styles: { halign: 'right', fillColor: navyBlue, textColor: 255, fontStyle: 'bold', lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 } },
            { content: `$   ${totalSinFactura.toLocaleString('es-CO')}`, styles: { halign: 'right', fillColor: navyBlue, textColor: 255, fontStyle: 'bold', lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 } },
            { content: `$   ${totalGastos.toLocaleString('es-CO')}`, styles: { halign: 'right', fillColor: navyBlue, textColor: 255, fontStyle: 'bold', lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 } }
        ] as any);

        autoTable(doc, {
            startY: detailY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            headStyles: { fillColor: navyBlue, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            bodyStyles: { fontSize: 8, cellPadding: 2, textColor: 0, lineColor: [200, 200, 200] as [number, number, number], lineWidth: 0.2 },
            alternateRowStyles: { fillColor: [240, 240, 240] as [number, number, number] },
            head: [[
                'FECHA\nREAL',
                'DESCRIPCION',
                'OT',
                'C. COSTO',
                'S.C.\nCOSTO',
                'VALOR CON\nFACTURA',
                'VALOR SIN\nFACTURA',
                'TOTAL'
            ]],
            body: tableData,
            columnStyles: {
                0: { cellWidth: 18, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 12, halign: 'center' },
                5: { cellWidth: 25, halign: 'right' },
                6: { cellWidth: 25, halign: 'right' },
                7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
            }
        });

        // ==========================================
        // 5. MARCA DE AGUA (WATERMARK) EN CADA PÁGINA
        // ==========================================
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.addImage(watermarkBase64, 'PNG', pageWidth - 55, pageHeight - 12, 45, 6);
        }

        doc.save(`Reporte_Gastos_${reporteId || user.cedula || 'usuario'}.pdf`);

    } catch (error) {
        console.error('Error generando PDF:', error);
        throw new Error('No se pudo generar el PDF');
    }
};
