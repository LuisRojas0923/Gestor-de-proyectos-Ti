import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { styles } from '../styles/index.styles';
import { getAuthenticatedImageUri } from '../services/faceApi';

interface CheckInItemProps {
  isMatch: boolean;
  confidence: number;
  profileName: string;
  zoneName: string;
  formattedDate: string;
  evidenciaUrl?: string;
}

export default memo(function CheckInItem({ isMatch, confidence, profileName, zoneName, formattedDate, evidenciaUrl }: CheckInItemProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let active = true;
    setImageUri(null);
    setImageError(false);

    if (!evidenciaUrl) return;

    setIsImageLoading(true);
    getAuthenticatedImageUri(evidenciaUrl)
      .then((uri) => {
        if (active) setImageUri(uri);
      })
      .catch(() => {
        console.error('Error cargando evidencia protegida');
        if (active) setImageError(true);
      })
      .finally(() => {
        if (active) setIsImageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [evidenciaUrl]);

  return (
    <View style={styles.checkInCard}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
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
      ) : isImageLoading ? (
        <View style={[styles.checkInAvatar, { backgroundColor: 'rgba(108, 92, 231, 0.12)' }]}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
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
            name={imageError ? 'image-outline' : isMatch ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={imageError ? COLORS.warning : isMatch ? COLORS.success : COLORS.danger}
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
