import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
}
import { CheckIn } from '../types';
import { formatCheckInDate } from './format';

/**
 * Convierte un arreglo de registros (checkIns) en una cadena CSV separada por comas.
 */
function convertToCSV(data: CheckIn[]): string {
  // Encabezados del CSV
  const headers = ['Fecha', 'Usuario', 'Zona', 'Latitud', 'Longitud', 'Estado', 'Confianza (%)'];
  
  // Mapear los datos
  const rows = data.map((record) => {
    const isMatch = record.verification.isMatch ? 'Aprobado' : 'Rechazado';
    const confidence = (record.verification.confidence * 100).toFixed(2);
    const dateStr = formatCheckInDate(record.timestamp);
    
    // Si algún texto tiene comas, debemos encerrarlo en comillas
    return [
      `"${dateStr}"`,
      `"${record.profileName}"`,
      `"${record.zone.name}"`,
      record.location.latitude.toFixed(6),
      record.location.longitude.toFixed(6),
      isMatch,
      confidence
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Exporta los registros a un archivo CSV.
 * Maneja automáticamente la plataforma (Web vs Nativo).
 */
export async function exportCheckInsToCSV(checkIns: CheckIn[]): Promise<boolean> {
  try {
    const csvString = convertToCSV(checkIns);
    const fileName = `Reporte_Asistencia_${new Date().toISOString().split('T')[0]}.csv`;

    if (Platform.OS === 'web') {
      // Descarga en Web
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } else {
      // Descarga Nativa (iOS / Android) usando expo-file-system y expo-sharing
      if (!FileSystem) throw new Error('FileSystem no disponible');
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Descargar Reporte de Asistencia',
        });
        return true;
      } else {
        alert('La opción de compartir no está disponible en este dispositivo.');
        return false;
      }
    }
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    return false;
  }
}
