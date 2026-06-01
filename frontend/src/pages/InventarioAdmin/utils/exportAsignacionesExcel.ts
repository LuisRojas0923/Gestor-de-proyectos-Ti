import * as XLSX from 'xlsx';

export const exportAsignacionesExcelUtils = (inventoryList: any[], asignaciones: any[]) => {
    // Agrupar por bodega y dividir ítems entre parejas (misma lógica del backend)
    const exportData: any[] = [];
    const bodegasUnicas = Array.from(new Set(inventoryList.map(i => i.bodega)));

    for (const bodega of bodegasUnicas) {
        // Ítems de esta bodega ordenados geográficamente
        const itemsBodega = inventoryList
            .filter(i => i.bodega === bodega)
            .sort((a, b) => {
                if ((a.bloque || '') !== (b.bloque || '')) return (a.bloque || '').localeCompare(b.bloque || '', undefined, { numeric: true });
                if ((a.estante || '') !== (b.estante || '')) return (a.estante || '').localeCompare(b.estante || '', undefined, { numeric: true });
                if ((a.nivel || '') !== (b.nivel || '')) return (a.nivel || '').localeCompare(b.nivel || '', undefined, { numeric: true });
                return (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true });
            });

        // Parejas únicas en esta bodega
        const parejasEnBodega = Array.from(new Set(
            asignaciones.filter(a => a.bodega === bodega).map(a => a.numero_pareja)
        )).sort((a, b) => a - b);

        const numParejas = parejasEnBodega.length;
        const chunkSize = numParejas > 0 ? Math.ceil(itemsBodega.length / numParejas) : 0;

        itemsBodega.forEach((item, idx) => {
            let parejaAsignada = 'Sin Asignar';
            let titular = '';
            let companero = '';

            if (numParejas > 0) {
                const parejaIdx = Math.min(Math.floor(idx / chunkSize), numParejas - 1);
                const numPareja = parejasEnBodega[parejaIdx];
                const asig = asignaciones.find(a => a.bodega === bodega && a.numero_pareja === numPareja);
                if (asig) {
                    parejaAsignada = `Pareja ${numPareja}`;
                    titular = asig.nombre;
                    companero = asig.nombre_companero || '';
                }
            }

            exportData.push({
                "Bodega": item.bodega,
                "Bloque": item.bloque || '',
                "Estante": item.estante || '',
                "Nivel": item.nivel || '',
                "Código Ítem": item.codigo,
                "Descripción": item.descripcion,
                "Nro Pareja": parejaAsignada,
                "Titular": titular,
                "Compañero": companero
            });
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, 
        { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 30 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asignaciones");
    XLSX.writeFile(workbook, "Reporte_Asignaciones_Planta.xlsx");
};
