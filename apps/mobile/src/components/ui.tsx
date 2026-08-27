/**
 * The design system's primitives.
 *
 * Every screen is built from these, so spacing, colour and type stay consistent
 * without anyone having to remember the tokens.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps as RNTextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { Glass } from '@/components/glass';
import { selectFeedback, tapFeedback } from '@/components/haptics';
import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
type Variant = keyof ReturnType<typeof useTheme>['typography'];
type Tone = 'default' | 'muted' | 'subtle' | 'accent' | 'gold' | 'danger' | 'onAccent';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
}

export function Text({ variant = 'body', tone = 'default', center, style, ...rest }: TextProps) {
  const t = useTheme();
  const color = {
    default: t.colors.text,
    muted: t.colors.textMuted,
    subtle: t.colors.textSubtle,
    accent: t.colors.accent,
    gold: t.colors.gold,
    danger: t.colors.danger,
    onAccent: t.colors.textOnAccent,
  }[tone];

  return (
    <RNText
      style={[t.typography[variant] as TextStyle, { color }, center && styles.center, style]}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
interface CardProps extends ViewProps {
  /** `flat` drops the shadow — right for cards inside a list. */
  variant?: 'raised' | 'flat' | 'muted';
  padded?: boolean;
}

export function Card({ variant = 'raised', padded = true, style, ...rest }: CardProps) {
  const t = useTheme();
  const base = {
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    padding: padded ? t.spacing.lg : 0,
  };

  // Raised cards are frosted glass; flat/muted stay solid (they fill lists).
  if (variant === 'raised') {
    return <Glass style={[base, t.shadow.card, style]} {...rest} />;
  }
  return (
    <View
      style={[
        { backgroundColor: variant === 'muted' ? t.colors.surfaceMuted : t.colors.surface, ...base },
        style,
      ]}
      {...rest}
    />
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border }, style]}
    />
  );
}

export function Row({ gap = 8, style, ...rest }: ViewProps & { gap?: number }) {
  return <View style={[styles.row, { gap }, style]} {...rest} />;
}

export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ height: size }} />;
}

/** A small all-caps label above a group of content. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: t.spacing.md }]}>
      <Text variant="overline" tone="subtle">
        {title.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  icon,
  loading,
  fullWidth,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const background = {
    primary: t.colors.accent,
    secondary: t.colors.surfaceMuted,
    ghost: 'transparent',
  }[variant];

  const foreground = {
    primary: t.colors.textOnAccent,
    secondary: t.colors.text,
    ghost: t.colors.accent,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPressIn={tapFeedback}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && variant === 'primary' ? t.colors.accentPressed : background,
          borderRadius: t.radius.md,
          paddingHorizontal: t.spacing.lg,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: t.colors.border,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={foreground} /> : null}
          <RNText style={[t.typography.heading as TextStyle, { color: foreground }]}>
            {title}
          </RNText>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Input — a text field that actually looks like one
// ---------------------------------------------------------------------------
interface InputProps extends TextInputProps {
  /** A leading icon makes the field unmistakable — e.g. a search glass. */
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ icon, style, ...rest }: InputProps) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.inputWrap,
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderRadius: t.radius.md,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={t.colors.textSubtle} /> : null}
      <RNTextInput
        placeholderTextColor={t.colors.textSubtle}
        style={[styles.input, t.typography.body as TextStyle, { color: t.colors.text }, style]}
        {...rest}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pill — filter chips and tone selectors
// ---------------------------------------------------------------------------
interface PillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Pill({ label, selected, onPress, icon }: PillProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={
        onPress
          ? () => {
              tapFeedback();
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? t.colors.accentMuted : t.colors.surfaceMuted,
          borderColor: selected ? t.colors.accent : t.colors.border,
          borderRadius: t.radius.pill,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={13} color={selected ? t.colors.accent : t.colors.textMuted} />
      ) : null}
      <Text variant="callout" tone={selected ? 'accent' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Segmented — the Immersion / Study style switch
// ---------------------------------------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.segmented,
        {
          backgroundColor: t.colors.surfaceMuted,
          borderColor: t.colors.border,
          borderRadius: t.radius.pill,
        },
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              selectFeedback();
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              { borderRadius: t.radius.pill },
              active ? [{ backgroundColor: t.colors.surface }, t.shadow.card] : null,
            ]}
          >
            <RNText
              style={[
                t.typography.overline as TextStyle,
                { color: active ? t.colors.text : t.colors.textSubtle },
              ]}
            >
              {option.label.toUpperCase()}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A tiny badge — "Premium", "Cached", "WEB". */
export function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'gold' }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tone === 'gold' ? t.colors.goldMuted : t.colors.surfaceMuted,
          borderRadius: t.radius.sm,
        },
      ]}
    >
      <Text variant="overline" tone={tone === 'gold' ? 'gold' : 'subtle'}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  fullWidth: { alignSelf: 'stretch' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmented: { flexDirection: 'row', alignSelf: 'center', padding: 3, borderWidth: StyleSheet.hairlineWidth },
  segment: { paddingHorizontal: 20, paddingVertical: 7 },
  badge: { paddingHorizontal: 7, paddingVertical: 3 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: 12 },
});
