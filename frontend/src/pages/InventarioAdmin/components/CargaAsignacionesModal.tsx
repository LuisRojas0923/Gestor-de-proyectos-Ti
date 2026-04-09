import React, { useState } from 'react';
import Modal from '../../../components/molecules/Modal';
import { Callout } from '../../../components/molecules';
import { Text, Button, Textarea, Badge } from '../../../components/atoms';
import { ClipboardPaste, Play, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export interface BaseAsignacion {
    bodega: string;
    bloque: string;
    estante: string;
    niveles: string;
    itemsTotales: number;
}

export interface ParejaAsignada {
    nroPareja: string;
    bodega: string;
    titular: { cc: string; nombre: string };
    companero?: { cc: string; nombre: string };
    asignacionesGeneradas: BaseAsignacion[];
    totalItemsAAsignar: number;
}

interface CargaAsignacionesModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventoryList: any[];
    onConfirm: (parejas: ParejaAsignada[]) => void;
}

const CargaAsignacionesModal: React.FC<CargaAsignacionesModalProps> = ({ isOpen, onClose, inventoryList, onConfirm }) => {
    const [pastedData, setPastedData] = useState('');
    const [parsedParejas, setParsedParejas] = useState<ParejaAsignada[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSimulated, setIsSimulated] = useState(false);

    const handleSimulate = () => {
        setErrorMsg('');
        if (!pastedData.trim()) {
            setErrorMsg('Pega primero los datos de Excel.');
            return;
        }

        try {
            const rows = pastedData.split('\n').map(r => r.trim()).filter(r => r);
            if (rows.length < 2) {
                setErrorMsg('Formato no válido. Debe incluir los datos separados por columnas.');
                return;
            }

            // Detect headers
            const headers = rows[0].split('\t').map(h => h.trim().toUpperCase());
            let ccIdx = headers.indexOf('CC');
            let nombreIdx = headers.indexOf('NOMBRE');
            let nroParejaIdx = headers.indexOf('NRO PAREJA') !== -1 ? headers.indexOf('NRO PAREJA') : headers.findIndex(h => h.includes('PAREJA'));
            let bodegaIdx = headers.indexOf('BODEGA') !== -1 ? headers.indexOf('BODEGA') : headers.findIndex(h => h.includes('BODEGA'));

            // Fallback to strict index if headers not found correctly
            if (ccIdx === -1 || nroParejaIdx === -1) {
                ccIdx = 2;
                nombreIdx = 3;
                nroParejaIdx = 7;
                bodegaIdx = 8;
            }

            // Parse Couples
            const mapParejas = new Map<string, ParejaAsignada>();

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split('\t');
                if (cols.length < Math.max(ccIdx, nombreIdx, nroParejaIdx, bodegaIdx)) continue;

                const cc = cols[ccIdx]?.trim();
                const nombre = cols[nombreIdx]?.trim();
                const nroPareja = cols[nroParejaIdx]?.trim();
                const bodegaRaw = cols[bodegaIdx]?.trim();
                if (!cc || !nroPareja || !bodegaRaw) continue;

                const bodega = bodegaRaw.toUpperCase();

                if (!mapParejas.has(nroPareja)) {
                    mapParejas.set(nroPareja, {
                        nroPareja,
                        bodega,
                        titular: { cc, nombre },
                        asignacionesGeneradas: [],
                        totalItemsAAsignar: 0
                    });
                } else {
                    const existing = mapParejas.get(nroPareja)!;
                    if (!existing.companero) {
                        existing.companero = { cc, nombre };
                    }
                }
            }

            if (mapParejas.size === 0) {
                setErrorMsg('No se detectaron parejas válidas.');
                return;
            }

            // Distribución simplificada: solo por bodega
            const _parejas = Array.from(mapParejas.values());
            const bodegasEnPlantilla = Array.from(new Set(_parejas.map(p => p.bodega?.trim().toUpperCase())));

            bodegasEnPlantilla.forEach(b => {
                const parejasBodega = _parejas.filter(p => p.bodega?.trim().toUpperCase() === b);
                if (parejasBodega.length === 0) return;

                const totalItems = inventoryList.filter(item => item.bodega?.toString().trim().toUpperCase() === b).length;
                const itemsPerPareja = Math.ceil(totalItems / parejasBodega.length);

                parejasBodega.forEach((p, idx) => {
                    // La última pareja absorbe el residuo
                    const esUltima = idx === parejasBodega.length - 1;
                    const itemsAsignados = esUltima
                        ? totalItems - (itemsPerPareja * idx)
                        : itemsPerPareja;

                    p.asignacionesGeneradas = [{
                        bodega: b,
                        bloque: '',
                        estante: '',
                        niveles: '',
                        itemsTotales: Math.max(0, itemsAsignados)
                    }];
                    p.totalItemsAAsignar = Math.max(0, itemsAsignados);
                });
            });

            setParsedParejas(_parejas);
            setIsSimulated(true);

        } catch (err) {
            console.error(err);
            setErrorMsg('Error al procesar la plantilla. Verifica el formato e inténtalo nuevamente.');
        }
    };

    const handleConfirm = () => {
        if (!isSimulated || parsedParejas.length === 0) return;
        onConfirm(parsedParejas);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Distribución Automática de Asignaciones">
            <div className="space-y-6 animate-in fade-in">
                {!isSimulated ? (
                    <>
                        <Callout title="Instrucciones:" variant="info">
                            Copia todas las celdas de tu archivo Excel (incluyendo los títulos si es posible) y pégalas en el cuadro de abajo. El sistema agrupará a los operarios por el <Text weight="bold" as="span" color="inherit">Nro Pareja</Text> y dividirá los ítems equitativamente por bodega.
                        </Callout>
                        
                        <div className="space-y-2">
                            <Text variant="caption" weight="bold" className="uppercase text-neutral-500">Pegar datos de Excel</Text>
                            <Textarea
                                value={pastedData}
                                onChange={(e) => setPastedData(e.target.value)}
                                placeholder="ITEM &#9; AREA &#9; CC &#9; NOMBRE &#9; JEFE INMEDIATO &#9; ESPECIALIDAD &#9; DIA &#9; Nro Pareja &#9; BODEGA..."
                                className="min-h-[220px] text-xs font-mono !bg-neutral-50 dark:!bg-neutral-900 focus:!bg-white"
                            />
                        </div>

                        {errorMsg && (
                            <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-xl">
                                <AlertTriangle size={16} /> {errorMsg}
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <Button variant="primary" onClick={handleSimulate} icon={Play} className="font-bold">
                                Simular Distribución
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between bg-green-50 text-green-700 p-4 rounded-2xl border border-green-200">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={24} className="text-green-500" />
                                <div>
                                    <Text weight="bold" className="block">Lectura y Cálculo Exitoso</Text>
                                    <Text variant="caption">Se han formado {parsedParejas.length} parejas listas para asignar.</Text>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsSimulated(false)} className="text-green-700 hover:bg-green-100">
                                Volver a Pegar
                            </Button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {parsedParejas.map(p => (
                                <div key={p.nroPareja} className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-700">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="primary" className="text-xs font-bold px-2 py-0.5">Pareja {p.nroPareja}</Badge>
                                            <Badge variant="info" className="text-[10px] uppercase">Bodega {p.bodega}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <Text variant="caption" color="text-secondary" className="block text-[10px] uppercase">Ítems Asignados</Text>
                                            <Text variant="body2" weight="bold" className={`${p.totalItemsAAsignar > 150 ? 'text-amber-500' : 'text-primary-600'}`}>{p.totalItemsAAsignar}</Text>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-neutral-400">
                                            <Users size={12} />
                                            <Text variant="caption" weight="bold" className="uppercase text-[9px]">Integrantes</Text>
                                        </div>
                                        <Text variant="caption" className="text-[11px] truncate" title={p.titular.nombre}>1. {p.titular.nombre}</Text>
                                        {p.companero && (
                                            <Text variant="caption" className="text-[11px] text-neutral-500 truncate" title={p.companero.nombre}>2. {p.companero.nombre}</Text>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <Button variant="ghost" onClick={onClose} className="font-bold">Cancelar</Button>
                            <Button variant="primary" onClick={handleConfirm} icon={ClipboardPaste} className="font-bold shadow-lg shadow-primary-500/20">
                                Finalizar Asignación
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default CargaAsignacionesModal;
