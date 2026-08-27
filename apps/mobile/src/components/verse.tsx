/**
 * Verse and explanation presentation.
 *
 * The rule these components enforce: scripture is set in serif at full
 * contrast, and everything the app adds around it is smaller, sans, and quieter.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ExplanationWithVerse, Verse } from '@selah/shared';
import { ImageBackground, type ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { Badge, Card, Divider, Row, Text } from '@/components/ui';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

/**
 * The verse of the day — the app's signature moment, given hero treatment.
 *
 * A warm accent-tinted panel, the verse set larger in serif, and a single
 * decorative quotation mark behind it. Everything else on Today is quieter than
 * this, on purpose.
 */
export function VerseHero({
  verse,
  label = 'Verse of the day',
  date,
  image,
  onPress,
}: {
  verse: Verse;
  label?: string;
  date?: string;
  image?: ImageSourcePropType;
  onPress?: () => void;
}) {
  const t = useTheme();

  // With a background image: the verse is set in the middle of the art itself.
  // A soft scrim — not a solid card — keeps it legible while the picture shows
  // through, and everything on top goes white.
  if (image) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${verse.reference}. ${verse.text}` : undefined}
        style={({ pressed }) => ({ opacity: pressed && onPress ? 0.92 : 1 })}
      >
        <ImageBackground
          source={image}
          resizeMode="cover"
          style={[styles.imageArt, t.shadow.card]}
          imageStyle={{ borderRadius: t.radius.xl }}
        >
          {/* Transparent backing: a gentle wash so white text reads on any art. */}
          <View
            pointerEvents="none"
            style={[styles.imageScrim, { borderRadius: t.radius.xl }]}
          />
          <View style={styles.imageOverlay}>
            <Text variant="overline" style={styles.imageLabel}>
              {label.toUpperCase()}
            </Text>
            <Text style={[styles.imageVerse, { fontFamily: t.fonts.serif }]}>{verse.text}</Text>
            <Row gap={8} style={styles.imageFooter}>
              <Text variant="callout" style={styles.imageRef}>
                {verse.reference}
              </Text>
              {onPress ? <Ionicons name="arrow-forward" size={15} color="#FFFFFF" /> : null}
            </Row>
          </View>
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${verse.reference}. ${verse.text}` : undefined}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.85 : 1 })}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: t.colors.accentMuted,
            borderColor: t.colors.border,
            borderRadius: t.radius.xl,
            padding: t.spacing.xl,
          },
          t.shadow.card,
        ]}
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.quoteMark, { color: t.colors.accent, fontFamily: t.fonts.serif }]}
        >
          “
        </Text>

        <Row style={styles.between}>
          <Text variant="overline" tone="accent">
            {label.toUpperCase()}
          </Text>
          {date ? (
            <Text variant="overline" tone="subtle">
              {date}
            </Text>
          ) : null}
        </Row>

        <Text style={[t.typography.title, styles.heroVerse, { color: t.colors.text }]}>
          {verse.text}
        </Text>

        <Row style={[styles.between, styles.heroFooter]}>
          <Text variant="callout" tone="muted">
            {verse.reference}
          </Text>
          {onPress ? (
            <Row gap={6}>
              <Text variant="callout" tone="accent">
                Explore
              </Text>
              <Ionicons name="arrow-forward" size={15} color={t.colors.accent} />
            </Row>
          ) : null}
        </Row>
      </View>
    </Pressable>
  );
}

/** A single verse quoted on a card — home shelf, search results, note anchors. */
export function VerseCard({
  verse,
  label,
  onPress,
  footer,
}: {
  verse: Verse;
  label?: string;
  onPress?: () => void;
  footer?: React.ReactNode;
}) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${verse.reference}. ${verse.text}` : undefined}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.7 : 1 })}
    >
      <Card style={{ gap: t.spacing.md }}>
        {label ? (
          <Text variant="overline" tone="accent">
            {label.toUpperCase()}
          </Text>
        ) : null}

        <Text variant="quote">{verse.text}</Text>

        <Row style={styles.between}>
          <Text variant="callout" tone="muted">
            {verse.reference}
          </Text>
          {footer ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={t.colors.textSubtle} /> : null)}
        </Row>
      </Card>
    </Pressable>
  );
}

/** One line in the chapter reader: hanging verse number, then the text. */
export function VerseLine({
  verse,
  selected,
  onPress,
}: {
  verse: Verse;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Verse ${verse.number}. ${verse.text}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.verseLine,
        {
          backgroundColor: selected
            ? t.colors.highlight
            : pressed
              ? t.colors.surfaceMuted
              : 'transparent',
          borderRadius: t.radius.sm,
          paddingVertical: t.spacing.xs,
          paddingHorizontal: t.spacing.sm,
          marginHorizontal: -t.spacing.sm,
        },
      ]}
    >
      <Text variant="caption" tone="subtle" style={styles.verseNumber}>
        {verse.number}
      </Text>
      <Text variant="scripture" style={styles.verseText}>
        {verse.text}
      </Text>
    </Pressable>
  );
}

/**
 * The four-part explanation.
 *
 * Ordered summary → meaning → context → application deliberately: the reader
 * gets the one-sentence answer immediately and can stop there, or keep going.
 */
export function ExplanationView({
  explanation,
  onSelectRelated,
}: {
  explanation: ExplanationWithVerse;
  onSelectRelated?: (reference: string) => void;
}) {
  const t = useTheme();

  const { t: tr } = useLocale();

  const sections = [
    { key: 'meaning', label: 'explain.meaning', body: explanation.meaning, icon: 'book-outline' },
    { key: 'context', label: 'explain.context', body: explanation.context, icon: 'time-outline' },
    {
      key: 'application',
      label: 'explain.application',
      body: explanation.application,
      icon: 'footsteps-outline',
    },
  ] as const;

  return (
    <FadeIn style={{ gap: t.spacing.xl }}>
      <Card style={{ gap: t.spacing.md }}>
        <Row style={styles.between}>
          <Text variant="overline" tone="accent">
            {explanation.verse.reference.toUpperCase()}
          </Text>
          {explanation.cached ? <Badge label={tr('explain.saved')} /> : null}
        </Row>

        <Text variant="quote">{explanation.verse.text}</Text>
        <Divider />
        <Text variant="heading" style={{ lineHeight: 25 }}>
          {explanation.summary}
        </Text>
      </Card>

      {sections.map((section) => (
        <View key={section.key} style={{ gap: t.spacing.sm }}>
          <Row gap={6}>
            <Ionicons name={section.icon} size={14} color={t.colors.textSubtle} />
            <Text variant="overline" tone="subtle">
              {tr(section.label).toUpperCase()}
            </Text>
          </Row>
          <Text variant="body" style={{ lineHeight: 24 }}>
            {section.body}
          </Text>
        </View>
      ))}

      {explanation.related_verses.length > 0 ? (
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            {tr('explain.readAlongside').toUpperCase()}
          </Text>
          {explanation.related_verses.map((related) => (
            <Pressable
              key={related.reference}
              onPress={() => onSelectRelated?.(related.reference)}
              disabled={!onSelectRelated}
              accessibilityRole={onSelectRelated ? 'button' : undefined}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Card variant="muted" style={styles.relatedCard}>
                <View style={styles.relatedBody}>
                  <Text variant="heading">{related.reference}</Text>
                  <Text variant="caption" tone="muted">
                    {related.reason}
                  </Text>
                </View>
                {onSelectRelated ? (
                  <Ionicons name="arrow-forward" size={15} color={t.colors.textSubtle} />
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Honesty about provenance. Readers deserve to know a machine wrote this. */}
      <Text variant="caption" tone="subtle" style={styles.disclaimer}>
        {tr('explain.disclaimer')} Model: {explanation.model}.
      </Text>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  hero: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  quoteMark: { position: 'absolute', top: -22, right: 8, fontSize: 96, lineHeight: 96, opacity: 0.1 },
  heroVerse: { marginTop: 16, fontSize: 25, lineHeight: 37, letterSpacing: -0.2 },
  heroFooter: { marginTop: 20 },
  imageArt: {
    width: '100%',
    // Locked to the source images' exact ratio (1408×768) so "cover" fills the
    // card with no cropping at all — the whole picture always shows.
    aspectRatio: 1.833,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(22,18,12,0.34)',
  },
  imageOverlay: { paddingHorizontal: 30, paddingVertical: 26, alignItems: 'center', gap: 14 },
  imageLabel: {
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  imageVerse: {
    fontSize: 21,
    lineHeight: 31,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  imageFooter: { marginTop: 2 },
  imageRef: {
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  verseLine: { flexDirection: 'row', alignItems: 'flex-start' },
  verseNumber: { width: 26, paddingTop: 8 },
  verseText: { flex: 1 },
  relatedCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  relatedBody: { flex: 1, gap: 2 },
  disclaimer: { marginTop: 4 },
});
