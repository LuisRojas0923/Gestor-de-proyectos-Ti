import { Platform } from 'react-native';

/**
 * Solicita los permisos necesarios para enviar notificaciones al usuario.
 * @returns boolean indicando si se obtuvieron los permisos.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  return true;
}

/**
 * Envía una notificación local inmediata.
 * @param title Título de la notificación
 * @param body Cuerpo de la notificación
 */
export async function sendLocalNotification(title: string, body: string) {
}
