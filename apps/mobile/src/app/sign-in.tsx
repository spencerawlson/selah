/**
 * Sign in / sign up.
 *
 * One screen, one toggle — a separate sign-up route would double the surface
 * for no benefit at this size.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Screen } from '@/components/screen';
import { Button, Card, Divider, Text } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/state/locale';
import { useTheme } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const t = useTheme();
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { t: tr } = useLocale();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const canSubmit =
    email.trim().length > 3 && password.length >= 8 && (!isSignUp || displayName.trim().length > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (isSignUp) await signUp(email, password, displayName);
      else await signIn(email, password);
      router.back();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tr('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    t.typography.body,
    { backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.md, color: t.colors.text },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fill}
    >
      <Screen
        title={isSignUp ? tr('signin.createTitle') : tr('signin.welcomeTitle')}
        subtitle={isSignUp ? tr('signin.createSubtitle') : tr('signin.welcomeSubtitle')}
        edges={{ top: false }}
      >
        <Card style={{ gap: t.spacing.md }}>
          {isSignUp ? (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={tr('signin.name')}
              placeholderTextColor={t.colors.textSubtle}
              autoCapitalize="words"
              autoComplete="name"
              accessibilityLabel="Your name"
              style={inputStyle}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={tr('signin.email')}
            placeholderTextColor={t.colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="Email"
            style={inputStyle}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={tr('signin.password')}
            placeholderTextColor={t.colors.textSubtle}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            accessibilityLabel="Password"
            onSubmitEditing={() => canSubmit && void submit()}
            style={inputStyle}
          />

          {error ? (
            <Text variant="callout" tone="danger">
              {error}
            </Text>
          ) : null}

          <Button
            title={isSignUp ? tr('signin.createBtn') : tr('signin.signInBtn')}
            fullWidth
            loading={busy}
            disabled={!canSubmit}
            onPress={submit}
          />

          <Divider />

          <Button
            title={isSignUp ? tr('signin.haveAccount') : tr('signin.newHere')}
            variant="ghost"
            onPress={() => {
              setMode(isSignUp ? 'sign-in' : 'sign-up');
              setError(null);
            }}
          />
        </Card>

        {/* Development affordance. Delete this block before you ship. */}
        <View style={{ marginTop: t.spacing.xl }}>
          <Card variant="muted" style={{ gap: t.spacing.sm }}>
            <Text variant="overline" tone="subtle">
              DEMO ACCOUNT
            </Text>
            <Text variant="caption" tone="muted">
              The seeded local account is demo@selah.app / selah-demo-2024. It only exists when
              ENVIRONMENT=local.
            </Text>
            <Button
              title="Use the demo account"
              variant="secondary"
              onPress={() => {
                setMode('sign-in');
                setEmail('demo@selah.app');
                setPassword('selah-demo-2024');
              }}
            />
          </Card>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
});
