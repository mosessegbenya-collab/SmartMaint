import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Notice, Txt, usePalette } from '@/components/smart/ui';
import { layout, spacing } from '@/design/tokens';
import { useApp } from '@/state/app-state';
import { AuthHeader } from './auth-header';

/** Presentation only: this surface has no navigation or protected-data hooks. */
export function SessionRestoration({ timedOut, onRetry }: { timedOut: boolean; onRetry: () => void }) {
  const p = usePalette();
  const { dark } = useApp();
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: p.background }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, gap: spacing.xl, justifyContent: 'center' }}>
      <AuthHeader />
      <Card style={{ gap: spacing.lg, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
        <ActivityIndicator color={p.secondary} accessibilityLabel="Checking saved sign-in" />
        <Txt variant="title" accessibilityRole="header">Restoring secure session</Txt>
        <Txt>Checking your saved sign-in before opening account records.</Txt>
        {timedOut && <View accessibilityLiveRegion="polite"><Notice tone="warning">Sign-in services are taking longer than expected. Check your connection and retry.</Notice></View>}
        {timedOut && <Button label="Retry secure sign-in" onPress={onRetry} />}
        <Txt variant="caption" muted>Protected records stay unavailable until this check finishes. Restoring a sign-in does not change your approved staff access.</Txt>
      </Card>
    </ScrollView>
  </SafeAreaView>;
}
