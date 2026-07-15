import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PlanillaManualPDFProps {
    addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const usePlanillaManualPDF = ({ addNotification }: PlanillaManualPDFProps) => {

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

    const handleGeneratePlanilla0 = async () => {
        try {
            const doc = new jsPDF();
            const date = new Date().toLocaleDateString();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Cargar imágenes corporativas
            const logoBase64 = await loadImage('/images/logo-refridcol.png').catch(() => null);
            const watermarkBase64 = await loadImage('/images/watermark-erp.png').catch(() => null);

            // Márgenes (Ultra-tight per user request)
            const marginX = 5;
            const headerY = 7;

            // Función para dibujar el encabezado en cada página
            const drawHeader = () => {
                // 1. Logo
                if (logoBase64) {
                    doc.addImage(logoBase64, 'PNG', marginX, headerY, 32, 8);
                }

                // 2. Título (Ajustado para evitar solapamiento)
                doc.setFontSize(11);
                doc.setTextColor(30, 30, 30);
                doc.setFont('helvetica', 'bold');
                doc.text("PLANILLA DE CONTEO MANUAL (PLANILLA 0)", marginX + 38, headerY + 3);

                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100);
                doc.text(`INVENTARIO 2026 | ${date} | FORMATO PARA ÍTEMS NO IDENTIFICADOS`, marginX + 38, headerY + 7);

                // 3. Campo para Nombre del Responsable (Reubicado a la derecha sin solapar)
                doc.setFontSize(8);
                doc.setTextColor(50, 50, 50);
                doc.setFont('helvetica', 'bold');
                doc.text("RESPONSABLE:", pageWidth - marginX - 65, headerY + 3.5);

                doc.setDrawColor(100); // Línea más oscura
                doc.setLineWidth(0.3);
                doc.line(pageWidth - marginX - 43, headerY + 3.5, pageWidth - marginX, headerY + 3.5);

                doc.setFontSize(6);
                doc.setFont('helvetica', 'italic');
                doc.text("(Nombre y Firma)", pageWidth - marginX - 21.5, headerY + 6.5, { align: 'center' });

                // 4. Separador
                doc.setDrawColor(200);
                doc.setLineWidth(0.2);
                doc.line(marginX, headerY + 12, pageWidth - marginX, headerY + 12);
            };

            // Generar 22 filas vacías para asegurar que quepa en una sola hoja (v4.3)
            const emptyRows = Array.from({ length: 22 }, () => ["", "", "", "", "", "", "", "", ""]);

            autoTable(doc, {
                startY: headerY + 15,
                head: [['BDG', 'BLQ', 'EST', 'NIV', 'CÓDIGO', 'DESCRIPCIÓN', 'UND', 'CANTIDAD', 'OBSERVACIONES']],
                body: emptyRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 32, 96],
                    textColor: [255, 255, 255],
                    fontSize: 8.5,
                    fontStyle: 'bold',
                    halign: 'center',
                    cellPadding: 2,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.2
                },
                bodyStyles: {
                    fontSize: 9.5,
                    cellPadding: 3, // Reducido ligeramente para ganar espacio
                    textColor: [0, 0, 0],
                    minCellHeight: 9.5, // Reducido para asegurar 1 sola página
                    lineColor: [50, 50, 50],
                    lineWidth: 0.3
                },
                columnStyles: {
                    0: { cellWidth: 12 }, // BDG
                    1: { cellWidth: 12 }, // BLQ
                    2: { cellWidth: 16 }, // EST
                    3: { cellWidth: 18 }, // NIV
                    4: { cellWidth: 25 }, // CÓDIGO
                    5: { cellWidth: 'auto' }, // DESCRIPCIÓN
                    6: { cellWidth: 10 }, // UND
                    7: { cellWidth: 22 }, // CANTIDAD
                    8: { cellWidth: 35 }  // OBSERVACIONES
                },
                margin: { top: headerY + 18, left: marginX, right: marginX, bottom: 10 },
                didDrawPage: (data) => {
                    drawHeader();
                    if (watermarkBase64) {
                        doc.addImage(watermarkBase64, 'PNG', pageWidth - marginX - 35, pageHeight - 8, 30, 4);
                    }
                }
            });

            // Sin bucle de numeración (fijado a Página 1)
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`Hoja Única de Conteo Manual`, pageWidth / 2, pageHeight - 4, { align: 'center' });

            doc.save(`Planilla_0_Manual_Inventario_2026.pdf`);
            addNotification('success', "Planilla 0 (Manual) generada con éxito.");

        } catch (error) {
            console.error('Error al generar PDF Manual:', error);
            addNotification('error', "No se pudo generar la planilla manual.");
        }
    };

    return { handleGeneratePlanilla0 };
};
