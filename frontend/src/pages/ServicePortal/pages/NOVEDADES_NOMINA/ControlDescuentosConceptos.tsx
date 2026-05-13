import React, { useState, useEffect, useCallback } from 'react';
import { Title, Text, Button, Input, Badge, Checkbox } from '../../../../components/atoms';
import Modal from '../../../../components/molecules/Modal';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, Plus, Pencil, Trash2, Save, X, Hash, Tag } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

interface Concepto {
    id: number;
    nombre: string;
    concepto_nomina: string;
    activo: boolean;
    creado_en: string;
}

interface ConceptoForm {
    nombre: string;
    concepto_nomina: string;
    activo: boolean;
}

const EMPTY_FORM: ConceptoForm = { nombre: '', concepto_nomina: '111', activo: true };
const API_CONCEPTOS = `${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/conceptos`;

const ControlDescuentosConceptos: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [conceptos, setConceptos] = useState<Concepto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Formulario de creación/edición
    const [form, setForm] = useState<ConceptoForm>(EMPTY_FORM);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Confirmación de eliminación
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; concepto: Concepto | null }>({
        isOpen: false,
        concepto: null,
    });

    const fetchConceptos = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(API_CONCEPTOS);
            setConceptos(res.data);
        } catch {
            addNotification('error', 'Error al cargar los conceptos.');
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => { fetchConceptos(); }, [fetchConceptos]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const handleOpenEdit = (c: Concepto) => {
        setEditingId(c.id);
        setForm({ nombre: c.nombre, concepto_nomina: c.concepto_nomina, activo: c.activo });
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const handleSave = async () => {
        if (!form.nombre.trim()) {
            addNotification('warning', 'El nombre del concepto es obligatorio.');
            return;
        }
        if (!form.concepto_nomina.trim()) {
            addNotification('warning', 'El concepto de nómina es obligatorio.');
            return;
        }

        setIsSaving(true);
        try {
            if (editingId !== null) {
                await axios.put(`${API_CONCEPTOS}/${editingId}`, form);
                addNotification('success', 'Concepto actualizado correctamente.');
            } else {
                await axios.post(API_CONCEPTOS, form);
                addNotification('success', 'Concepto creado correctamente.');
            }
            handleCloseForm();
            fetchConceptos();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Error al guardar el concepto.';
            addNotification('error', msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal.concepto) return;
        try {
            await axios.delete(`${API_CONCEPTOS}/${deleteModal.concepto.id}`);
            addNotification('success', `Concepto "${deleteModal.concepto.nombre}" eliminado.`);
            setDeleteModal({ isOpen: false, concepto: null });
            fetchConceptos();
        } catch {
            addNotification('error', 'Error al eliminar el concepto.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 shrink-0 gap-4 transition-colors duration-200">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/registro')}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <div>
                        <Title level={4} className="!mb-1 font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 flex items-center gap-3">
                            <Settings2 className="w-6 h-6 text-blue-500" />
                            Parametrizar Conceptos
                        </Title>
                        <Text size="sm" color="text-tertiary" className="font-medium tracking-wide">
                            {conceptos.length} concepto{conceptos.length !== 1 ? 's' : ''} registrado{conceptos.length !== 1 ? 's' : ''}
                        </Text>
                    </div>
                </div>
                <Button
                    variant="primary"
                    onClick={handleOpenCreate}
                    icon={Plus}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-bold shadow-lg hover:shadow-blue-500/20"
                >
                    Nuevo Concepto
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                        <Text className="ml-4 text-slate-500">Cargando conceptos...</Text>
                    </div>
                ) : conceptos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-5">
                            <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                        </div>
                        <Text variant="h5" weight="bold" color="text-primary" className="mb-2 dark:text-slate-200">
                            No hay conceptos registrados
                        </Text>
                        <Text size="sm" color="text-tertiary" className="max-w-sm">
                            Crea el primer concepto haciendo clic en "Nuevo Concepto". Estos se usarán en el formulario de registro de descuentos.
                        </Text>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900/60 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre del Concepto</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Concepto Nómina</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conceptos.map((c, idx) => (
                                        <tr
                                            key={c.id}
                                            className={`border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}
                                        >
                                            <td className="px-5 py-3.5">
                                                <Text size="xs" color="text-tertiary">#{c.id}</Text>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <Text weight="medium" className="text-slate-800 dark:text-slate-200 font-semibold">{c.nombre}</Text>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <Text as="span" className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono text-sm font-bold">
                                                    <Hash className="w-3 h-3" />
                                                    {c.concepto_nomina}
                                                </Text>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <Badge variant={c.activo ? 'success' : 'neutral'} size="sm">
                                                    {c.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEdit(c)}
                                                        icon={Pencil}
                                                        className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                                                        title="Editar"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteModal({ isOpen: true, concepto: c })}
                                                        icon={Trash2}
                                                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                        title="Eliminar"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Formulario */}
            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={editingId !== null ? 'Editar Concepto' : 'Nuevo Concepto'}
                showCloseButton={true}
                closeOnOverlayClick={false}
            >
                <div className="space-y-5 pt-2">
                    <Input
                        label="Nombre del Concepto"
                        required
                        placeholder="Ej: GAFAS, ZOOLOGICO, CELULAR..."
                        value={form.nombre}
                        onChange={e => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))}
                        className="uppercase"
                    />
                    <Input
                        label="Concepto de Nómina"
                        required
                        placeholder="Ej: 111"
                        value={form.concepto_nomina}
                        onChange={e => setForm(f => ({ ...f, concepto_nomina: e.target.value }))}
                        helperText="Código que se usa en la liquidación de nómina. Por defecto: 111."
                    />
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Checkbox
                            id="activo-check"
                            label="Concepto activo (visible en el formulario de registro)"
                            checked={form.activo}
                            onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <Button variant="ghost" onClick={handleCloseForm} disabled={isSaving} icon={X}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={isSaving}
                            icon={isSaving ? undefined : (editingId !== null ? Save : Plus)}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            {isSaving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                editingId !== null ? 'Actualizar' : 'Guardar'
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Confirmación Eliminar */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, concepto: null })}
                title="Confirmar Eliminación"
                showCloseButton={false}
                closeOnOverlayClick={false}
            >
                <div className="space-y-5 pt-2">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                        <Trash2 className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <Text weight="bold" className="text-red-700 dark:text-red-400 mb-1">
                                ¿Estás seguro?
                            </Text>
                            <Text size="sm" className="text-red-600 dark:text-red-300">
                                Se eliminará permanentemente el concepto{' '}
                                <strong>"{deleteModal.concepto?.nombre}"</strong>. Esta acción no se puede deshacer.
                            </Text>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: false, concepto: null })} icon={X}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmDelete}
                            icon={Trash2}
                            className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 border-none"
                        >
                            Sí, Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ControlDescuentosConceptos;
