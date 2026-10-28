import { View } from 'react-native';
import { Badge, Button, Card, Icon, Row, Txt, usePalette } from './ui';
import { ConfirmAction } from '@/features/staff/ui';

export type InboxNotice = { title: string; body: string; targetKind: 'task' | 'report' | 'equipment'; createdAt: number; readAt?: number };
export function NotificationCard({ notice, openRecord, markRead }: { notice: InboxNotice; openRecord: () => void; markRead: (read: boolean) => Promise<unknown> }) {
  const p = usePalette();
  const unread = notice.readAt === undefined;
  const destination = notice.targetKind === 'equipment' ? 'equipment status' : notice.targetKind === 'task' ? 'maintenance task' : 'fault report';
  return <Card style={{ gap: 12 }}>
    <Row style={{ alignItems: 'flex-start' }}>
      <View style={{ backgroundColor: p.input, borderRadius: 30, padding: 12 }}><Icon name={notice.targetKind === 'task' ? 'construct-outline' : notice.targetKind === 'equipment' ? 'medkit-outline' : 'document-text-outline'} size={25} /></View>
      <View style={{ flex: 1, gap: 6 }}><Txt weight="700" size={18}>{notice.title}</Txt><Row style={{ flexWrap: 'wrap' }}><Badge label={unread ? 'Unread' : 'Read'} tone="neutral" /><Txt variant="caption" muted>Recorded event</Txt></Row><Txt muted>{notice.body}</Txt><Txt variant="caption" muted>{new Date(notice.createdAt).toLocaleString()}</Txt></View>
    </Row>
    {notice.targetKind === 'equipment' && <Txt variant="caption" muted>This event may have been superseded. Review current equipment availability before use.</Txt>}
    <Button label={`Open ${destination}`} variant="secondary" icon="chevron-forward" onPress={openRecord} />
    <ConfirmAction key={String(notice.readAt)} label={unread ? 'Mark read' : 'Mark unread'} title="Update notification?" detail="This changes only your inbox state. It does not acknowledge a repair, verification or equipment release." onConfirm={() => markRead(unread)} />
  </Card>;
}
