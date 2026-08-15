/**
 * Verse and explanation presentation.
 *
 * The rule these components enforce: scripture is set in serif at full
 * contrast, and everything the app adds around it is smaller, sans, and quieter.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ExplanationWithVerse, Verse } from '@selah/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, Divider, Row, Text } from '@/components/ui';
import { useTheme } from '@/theme';

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

  const sections = [
    { key: 'meaning', label: 'What it means', body: explanation.meaning, icon: 'book-outline' },
    { key: 'context', label: 'Context', body: explanation.context, icon: 'time-outline' },
    {
      key: 'application',
      label: 'Living it today',
      body: explanation.application,
      icon: 'footsteps-outline',
    },
  ] as const;

  return (
    <View style={{ gap: t.spacing.lg }}>
      <Card style={{ gap: t.spacing.md }}>
        <Row style={styles.between}>
          <Text variant="overline" tone="accent">
            {explanation.verse.reference.toUpperCase()}
          </Text>
          {explanation.cached ? <Badge label="Saved" /> : null}
        </Row>

        <Text variant="quote">{explanation.verse.text}</Text>
        <Divider />
        <Text variant="heading">{explanation.summary}</Text>
      </Card>

      {sections.map((section) => (
        <View key={section.key} style={{ gap: t.spacing.sm }}>
          <Row gap={6}>
            <Ionicons name={section.icon} size={14} color={t.colors.textSubtle} />
            <Text variant="overline" tone="subtle">
              {section.label.toUpperCase()}
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
            READ ALONGSIDE
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
        Generated by AI to help you study — not a substitute for the text itself, your own
        reading, or your community. Model: {explanation.model}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  verseLine: { flexDirection: 'row', alignItems: 'flex-start' },
  verseNumber: { width: 26, paddingTop: 8 },
  verseText: { flex: 1 },
  relatedCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  relatedBody: { flex: 1, gap: 2 },
  disclaimer: { marginTop: 4 },
});
