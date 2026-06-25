import React, { memo } from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { styles } from '../styles/index.styles';
import { getServerAddress } from '../services/faceApi';

interface CheckInItemProps {
  isMatch: boolean;
  confidence: number;
  profileName: string;
  zoneName: string;
  formattedDate: string;
  evidenciaUrl?: string;
}

function buildFullUrl(relativeUrl?: string): string | null {
  if (!relativeUrl) return null;
  // Obtener la base del servidor (ej: http://192.168.40.84:8000/api/v2)
  // y quitar el /api/v2 para obtener el host base
  const apiBase = getServerAddress();
  const baseUrl = apiBase.replace(/\/api\/v2\/?$/, '');
  return `${baseUrl}${relativeUrl}`;
}

export default memo(function CheckInItem({ isMatch, confidence, profileName, zoneName, formattedDate, evidenciaUrl }: CheckInItemProps) {
  const fullEvidenciaUrl = buildFullUrl(evidenciaUrl);

  return (
    <View style={styles.checkInCard}>
      {fullEvidenciaUrl ? (
        <Image
          source={{ uri: fullEvidenciaUrl }}
          style={[
            styles.checkInAvatar,
            {
              borderWidth: 2,
              borderColor: isMatch
                ? 'rgba(0, 184, 148, 0.5)'
                : 'rgba(255, 118, 117, 0.5)',
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.checkInAvatar,
            {
              backgroundColor: isMatch
                ? 'rgba(0, 184, 148, 0.15)'
                : 'rgba(255, 118, 117, 0.15)',
            },
          ]}
        >
          <Ionicons
            name={isMatch ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={isMatch ? COLORS.success : COLORS.danger}
          />
        </View>
      )}
      <View style={styles.checkInInfo}>
        <Text style={styles.checkInName}>{profileName}</Text>
        <Text style={styles.checkInTime}>
          {zoneName} · {formattedDate}
        </Text>
      </View>
      <View
        style={[
          styles.checkInBadge,
          {
            backgroundColor: isMatch
              ? 'rgba(0, 184, 148, 0.12)'
              : 'rgba(255, 118, 117, 0.12)',
          },
        ]}
      >
        <Text
          style={[
            styles.checkInBadgeText,
            {
              color: isMatch ? COLORS.success : COLORS.danger,
            },
          ]}
        >
          {isMatch ? `${Math.round(confidence * 100)}%` : 'Fallido'}
        </Text>
      </View>
    </View>
  );
});
