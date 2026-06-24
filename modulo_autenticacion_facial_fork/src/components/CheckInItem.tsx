import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { styles } from '../styles/index.styles';

interface CheckInItemProps {
  isMatch: boolean;
  confidence: number;
  profileName: string;
  zoneName: string;
  formattedDate: string;
}

export default memo(function CheckInItem({ isMatch, confidence, profileName, zoneName, formattedDate }: CheckInItemProps) {
  return (
    <View style={styles.checkInCard}>
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
