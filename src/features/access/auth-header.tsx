import { Image, View } from 'react-native';
import { brandAssets, Icon, Row, Txt, usePalette } from '@/components/smart/ui';
import { useCurrentTime } from '@/hooks/use-current-time';

/** App content only; the device owns its status bar and clock. */
export function AuthHeader({ date = false }: { date?: boolean }) {
  const now = useCurrentTime();
  const p = usePalette();
  return <Row style={{ paddingHorizontal: 16, paddingVertical: date ? 6 : 10, minHeight: date ? 64 : 76, justifyContent: date ? 'space-between' : 'center', flexWrap: 'wrap' }}>
    <Row style={{ gap: 7 }}>
      <Image source={brandAssets.logo} style={{ width: 52, height: 52 }} accessibilityLabel="SmartMaint gear and heartbeat logo" />
      <Txt size={date ? 27 : 30} weight="800" color={p.text}>Smart<Txt size={date ? 27 : 30} weight="800" color="#0866E8">Maint</Txt></Txt>
    </Row>
    {date && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: p.input }}>
      <Icon name="calendar-outline" size={18} color={p.secondary} />
      <Txt size={11} muted>{new Date(now).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</Txt>
    </View>}
  </Row>;
}
