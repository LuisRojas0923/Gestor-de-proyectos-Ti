import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * Muestra un mensaje de alerta multiplataforma.
 * - En web: usa `window.alert()` o `window.confirm()` según los botones.
 * - En nativo (iOS/Android): usa `Alert.alert()` de React Native.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS === 'web') {
    _showWebAlert(title, message, buttons);
  } else {
    Alert.alert(title, message, buttons);
  }
}

function _showWebAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  const fullMessage = message ? `${title}\n\n${message}` : title;

  // Si no hay botones o solo un botón, mostrar alert simple
  if (!buttons || buttons.length <= 1) {
    window.alert(fullMessage);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Si hay un botón destructivo o de acción, usar confirm
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtn = buttons.find((b) => b.style !== 'cancel');

  if (actionBtn) {
    const confirmed = window.confirm(fullMessage);
    if (confirmed) {
      actionBtn.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
    return;
  }

  // Fallback: mostrar alerta simple y ejecutar el primer botón
  window.alert(fullMessage);
  buttons[0]?.onPress?.();
}
