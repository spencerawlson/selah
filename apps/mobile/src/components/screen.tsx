/**
 * Screen scaffolding: safe areas, background, and the large title treatment
 * every top-level tab shares.
 */

import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Large serif title, shown at the top of tab roots. */
  title?: string;
  subtitle?: string;
  /** Pass to enable pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Turn off for screens that manage their own scrolling (e.g. a FlatList). */
  scroll?: boolean;
  /** Screens pushed onto a stack get their header from the navigator instead. */
  edges?: { top?: boolean; bottom?: boolean };
}

export function Screen({
  children,
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  scroll = true,
  edges = { top: true },
}: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // On wide screens keep the reading column centered, like a page — not stretched.
  const column = width >= 900 ? styles.column : undefined;

  const header = title ? (
    <View style={{ marginBottom: t.spacing.xl }}>
      <Text variant="display">{title}</Text>
      {subtitle ? (
        <Text variant="body" tone="muted" style={{ marginTop: t.spacing.xs }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  ) : null;

  const padding = {
    paddingTop: edges.top ? insets.top + t.spacing.lg : t.spacing.lg,
    // Clear the tab bar; the extra 24 keeps the last card off the edge.
    paddingBottom: insets.bottom + t.spacing.xxxl,
    paddingHorizontal: t.spacing.lg,
  };

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: t.colors.background }, padding]}>
        <View style={column}>
          {header}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: t.colors.background }]}
      contentContainerStyle={padding}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.textSubtle}
          />
        ) : undefined
      }
    >
      <View style={column}>
        {header}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
});
