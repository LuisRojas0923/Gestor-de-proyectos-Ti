import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';

export const useInventarioData = (addNotification: any) => {
    const [dataC1, setDataC1] = useState<any[]>([]);
    const [dataC2, setDataC2] = useState<any[]>([]);
    const [progresoC1, setProgresoC1] = useState(0);
    const [conteoActivo, setConteoActivo] = useState<'C1' | 'C2'>(() => {
        const saved = localStorage.getItem('inventario_conteo_activo');
        return (saved === 'C1' || saved === 'C2') ? saved : 'C1';
    });
    const [isLoading, setIsLoading] = useState(false);
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string[] }>({});
    const [changes, setChanges] = useState<{ [key: number]: { cant: string, obs: string } }>(() => {
        const saved = localStorage.getItem('inventario_changes');
        return saved ? JSON.parse(saved) : {};
    });
    const [isSigning, setIsSigning] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());
    
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    // La ronda actual depende de qué tab esté activa
    const ronda = useMemo(() => conteoActivo === 'C1' ? 1 : 2, [conteoActivo]);

    // Los ítems a mostrar dependen del conteo seleccionado
    const items = useMemo(() => conteoActivo === 'C1' ? dataC1 : dataC2, [conteoActivo, dataC1, dataC2]);

    const puedeEditarC2 = useMemo(() => progresoC1 === 100, [progresoC1]);

    useEffect(() => {
        localStorage.setItem('inventario_changes', JSON.stringify(changes));
    }, [changes]);

    useEffect(() => {
        localStorage.setItem('inventario_conteo_activo', conteoActivo);
    }, [conteoActivo]);
    
    // Sincronizar ronda vista con el backend para el administrador
    useEffect(() => {
        const syncRonda = async () => {
            try {
                await axios.patch(`${API_CONFIG.BASE_URL}/inventario/ronda-vista`, null, { 
                    params: { ronda },
                    headers 
                });
            } catch (e) {
                console.warn("No se pudo sincronizar la ronda vista", e);
            }
        };
        syncRonda();
    }, [ronda]);

    useEffect(() => {
        if (items.length > 0) {
            const newErrors = new Set<number>();
            Object.entries(changes).forEach(([id, data]) => {
                const itemId = Number(id);
                const item = items.find(i => i.id === itemId);
                if (item && data.cant === '' && item[`user_c${ronda}`]) {
                    newErrors.add(itemId);
                }
            });
            setValidationErrors(newErrors);
        }
    }, [items, changes, ronda]);

    useEffect(() => {
        fetchAsignaciones();
    }, []);

    const fetchAsignaciones = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_CONFIG.BASE_URL}/inventario/mis-asignaciones`, { headers });
            const data = response.data;
            
            if (data && data.items_c1) {
                setDataC1(data.items_c1);
                setDataC2(data.items_c2 || []);
                setProgresoC1(data.progreso_c1 || 0);
                
                // La ronda se maneja localmente via localStorage para persistencia inmediata
                // El backend se actualiza via useEffect cuando 'ronda' cambia para monitoreo administrativo
            } else if (Array.isArray(data)) {
                // Fallback por si el backend aún no ha recargado los cambios del servicio
                setDataC1(data);
                setDataC2([]);
            }
        } catch (error) {
            console.error("Error fetching asignaciones", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (id: number, field: 'cant' | 'obs', value: string) => {
        const item = items.find(i => i.id === id);
        if (field === 'cant') {
            const hasInitialValue = (item?.[`user_c${ronda}`]) || (changes[id]?.cant !== undefined && changes[id]?.cant !== '');
            if (value === '' && hasInitialValue) {
                setValidationErrors(prev => new Set(prev).add(id));
                addNotification('warning', `El código ${item?.codigo} no puede quedar vacío. Use 0 si es necesario.`);
            } else if (value !== '') {
                setValidationErrors(prev => {
                    if (!prev.has(id)) return prev;
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }

        setChanges(prev => {
            const userFlag = item?.[`user_c${ronda}`];
            const baseCant = userFlag ? String(item?.[`cant_c${ronda}`] ?? '') : '';
            const baseObs = String(item?.[`obs_c${ronda}`] || '');

            return {
                ...prev,
                [id]: {
                    ...(prev[id] || { cant: baseCant, obs: baseObs }),
                    [field]: value
                }
            };
        });
    };

    const handleSignAll = async () => {
        const itemsToSave = Object.entries(changes).map(([id, data]) => {
            const itemId = Number(id);
            // Solo guardar ítems que pertenecen al conteo actual
            const belongsToCount = items.some(i => i.id === itemId);
            if (!belongsToCount) return null;

            return {
                id: itemId,
                cantidad: data.cant === '' ? null : Number(data.cant),
                observaciones: (data.obs || "").trim(),
                ronda
            };
        }).filter(item => item !== null && item.cantidad !== null);

        if (itemsToSave.length === 0) {
            addNotification('warning', "No hay cambios pendientes para firmar en este conteo.");
            return;
        }

        if (validationErrors.size > 0) {
            addNotification('error', "Corrija los campos resaltados en rojo antes de guardar.");
            return;
        }

        setIsSigning(true);
        try {
            await Promise.all(itemsToSave.map(payload =>
                axios.post(`${API_CONFIG.BASE_URL}/inventario/guardar-conteo`, payload, { headers })
            ));
            addNotification('success', "¡Conteo firmado y guardado exitosamente!");
            setChanges({});
            await fetchAsignaciones();
        } catch (error) {
            addNotification('error', "Error al firmar el conteo. Por favor verifique su conexión.");
        } finally {
            setIsSigning(false);
        }
    };

    const handleSaveSingle = async (itemId: number) => {
        if (validationErrors.has(itemId)) {
            addNotification('error', "El valor no puede estar vacío. Use 0 si el conteo es nulo.");
            return;
        }

        const data = changes[itemId];
        if (!data || data.cant === '') {
            addNotification('warning', "Ingrese una cantidad antes de guardar.");
            return;
        }
        setIsSigning(true);
        try {
            await axios.post(`${API_CONFIG.BASE_URL}/inventario/guardar-conteo`, {
                id: itemId,
                cantidad: Number(data.cant),
                observaciones: (data.obs || "").trim(),
                ronda
            }, { headers });
            const updated = { ...changes };
            delete updated[itemId];
            setChanges(updated);
            addNotification('success', "Registro guardado correctamente.");
            await fetchAsignaciones();
        } catch (error) {
            addNotification('error', "Error al guardar. Verifique su conexión.");
        } finally {
            setIsSigning(false);
        }
    };

    const filteredItems = useMemo(() => {
        const result = items.filter(item => {
            return Object.entries(columnFilters).every(([col, selectedValues]) => {
                if (!selectedValues || selectedValues.length === 0) return true;
                const itemValue = String(item[col as keyof any] || '');
                return selectedValues.includes(itemValue);
            });
        });

        return result.sort((a, b) => {
            const compare = (valA: any, valB: any) =>
                String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true, sensitivity: 'base' });

            return (
                compare(a.bodega, b.bodega) ||
                compare(a.bloque, b.bloque) ||
                compare(a.estante, b.estante) ||
                compare(a.nivel, b.nivel) ||
                compare(a.codigo, b.codigo)
            );
        });
    }, [items, columnFilters]);

    const getUniqueValues = (col: string) => {
        const unique = Array.from(new Set(items.map(item => String(item[col as keyof any] || ''))))
            .filter(Boolean)
            .sort();
        return unique.map(val => ({ value: val, label: val }));
    };

    const handleColumnFilterChange = (col: string, values: string[]) => {
        setColumnFilters(prev => ({ ...prev, [col]: values }));
    };

    const hasActiveFilters = useMemo(() => 
        Object.values(columnFilters).some(v => v && v.length > 0)
    , [columnFilters]);

    const clearAllFilters = () => setColumnFilters({});

    const stats = useMemo(() => {
        const total = items.length;
        const counted = items.filter(item => {
            const hasSavedValue = !!item[`user_c${ronda}`];
            const hasPendingValue = changes[item.id]?.cant !== undefined && changes[item.id]?.cant !== '';
            return hasSavedValue || hasPendingValue;
        }).length;

        const estantes = new Set(items.map(item => item.estante)).size;

        return {
            total,
            counted,
            pending: total - counted,
            percent: total > 0 ? Math.round((counted / total) * 100) : 0,
            estantes
        };
    }, [items, changes, ronda]);

    return {
        items,
        isLoading,
        ronda,
        conteoActivo,
        setConteoActivo,
        progresoC1,
        puedeEditarC2,
        changes,
        isSigning,
        validationErrors,
        filteredItems,
        handleInputChange,
        handleSignAll,
        handleSaveSingle,
        columnFilters,
        getUniqueValues,
        handleColumnFilterChange,
        hasActiveFilters,
        clearAllFilters,
        stats
    };
};

