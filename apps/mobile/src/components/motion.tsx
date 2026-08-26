/**
 * Motion — calm by design.
 *
 * Two primitives, both on the built-in Animated driver so there is no extra
 * dependency and no jank: `FadeIn` for gentle, unhurried entrances, and
 * `Breathe` for the slow pulse we show while the AI is thinking. Nothing here
 * pops or snaps; the app should feel like it exhales.
 */

import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Platform, type ViewStyle } from 'react-native';

// Native driver is smoothest on device; web has no native animation module, so
// fall back to the JS driver there (opacity + transform animate fine either way).
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** A slow fade-and-rise on mount. Mount-only, so it never fights a refresh. */
export function FadeIn({
  children,
  delay = 0,
  duration = 520,
  offset = 8,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  offset?: number;
  style?: ViewStyle;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [progress, duration, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A slow breath — a ~3s loop of scale + opacity. For calm waiting. */
export function Breathe({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1500, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0, duration: 1500, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
