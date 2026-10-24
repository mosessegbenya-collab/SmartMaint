import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Icon, Row, Screen, Txt } from '@/components/smart/ui';
import { go } from '@/navigation/go';

export function EmergencyIntroduction() {
  return <Screen>
    <Card style={{ gap: 10, backgroundColor: '#FFF0F2', borderColor: '#FFC8D0' }}><Row><Icon name="warning" size={48} color="#C92E40" /><View style={{ flex: 1, gap: 5 }}><Txt size={25} weight="800">Emergency Reporting</Txt><Txt color="#C92E40" size={16}>For urgent equipment safety concerns.</Txt></View></Row></Card>
    <Txt size={17} style={{ paddingVertical: 8 }}>Use this option to report equipment that may be unsafe, has failed, or poses a risk to safety.</Txt>
    {([{ title: 'Urgent issues only', detail: 'Select this option for equipment faults that may affect safety.', icon: 'alert-circle' }, { title: 'Do not include patient information', detail: 'Do not enter patient names, numbers or identifiable information.', icon: 'document-text' }, { title: 'Approved staff access required', detail: 'This report is recorded under your approved staff identity.', icon: 'shield-checkmark' }] as const).map((item) => <Card key={item.title} style={{ paddingVertical: 21 }}><Row style={{ alignItems: 'flex-start' }}><Icon name={item.icon} size={35} color={item.icon === 'alert-circle' ? '#C92E40' : '#0866E8'} /><View style={{ flex: 1, gap: 8 }}><Txt size={18} weight="700">{item.title}</Txt><Txt muted size={16}>{item.detail}</Txt></View></Row></Card>)}
    <Txt size={12} muted>Follow your institution’s emergency response procedure. This app does not confirm that emergency personnel have been contacted.</Txt>
    <Button label="Continue to equipment identification" icon="arrow-forward" onPress={() => go('emergency-verify')} /><Button label="Cancel" variant="secondary" onPress={() => router.replace('/workspace/home')} />
  </Screen>;
}
