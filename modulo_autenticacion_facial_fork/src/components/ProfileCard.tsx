import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { styles } from '../styles/profiles.styles';
import type { FaceProfile } from '../types';
import { getInitials } from '../utils/format';

const AVATAR_COLORS = ['#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E', '#E17055'];

function getAvatarColor(id: string): string {
  return AVATAR_COLORS[parseInt(id.slice(-1), 16) % AVATAR_COLORS.length];
}

interface ProfileCardProps {
  profile: FaceProfile;
  onUpdatePhoto: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export default memo(function ProfileCard({ profile, onUpdatePhoto, onDelete }: ProfileCardProps) {
  const avatarColor = getAvatarColor(profile.id);
  const hasPhoto = profile.photoUris && profile.photoUris.length > 0;

  return (
    <View style={styles.profileCard}>
      {hasPhoto ? (
        <Image source={{ uri: profile.photoUris[0] }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor + '25' }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>
            {getInitials(profile.name)}
          </Text>
        </View>
      )}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{profile.name}</Text>
        <View style={styles.profileMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="camera-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{hasPhoto ? '1 foto' : 'sin fotos'}</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{profile.createdAt}</Text>
          </View>
        </View>
      </View>
      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onUpdatePhoto(profile.id)}>
          <Ionicons name="camera" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnDanger}
          onPress={() => onDelete(profile.id, profile.name)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
});
