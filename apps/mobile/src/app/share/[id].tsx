/**
 * Share a verse as an image.
 *
 * Reached from the verse screen's header. Renders the shareable card, captures
 * it to a PNG, and hands it to the OS share sheet (or a download on web).
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Platform, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import * as api from '@/api/endpoints';
import { useAsync } from '@/api/useAsync';
import { Screen } from '@/components/screen';
import { ShareableVerse } from '@/components/shareable';
import { ErrorState, LoadingState } from '@/components/states';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export default function ShareScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const verse = useAsync((signal) => api.getVerse(Number(id), signal), [id]);
  const cardWidth = Math.min(width - t.spacing.lg * 2, 420);
  const onWeb = Platform.OS === 'web';

  async function shareImage() {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });

      if (onWeb) {
        // No native share sheet on the web preview — offer a download instead.
        const doc = (globalThis as { document?: any }).document;
        if (doc) {
          const link = doc.createElement('a');
          link.href = uri;
          link.download = `selah-${verse.data?.reference ?? 'verse'}.png`.replace(/[:\s]/g, '-');
          link.click();
        }
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share this verse',
        });
      } else {
        Alert.alert('Sharing unavailable', 'This device cannot open the share sheet.');
      }
    } catch {
      Alert.alert('Could not create image', 'Something went wrong while making the image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Share' }} />

      <Screen edges={{ top: false }}>
        {verse.isLoading ? <LoadingState label="Preparing the image…" /> : null}
        {verse.error ? <ErrorState error={verse.error} onRetry={verse.refresh} /> : null}

        {verse.data ? (
          <View style={{ alignItems: 'center', gap: t.spacing.xxl }}>
            <ShareableVerse ref={cardRef} verse={verse.data} width={cardWidth} />

            <View style={{ alignSelf: 'stretch', gap: t.spacing.sm }}>
              <Button
                title={onWeb ? 'Download image' : 'Share image'}
                icon={onWeb ? 'download-outline' : 'share-outline'}
                fullWidth
                loading={busy}
                onPress={shareImage}
              />
              <Text variant="caption" tone="subtle" center>
                A calm image to keep or pass along — the verse, and where it lives.
              </Text>
            </View>
          </View>
        ) : null}
      </Screen>
    </>
  );
}
