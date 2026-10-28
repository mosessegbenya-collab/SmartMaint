import { View } from 'react-native';
import { Button, Notice } from '@/components/smart/ui';

export function QueueAvailability({ available, loading = false, error, reload }: { available: boolean; loading?: boolean; error?: string; reload?: () => void }) {
  return <View style={{ gap: 12 }}>
    <Notice tone={available || loading ? 'info' : 'warning'}>{loading ? 'Checking the private queue and stored server receipts. Submission status is not confirmed until these checks finish.' : available ? 'Private queue ready for this approved account. Check each report for its confirmed server receipt.' : reload ? 'The private queue could not be loaded. Reload it to check saved attempts; their data and retry limits are preserved.' : 'Private queue unavailable. Reconnect with an approved account on Android or iOS.'}</Notice>
    {!!error && <Notice tone="warning">{error}</Notice>}
    {!available && !!reload && <Button label="Reload private queue" variant="secondary" loading={loading} onPress={reload} />}
  </View>;
}
