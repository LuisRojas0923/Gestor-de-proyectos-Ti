/**
 * Gestión de Salas - Solo usuarios con rol admin.
 * Integrado desde PRUEBA ANTI; usa API reserva-salas/rooms.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Text, Title } from '../components/atoms';
import { Modal } from '../components/molecules';
import { useAppContext } from '../context/AppContext';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { useNotifications } from '../components/notifications/NotificationsContext';
import type { Room, RoomCreate, RoomUpdate } from '../types/reservaSalas';
import './RoomsPage.css';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const RoomsPage: React.FC = () => {
  const { state } = useAppContext();
  const user = state.user;
  const { addNotification } = useNotifications();
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [filterCapacity, setFilterCapacity] = useState('');
  const [filterResources, setFilterResources] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    resources: '',
    notes: '',
    is_active: true,
  });

  const loadRooms = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCapacity) params.set('capacity_min', filterCapacity);
      if (filterResources) params.set('resources', filterResources);
      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.RESERVA_SALAS_ROOMS}${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al cargar las salas');
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar las salas';
      setError(msg);
      addNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [filterCapacity, filterResources, addNotification]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capacity = parseInt(formData.capacity, 10);
    if (isNaN(capacity) || capacity < 1) {
      addNotification('error', 'Capacidad debe ser un número mayor a 0');
      return;
    }
    const resources = formData.resources
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const payload: RoomCreate = {
      name: formData.name,
      capacity,
      resources,
      notes: formData.notes || undefined,
      is_active: formData.is_active,
    };

    try {
      if (editingRoom) {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.RESERVA_SALAS_ROOM_BY_ID(editingRoom.id)}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload as RoomUpdate),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail || 'Error al actualizar');
        }
        addNotification('success', 'Sala actualizada correctamente');
      } else {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.RESERVA_SALAS_ROOMS}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail || 'Error al crear');
        }
        addNotification('success', 'Sala creada correctamente');
      }
      setShowModal(false);
      resetForm();
      loadRooms();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      addNotification('error', msg);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: String(room.capacity),
      resources: Array.isArray(room.resources) ? room.resources.join(', ') : '',
      notes: room.notes || '',
      is_active: room.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (roomId: string) => {
    if (!window.confirm('¿Está seguro de desactivar esta sala?')) return;
    try {
      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.RESERVA_SALAS_ROOM_BY_ID(roomId)}`;
      const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al desactivar');
      addNotification('success', 'Sala desactivada correctamente');
      loadRooms();
    } catch (e) {
      addNotification('error', e instanceof Error ? e.message : 'Error al desactivar');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      resources: '',
      notes: '',
      is_active: true,
    });
    setEditingRoom(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="rooms-page-loading">
        <div className="rooms-page-spinner" />
      </div>
    );
  }

  return (
    <div className="rooms-page">
      <div className="rooms-page-header">
        <Title variant="h4" weight="bold">
          Gestión de Salas
        </Title>
        {isAdmin && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Nueva Sala
          </Button>
        )}
      </div>

      {error && (
        <div className="rooms-page-error">
          <Text variant="body2" color="text-secondary">{error}</Text>
        </div>
      )}

      <div className="rooms-page-filters">
        <div className="rooms-page-filter-group">
          <label>Capacidad mínima</label>
          <Input
            type="number"
            placeholder="Ej: 6"
            value={filterCapacity}
            onChange={(e) => setFilterCapacity(e.target.value)}
          />
        </div>
        <div className="rooms-page-filter-group">
          <label>Recursos</label>
          <Input
            type="text"
            placeholder="Ej: Proyector, Pizarra"
            value={filterResources}
            onChange={(e) => setFilterResources(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={loadRooms}>
          Filtrar
        </Button>
      </div>

      <div className="rooms-page-grid">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`rooms-page-card ${!room.is_active ? 'rooms-page-card-inactive' : ''}`}
          >
            <div className="rooms-page-card-header">
              <h3>{room.name}</h3>
              {!room.is_active && <span className="rooms-page-badge-inactive">Inactiva</span>}
            </div>
            <div className="rooms-page-card-info">
              <div className="rooms-page-info-item">
                <span className="rooms-page-icon">👥</span>
                <span>Capacidad: {room.capacity} personas</span>
              </div>
              {Array.isArray(room.resources) && room.resources.length > 0 && (
                <div className="rooms-page-info-item">
                  <span className="rooms-page-icon">🛠️</span>
                  <div className="rooms-page-resources">
                    {room.resources.map((resource, idx) => (
                      <span key={idx} className="rooms-page-resource-tag">
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {room.notes && (
                <div className="rooms-page-info-item">
                  <span className="rooms-page-icon">📝</span>
                  <span className="rooms-page-notes">{room.notes}</span>
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="rooms-page-card-actions">
                <Button variant="secondary" onClick={() => handleEdit(room)}>
                  Editar
                </Button>
                {room.is_active && (
                  <Button variant="danger" onClick={() => handleDelete(room.id)}>
                    Desactivar
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="rooms-page-empty">
          <Text variant="body1" color="text-secondary">
            No se encontraron salas. Crea una nueva sala para comenzar.
          </Text>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingRoom ? 'Editar Sala' : 'Nueva Sala'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="rooms-page-form">
          <Input
            label="Nombre de la Sala *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Sala Ejecutiva A"
          />
          <Input
            label="Capacidad *"
            type="number"
            required
            min={1}
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="Ej: 10"
          />
          <Input
            label="Recursos (separados por coma)"
            value={formData.resources}
            onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
            placeholder="Ej: Proyector, Pizarra, Videoconferencia"
          />
          <div className="rooms-page-form-group">
            <label>Notas</label>
            <textarea
              className="rooms-page-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional sobre la sala..."
              rows={3}
            />
          </div>
          <div className="rooms-page-form-group rooms-page-form-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Sala activa
            </label>
          </div>
          <div className="rooms-page-form-footer">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingRoom ? 'Actualizar' : 'Crear'} Sala
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomsPage;
