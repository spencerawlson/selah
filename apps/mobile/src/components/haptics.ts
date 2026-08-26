/**
 * Tactile feedback.
 *
 * A light tap on presses, a selection tick on toggles. No-ops on web (there is
 * no haptics engine there) and never throws — feedback is a nicety, not a
 * dependency.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

export function tapFeedback(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectFeedback(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}
