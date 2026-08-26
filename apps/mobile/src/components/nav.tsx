/**
 * Responsive navigation — router-driven, so it owns its own layout.
 *
 * Wide (desktop/tablet): a fixed 240px Lumen sidebar placed as a real flex
 * column beside the content. Narrow (phone): a bottom bar. Navigation goes
 * through expo-router (not the tab bar), so width is entirely under our control.
 */

import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Text } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

/** Below this width we're a phone. */
export const WIDE = 900;
/** Sidebar width on wide screens. */
export const SIDEBAR_W = 240;

const ROUTES = ['index', 'read', 'study', 'notes', 'profile'] as const;
type RouteName = (typeof ROUTES)[number];

const META: Record<
  RouteName,
  { titleKey: string; icon: keyof typeof Ionicons.glyphMap; section: 'Library' | 'Account' }
> = {
  index: { titleKey: 'nav.today', icon: 'sunny-outline', section: 'Library' },
  read: { titleKey: 'nav.reader', icon: 'book-outline', section: 'Library' },
  study: { titleKey: 'nav.study', icon: 'sparkles-outline', section: 'Library' },
  notes: { titleKey: 'nav.notes', icon: 'create-outline', section: 'Library' },
  profile: { titleKey: 'nav.you', icon: 'person-outline', section: 'Account' },
};

const SECTIONS: Array<'Library' | 'Account'> = ['Library', 'Account'];
const pathFor = (r: RouteName) => (r === 'index' ? '/' : `/${r}`);

export function AppNav() {
  const { width } = useWindowDimensions();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t: tr } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (r: RouteName) =>
    r === 'index' ? pathname === '/' : pathname === pathFor(r) || pathname.startsWith(`${pathFor(r)}/`);
  const go = (r: RouteName) => router.navigate(pathFor(r));

  // -------- Phone: bottom bar --------
  if (width < WIDE) {
    return (
      <Glass
        style={[
          styles.bottombar,
          { borderTopColor: t.colors.border, paddingBottom: insets.bottom },
        ]}
      >
        {ROUTES.map((r) => {
          const active = isActive(r);
          return (
            <Pressable
              key={r}
              onPress={() => go(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.bottomitem}
            >
              <Ionicons
                name={META[r].icon}
                size={23}
                color={active ? t.colors.accent : t.colors.textSubtle}
              />
              <Text variant="caption" tone={active ? 'accent' : 'subtle'} style={styles.bottomlabel}>
                {tr(META[r].titleKey)}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    );
  }

  // -------- Wide: Lumen sidebar --------
  return (
    <Glass
      style={[
        styles.sidebar,
        {
          borderRightColor: t.colors.border,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 14,
        },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.brandmark, { backgroundColor: t.colors.text }]}>
          <Text style={{ color: t.colors.gold, fontSize: 19 }}>✦</Text>
        </View>
        <View>
          <Text variant="title" style={{ fontSize: 20 }}>
            Selah
          </Text>
          <Text variant="caption" tone="subtle">
            {tr('brand.tagline')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.fill}>
        {SECTIONS.map((section) => (
          <View key={section}>
            <Text variant="overline" tone="subtle" style={styles.sectionLabel}>
              {tr(section === 'Library' ? 'nav.library' : 'nav.account').toUpperCase()}
            </Text>
            {ROUTES.filter((r) => META[r].section === section).map((r) => {
              const active = isActive(r);
              return (
                <Pressable
                  key={r}
                  onPress={() => go(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.navitem,
                    { backgroundColor: active ? t.colors.surfaceMuted : 'transparent' },
                  ]}
                >
                  <Ionicons
                    name={META[r].icon}
                    size={18}
                    color={active ? t.colors.text : t.colors.textMuted}
                  />
                  <Text
                    variant="callout"
                    tone={active ? 'default' : 'muted'}
                    style={{ fontWeight: active ? '700' : '400' }}
                  >
                    {tr(META[r].titleKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => go('profile')}
        style={[styles.profile, { borderTopColor: t.colors.border }]}
      >
        <View style={[styles.avatar, { backgroundColor: t.colors.accentMuted }]}>
          <Text variant="callout" tone="accent" style={{ fontWeight: '700' }}>
            {(user?.display_name?.[0] ?? 'S').toUpperCase()}
          </Text>
        </View>
        <View>
          <Text variant="callout" style={{ fontWeight: '600' }}>
            {user?.display_name ?? 'Guest'}
          </Text>
          <Text variant="caption" tone="subtle">
            {user ? 'Personal library' : 'Not signed in'}
          </Text>
        </View>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  bottombar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  bottomitem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  bottomlabel: { fontSize: 11 },
  sidebar: { width: SIDEBAR_W, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  fill: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 16 },
  brandmark: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { paddingHorizontal: 10, marginTop: 14, marginBottom: 6 },
  navitem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 2,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingTop: 14,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
