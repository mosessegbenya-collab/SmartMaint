import { TimelineItem } from './status-ui';
import type { StatusEvent } from '@/domain/event-chronology';

export function EquipmentEventTimeline({ events }: { events: StatusEvent[] }) {
  return <>{events.map((event, index) => <TimelineItem key={event.id} title={event.title} detail={event.detail} at={event.at} icon={event.kind === 'hold' ? 'lock-closed-outline' : event.kind === 'resolved' || event.kind === 'release' ? 'shield-checkmark-outline' : event.kind === 'verification' ? 'clipboard-outline' : event.kind === 'repair' ? 'construct-outline' : 'document-text-outline'} tone={event.kind === 'hold' ? 'danger' : event.kind === 'resolved' || event.kind === 'release' ? 'success' : event.kind === 'administrative' ? 'neutral' : 'info'} last={index === events.length - 1} />)}</>;
}
