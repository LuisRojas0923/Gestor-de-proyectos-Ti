import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventarioPDFProps {
    filteredItems: any[];
    ronda: number;
    numeroPareja?: number | null;
    nombreCompanero?: string | null;
    cedulaCompanero?: string | null;
    addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const useInventarioPDF = ({ filteredItems, ronda, addNotification, numeroPareja, nombreCompanero, cedulaCompanero }: InventarioPDFProps) => {
    
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

    const handleGeneratePDF = async () => {
        if (filteredItems.length === 0) {
            addNotification('warning', "No hay ítems para generar el PDF.");
            return;
        }

        try {
            const doc = new jsPDF();
            const date = new Date().toLocaleDateString();
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Cargar imágenes corporativas
            const logoBase64 = await loadImage('/images/logo-refridcol.png').catch(() => null);
            const watermarkBase64 = await loadImage('/images/watermark-erp.png').catch(() => null);

            // Márgenes y Layout (Ultra-tight per user request)
            const marginX = 5;
            const headerY = 7;

            const userNombre = (userData?.nombre || userData?.name || 'Usuario').toUpperCase();
            const userCedula = userData?.cedula || userData?.nrocedula || userData?.id || '---';

            // Función para dibujar el encabezado en cada página
            const drawHeader = () => {
                // 1. Logo (Left)
                if (logoBase64) {
                    doc.addImage(logoBase64, 'PNG', marginX, headerY, 32, 8);
                }

                // 2. Title Section (Next to logo)
                doc.setFontSize(12);
                doc.setTextColor(30, 30, 30);
                doc.setFont('helvetica', 'bold');
                doc.text("PLANILLA DE CONTEO", marginX + 38, headerY + 4);
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(120);
                doc.text(`INVENTARIO 2026 | ${date} | ITEMS: ${filteredItems.length}`, marginX + 38, headerY + 8);

                // 3. User Identity (Aligned Pair Layout)
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 30);
                
                const rightX = pageWidth - marginX - 26;
                const labelPareja = numeroPareja ? `PAREJA ${numeroPareja}: ` : 'OPERARIOS: ';
                
                // Línea 1: Usuario Actual
                doc.text(`${labelPareja}${userCedula} ${userNombre}`, rightX, headerY + 4, { align: 'right' });
                
                // Línea 2: Compañero (si existe)
                if (nombreCompanero) {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100);
                    doc.text(`${cedulaCompanero || '---'} ${nombreCompanero.toUpperCase()}`, rightX, headerY + 8, { align: 'right' });
                }

                // 4. Ronda Pill (Far Right)
                doc.setDrawColor(200);
                doc.setFillColor(245, 245, 245);
                doc.roundedRect(pageWidth - marginX - 20, headerY, 20, 10, 2, 2, 'FD');
                doc.setTextColor(0, 32, 96);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`C${ronda}`, pageWidth - marginX - 10, headerY + 7, { align: 'center' });
                
                // 5. Separator Line
                doc.setDrawColor(240);
                doc.setLineWidth(0.2);
                doc.line(marginX, headerY + 14, pageWidth - marginX, headerY + 14);
            };

            const tableData = filteredItems.map(item => [
                item.bodega,
                item.bloque,
                item.estante,
                item.nivel,
                item.codigo,
                item.descripcion,
                item.unidad,
                "", // Espacio para cantidad física
                ""  // Observaciones en blanco para conteo físico
            ]);

            autoTable(doc, {
                startY: headerY + 18,
                head: [['BDG', 'BLQ', 'EST', 'NIV', 'CÓDIGO', 'DESCRIPCIÓN', 'UND', 'CANTIDAD', 'OBSERVACIONES']],
                body: tableData,
                theme: 'grid',
                headStyles: { 
                    fillColor: [0, 32, 96], 
                    textColor: [255, 255, 255], 
                    fontSize: 8.5, 
                    fontStyle: 'bold', 
                    halign: 'center',
                    cellPadding: 1.5
                },
                bodyStyles: { fontSize: 10, cellPadding: 1, textColor: [40, 40, 40] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' }, // BDG
                    1: { cellWidth: 10, halign: 'center' }, // BLQ
                    2: { cellWidth: 16, halign: 'center' }, // EST (Fit 'CILINDRO' at F12)
                    3: { cellWidth: 18, halign: 'center' }, // NIV
                    4: { cellWidth: 20, halign: 'center' }, // CÓDIGO
                    5: { cellWidth: 'auto' },               // DESCRIPCIÓN
                    6: { cellWidth: 15, halign: 'center' }, // UND (Wider)
                    7: { cellWidth: 22 },                   // CANTIDAD
                    8: { cellWidth: 35 }                    // OBSERVACIONES
                },
                margin: { top: headerY + 18, left: marginX, right: marginX, bottom: 12 },
                didDrawPage: () => {
                    // Dibujar el encabezado en cada página
                    drawHeader();

                    if (watermarkBase64) {
                        doc.addImage(watermarkBase64, 'PNG', pageWidth - marginX - 35, pageHeight - 8, 30, 4);
                    }
                }
            });

            // Agregar numeración "Página X de Y" al finalizar
            const totalPages = (doc as any).getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
            }

            doc.save(`Planilla_Conteo_C${ronda}_${userCedula}.pdf`);
            addNotification('info', "Planilla de conteo generada con éxito.");

        } catch (error) {
            console.error('Error al generar PDF:', error);
            addNotification('error', "No se pudo generar el PDF con imágenes.");
        }
    };

    return { handleGeneratePDF };
};
