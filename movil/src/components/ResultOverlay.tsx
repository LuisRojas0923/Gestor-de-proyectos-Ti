import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { styles } from '../styles/verify.styles';
import { formatTime } from '../utils/format';

interface VerifyResult {
  match: boolean;
  confidence: number;
  name: string;
  profilePhoto: string | null;
  selfieUri: string | null;
}

interface ResultOverlayProps {
  result: VerifyResult;
  threshold: number;
  zoneName: string | undefined;
  onDismiss: () => void;
  onRetry?: () => void;
}

export default memo(function ResultOverlay({ result, threshold, zoneName, onDismiss, onRetry }: ResultOverlayProps) {
  return (
    <TouchableOpacity style={styles.resultOverlay} activeOpacity={1} onPress={onDismiss}>
      <View style={styles.resultCard}>
        {result.match && result.profilePhoto ? (
          <View style={styles.resultIconBg}>
            <Image source={{ uri: result.profilePhoto }} style={styles.resultPhoto} />
            <View style={[styles.photoResultIcon, { backgroundColor: COLORS.success }]}>
              <Ionicons name="checkmark" size={16} color={COLORS.text} />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.resultIconBg,
              {
                backgroundColor: result.match
                  ? 'rgba(0, 184, 148, 0.15)'
                  : 'rgba(255, 118, 117, 0.15)',
              },
            ]}
          >
            <Ionicons
              name={result.match ? 'checkmark-circle' : 'close-circle'}
              size={72}
              color={result.match ? COLORS.success : COLORS.danger}
            />
          </View>
        )}

        <Text style={[styles.resultTitle, { color: result.match ? COLORS.success : COLORS.danger }]}>
          {result.match ? '¡Identidad Verificada!' : 'No Coincide'}
        </Text>

        <Text style={styles.resultName}>{result.name}</Text>

        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceHeader}>
            <Text style={styles.confidenceLabel}>Confianza Facial</Text>
            <Text style={[styles.confidenceValue, { color: result.match ? COLORS.success : COLORS.danger }]}>
              {result.confidence}%
            </Text>
          </View>
          <View style={styles.confidenceBarBg}>
            <View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${result.confidence}%`,
                  backgroundColor: result.match ? COLORS.success : COLORS.danger,
                },
              ]}
            />
          </View>
          <Text style={styles.thresholdInfoText}>Umbral requerido: {threshold}%</Text>
        </View>

        <View style={styles.resultMeta}>
          <View style={styles.resultMetaItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.resultMetaText}>{formatTime(new Date().toISOString())}</Text>
          </View>
          <View style={styles.resultMetaItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.resultMetaText}>{zoneName || 'Zona Validada'}</Text>
          </View>
        </View>

        {result.match ? (
          <TouchableOpacity style={styles.resultDismissBtn} onPress={onDismiss}>
            <Text style={styles.resultDismissText}>Cerrar y Registrar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.resultRetryBtn} onPress={onRetry || onDismiss}>
              <Text style={styles.resultRetryText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss}>
              <Text style={styles.resultDismissText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});
