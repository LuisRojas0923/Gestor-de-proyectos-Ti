import React, { useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';
import { styles } from '../styles/profiles.styles';
import type { FaceProfile } from '../types';
import ProfileCard from '../components/ProfileCard';

export default function ProfilesScreen() {
  const { profiles, deleteProfile } = useApp();

  const handleDeleteProfile = useCallback((id: string, name: string) => {
    showAlert(
      'Eliminar Perfil',
      `¿Estás seguro de eliminar a "${name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile(id);
            } catch (err) {
              showAlert('Error', 'No se pudo eliminar el perfil.');
            }
          },
        },
      ]
    );
  }, [deleteProfile]);

  const renderProfile = useCallback(({ item }: { item: FaceProfile }) => (
    <ProfileCard
      profile={item}
      onUpdatePhoto={() => {
        showAlert('Info', 'Las fotos de referencia ahora se gestionan a través del auto-enrolamiento.');
      }}
      onDelete={handleDeleteProfile}
    />
  ), [handleDeleteProfile]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin perfiles registrados</Text>
      <Text style={styles.emptySubtitle}>
        Los perfiles creados mediante auto-enrolamiento aparecerán aquí.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Perfiles Registrados</Text>
          <Text style={styles.headerSubtitle}>
            {profiles.length} {profiles.length === 1 ? 'persona' : 'personas'}
          </Text>
        </View>
      </View>

      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
