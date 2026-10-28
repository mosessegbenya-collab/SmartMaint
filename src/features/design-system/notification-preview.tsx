import { useState } from 'react';
import { Detail, Notice, Screen } from '@/components/smart/ui';
import { NotificationCard } from '@/components/smart/notification-card';

export function NotificationPreview() {
  const [readAt, setReadAt] = useState<number | undefined>();
  const [opened, setOpened] = useState(0);
  return <Screen title="Recorded equipment notice" subtitle="Development component reference">
    <Notice>Fictional notification only. No inbox, equipment record or release decision is changed.</Notice>
    <Detail label="Sample equipment opens" value={String(opened)} />
    <NotificationCard notice={{ title: 'Return-to-service decision recorded', body: 'An authorized decision was recorded. Later faults or holds can invalidate that decision.', targetKind: 'equipment', createdAt: Date.UTC(2026, 9, 27, 8), readAt }} openRecord={() => setOpened(n => n + 1)} markRead={async read => setReadAt(read ? Date.UTC(2026, 9, 28, 8) : undefined)} />
  </Screen>;
}
