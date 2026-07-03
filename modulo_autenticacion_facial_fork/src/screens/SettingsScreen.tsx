import React, { useState, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { styles } from '../styles/settings.styles';
import { exportCheckInsToCSV } from '../utils/export';
import type { Zone, UserAccount } from '../types';



const ZoneItem = memo(({ zone, onDelete }: { zone: Zone, onDelete: (id: string, name: string) => void }) => (
  <View style={styles.zoneCard}>
    <View style={styles.zoneInfo}>
      <Text style={styles.zoneName}>{zone.name}</Text>
      <View style={styles.zoneCoords}>
        <Ionicons name="navigate-outline" size={12} color={COLORS.textMuted} />
        <Text style={styles.zoneCoordsText}>
          {zone.center.latitude.toFixed(6)}, {zone.center.longitude.toFixed(6)}
        </Text>
      </View>
      <View style={styles.zoneRadiusBadge}>
        <Text style={styles.zoneRadiusText}>{zone.radius}m radio</Text>
      </View>
    </View>
    <View style={styles.zoneActions}>
      <TouchableOpacity
        style={styles.zoneActionBtnDanger}
        accessibilityLabel={`Eliminar zona ${zone.name}`}
        onPress={() => onDelete(zone.id, zone.name)}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  </View>
));

const AccountItem = memo(({ account, currentUser, onDelete }: { account: UserAccount, currentUser: UserAccount | null, onDelete: (id: string, name: string) => void }) => (
  <View style={localStyles.accountItem}>
    <View style={localStyles.accountItemFlex}>
      <Text style={localStyles.accountItemName}>
        {account.displayName}
      </Text>
      <Text style={localStyles.accountItemUsername}>
        @{account.username}
      </Text>
    </View>

    <View
      style={account.role === 'admin' ? localStyles.roleBadgeAdmin : localStyles.roleBadgeUser}
    >
      <Text
        style={account.role === 'admin' ? localStyles.roleBadgeAdminText : localStyles.roleBadgeUserText}
      >
        {account.role === 'admin' ? 'Admin' : 'Usuario'}
      </Text>
    </View>

    {account.id !== currentUser?.id && (
      <TouchableOpacity
        style={localStyles.deleteAccountBtn}
        accessibilityLabel={`Eliminar usuario ${account.displayName}`}
        onPress={() => onDelete(account.id, account.displayName)}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
      </TouchableOpacity>
    )}
  </View>
));
export default function SettingsScreen() {
  const {
    zones,
    threshold,
    setThreshold,
    addZone,
    deleteZone,
    clearCheckIns,
    checkIns,
    locationState,
  } = useApp();

  const { currentUser, accounts, createAccount, deleteAccount, logout, refreshAccounts } = useAuth();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneLat, setZoneLat] = useState('');
  const [zoneLng, setZoneLng] = useState('');
  const [zoneRadius, setZoneRadius] = useState('100');

  const [userModalVisible, setUserModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const { currentLocation } = locationState;

  const handleDeleteZone = useCallback((id: string, name: string) => {
    showAlert(
      'Eliminar Zona',
      `¿Estás seguro de eliminar la zona "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteZone(id);
            } catch (err) {
              showAlert('Error', 'No se pudo eliminar la zona.');
            }
          },
        },
      ]
    );
  }, [deleteZone]);

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setZoneLat(currentLocation.latitude.toFixed(6));
      setZoneLng(currentLocation.longitude.toFixed(6));
    } else {
      showAlert(
        'Ubicación no disponible',
        'Por favor, asegúrate de activar el Rastreo GPS en el Dashboard y permitir los permisos de ubicación.'
      );
    }
  };

  const handleAddZone = async () => {
    const lat = parseFloat(zoneLat);
    const lng = parseFloat(zoneLng);
    const rad = parseFloat(zoneRadius);

    if (!zoneName.trim() || isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      showAlert('Datos inválidos', 'Por favor llena todos los campos con valores numéricos correctos.');
      return;
    }

    try {
      await addZone(zoneName.trim(), lat, lng, rad);
      setZoneName('');
      setZoneLat('');
      setZoneLng('');
      setZoneRadius('100');
      setAddModalVisible(false);
      showAlert('Listo', 'Nueva zona registrada correctamente.');
    } catch (err) {
      showAlert('Error', 'No se pudo crear la zona.');
    }
  };

  const handleClearHistory = () => {
    if (checkIns.length === 0) {
      showAlert('Sin datos', 'No hay registros en el historial.');
      return;
    }

    showAlert(
      'Limpiar Historial',
      'Se eliminarán permanentemente todos los registros del sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCheckIns();
              showAlert('Listo', 'Historial de asistencia eliminado.');
            } catch (err) {
              showAlert('Error', 'No se pudo limpiar el historial.');
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    if (checkIns.length === 0) {
      showAlert('Sin datos', 'No hay registros de check-in para exportar.');
      return;
    }
    
    await exportCheckInsToCSV(checkIns);
  };

  const handleDeleteAccount = useCallback((id: string, displayName: string) => {
    showAlert(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar al usuario "${displayName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(id);
              await refreshAccounts();
            } catch (err) {
              showAlert('Error', 'No se pudo eliminar el usuario.');
            }
          },
        },
      ]
    );
  }, [deleteAccount, refreshAccounts]);

  const handleCreateAccount = async () => {
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      showAlert('Datos inválidos', 'Por favor llena todos los campos.');
      return;
    }

    try {
      const result = await createAccount(newUserUsername.trim(), newUserPassword, newUserRole, newUserName.trim());
      if (result.success) {
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserRole('user');
        setUserModalVisible(false);
        await refreshAccounts();
        showAlert('Listo', 'Nuevo usuario creado correctamente.');
      } else {
        showAlert('Error', result.error || 'No se pudo crear el usuario.');
      }
    } catch (err) {
      showAlert('Error', 'No se pudo crear el usuario.');
    }
  };

  const adjustThreshold = (delta: number) => {
    setThreshold(threshold + delta);
  };

  return (
    <View style={styles.container}>
      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configuración</Text>
          <Text style={styles.headerSubtitle}>Administra zonas y preferencias</Text>
        </View>

        {/* Section: Zones */}
        {currentUser?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="location" size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.sectionTitle}>Zonas de Verificación (Geocercas)</Text>
            </View>

            {zones.map((zone) => (
              <ZoneItem key={zone.id} zone={zone} onDelete={handleDeleteZone} />
            ))}

            <TouchableOpacity style={styles.addZoneBtn} accessibilityLabel="Agregar zona" onPress={() => setAddModalVisible(true)} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addZoneBtnText}>Agregar Zona</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section: Facial Recognition */}
        {currentUser?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="scan" size={18} color={COLORS.primaryLight} />
              </View>
              <Text style={styles.sectionTitle}>Reconocimiento Facial</Text>
            </View>

            <View style={styles.thresholdCard}>
              <View style={styles.thresholdHeader}>
                <Text style={styles.thresholdLabel}>Umbral de coincidencia</Text>
                <Text style={styles.thresholdValue}>{threshold}%</Text>
              </View>
              <Text style={styles.thresholdDesc}>
                Confianza mínima requerida para considerar una verificación facial exitosa.
              </Text>

              {/* Visual slider */}
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderBtn}
                  onPress={() => adjustThreshold(-5)}
                >
                  <Ionicons name="remove" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${((threshold - 50) / 49) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${((threshold - 50) / 49) * 100}%` },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.sliderBtn}
                  onPress={() => adjustThreshold(5)}
                >
                  <Ionicons name="add" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>50%</Text>
                <Text style={styles.sliderLabelText}>99%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Section: User Management (Admin only) - Deshabilitado en flujo empresarial JIT */}
        {false && currentUser?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="people-outline" size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.sectionTitle}>Gestión de Usuarios</Text>
            </View>

            {accounts.map((account) => (
              <AccountItem key={account.id} account={account} currentUser={currentUser} onDelete={handleDeleteAccount} />
            ))}

            <TouchableOpacity
              style={localStyles.addUserBtn}
              onPress={() => setUserModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              <Text style={localStyles.addUserBtnText}>Agregar Usuario</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section: Data */}
        {currentUser?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="server-outline" size={18} color={COLORS.info} />
              </View>
              <Text style={styles.sectionTitle}>Datos</Text>
            </View>

            <TouchableOpacity style={styles.dataButton} onPress={handleExport}>
              <View style={styles.dataButtonLeft}>
                <View style={[styles.dataIcon, { backgroundColor: 'rgba(0, 184, 148, 0.1)' }]}>
                  <Ionicons name="download-outline" size={20} color={COLORS.success} />
                </View>
                <View>
                  <Text style={styles.dataButtonText}>Exportar Check-ins</Text>
                  <Text style={styles.dataButtonDesc}>Descargar historial en CSV</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dataButton} onPress={handleClearHistory}>
              <View style={styles.dataButtonLeft}>
                <View style={[styles.dataIcon, { backgroundColor: 'rgba(255, 118, 117, 0.1)' }]}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </View>
                <View>
                  <Text style={styles.dataButtonText}>Limpiar Historial</Text>
                  <Text style={styles.dataButtonDesc}>Borrar registros del historial</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Section: About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.sectionTitle}>Acerca de</Text>
          </View>

          <View style={styles.aboutCard}>
            <View style={styles.aboutLogoContainer}>
              <View style={styles.aboutLogo}>
                <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.aboutTitle}>GeoFace</Text>
            <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutDesc}>
              Sistema de asistencia inteligente con geolocalización y reconocimiento facial. Fuerza al usuario a registrar su presencia física real dentro de la zona de verificación.
            </Text>

            <View style={styles.aboutInfoRow}>
              <View style={styles.aboutInfoItem}>
                <Text style={styles.aboutInfoLabel}>Plataforma</Text>
                <Text style={styles.aboutInfoValue}>React Native + Expo</Text>
              </View>
              <View style={styles.aboutInfoItem}>
                <Text style={styles.aboutInfoLabel}>Licencia</Text>
                <Text style={styles.aboutInfoValue}>MIT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section: Logout */}
        <TouchableOpacity
          style={localStyles.logoutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={localStyles.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        {currentUser?.displayName && (
          <Text style={localStyles.connectedAsText}>
            Conectado como: {currentUser.displayName}
          </Text>
        )}
      </ScrollView>

      {/* Add Zone Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nueva Geocerca</Text>
            <Text style={styles.modalSubtitle}>
              Configura las coordenadas y el radio de la zona de asistencia.
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de la zona (ej. Oficina Principal)"
                placeholderTextColor={COLORS.textMuted}
                value={zoneName}
                onChangeText={setZoneName}
                autoFocus
              />
            </View>

            {/* Quick GPS Autofill Button */}
            <TouchableOpacity style={styles.useLocationBtn} onPress={handleUseCurrentLocation}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.accent} />
              <Text style={styles.useLocationBtnText}>Obtener ubicación GPS actual</Text>
            </TouchableOpacity>

            <View style={localStyles.rowGap12}>
              <View style={[styles.inputContainer, localStyles.inputFlexRow]}>
                <Text style={localStyles.inputLabel}>Lat:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00000"
                  placeholderTextColor={COLORS.textMuted}
                  value={zoneLat}
                  onChangeText={setZoneLat}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputContainer, localStyles.inputFlexRow]}>
                <Text style={localStyles.inputLabel}>Lng:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00000"
                  placeholderTextColor={COLORS.textMuted}
                  value={zoneLng}
                  onChangeText={setZoneLng}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputContainer, localStyles.inputContainerMargin]}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Radio en metros (ej. 100)"
                placeholderTextColor={COLORS.textMuted}
                value={zoneRadius}
                onChangeText={setZoneRadius}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setZoneName('');
                  setZoneLat('');
                  setZoneLng('');
                  setZoneRadius('100');
                  setAddModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!zoneName.trim() || !zoneLat || !zoneLng || !zoneRadius) && { opacity: 0.4 }]}
                onPress={handleAddZone}
                disabled={!zoneName.trim() || !zoneLat || !zoneLng || !zoneRadius}
              >
                <Text style={styles.modalConfirmText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add User Modal */}
      <Modal
        visible={userModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUserModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setUserModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nuevo Usuario</Text>
            <Text style={styles.modalSubtitle}>
              Crea una nueva cuenta de acceso al sistema.
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={COLORS.textMuted}
                value={newUserName}
                onChangeText={setNewUserName}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="at-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                placeholderTextColor={COLORS.textMuted}
                value={newUserUsername}
                onChangeText={setNewUserUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={COLORS.textMuted}
                value={newUserPassword}
                onChangeText={setNewUserPassword}
                secureTextEntry
              />
            </View>

            {/* Role selector */}
            <Text style={localStyles.roleLabel}>
              Rol del usuario
            </Text>
            <View style={localStyles.roleRow}>
              <TouchableOpacity
                style={newUserRole === 'admin' ? localStyles.roleOptionAdminActive : localStyles.roleOptionAdminInactive}
                onPress={() => setNewUserRole('admin')}
                activeOpacity={0.8}
              >
                <Text style={newUserRole === 'admin' ? localStyles.roleTextAdminActive : localStyles.roleTextAdminInactive}>
                  Administrador
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={newUserRole === 'user' ? localStyles.roleOptionUserActive : localStyles.roleOptionUserInactive}
                onPress={() => setNewUserRole('user')}
                activeOpacity={0.8}
              >
                <Text style={newUserRole === 'user' ? localStyles.roleTextUserActive : localStyles.roleTextUserInactive}>
                  Usuario
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewUserName('');
                  setNewUserUsername('');
                  setNewUserPassword('');
                  setNewUserRole('user');
                  setUserModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) && { opacity: 0.4 }]}
                onPress={handleCreateAccount}
                disabled={!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()}
              >
                <Text style={styles.modalConfirmText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    marginBottom: 10,
  },
  accountItemFlex: { flex: 1 },
  accountItemName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  accountItemUsername: { fontSize: 12, color: COLORS.textMuted },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  roleBadgeUser: {
    backgroundColor: 'rgba(0, 206, 201, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  roleBadgeAdminText: { fontSize: 11, fontWeight: '600', color: COLORS.primaryLight },
  roleBadgeUserText: { fontSize: 11, fontWeight: '600', color: COLORS.accent },
  deleteAccountBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 4,
  },
  addUserBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 118, 117, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 118, 117, 0.25)',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: 10,
  },
  logoutBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.danger },
  connectedAsText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  rowGap12: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputFlexRow: { flex: 1, marginBottom: 0 },
  inputLabel: { color: COLORS.textMuted, fontSize: 13, marginRight: 4 },
  inputContainerMargin: { marginBottom: 24 },
  roleLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.lg },
  roleOptionAdminActive: {
    flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(108, 92, 231, 0.2)', borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center'
  },
  roleOptionAdminInactive: {
    flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1.5, borderColor: COLORS.glassBorder, alignItems: 'center'
  },
  roleOptionUserActive: {
    flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(0, 206, 201, 0.2)', borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center'
  },
  roleOptionUserInactive: {
    flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1.5, borderColor: COLORS.glassBorder, alignItems: 'center'
  },
  roleTextAdminActive: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight },
  roleTextAdminInactive: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  roleTextUserActive: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
  roleTextUserInactive: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
});
