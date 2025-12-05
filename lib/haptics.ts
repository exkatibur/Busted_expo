import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Safe haptics wrapper for web compatibility
 * Haptics only work on iOS and Android, not on web
 */
export const triggerHaptic = (type: 'selection' | 'success' | 'error' | 'heavy') => {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch (e) {
    // Haptics not available on this device
  }
};
