import { Pressable, View } from 'react-native';
import { Txt, usePalette } from './ui';

export function ReportSteps({ current, onChange }: { current: 1 | 2 | 3; onChange?: (step: 1 | 2 | 3) => void }) {
  const p = usePalette();
  return <View accessibilityLabel="Reporting progress" style={{ flexDirection: 'row', paddingVertical: 8 }}>
    {(['Details', 'Photos', 'Review'] as const).map((label, index) => {
      const step = (index + 1) as 1 | 2 | 3;
      const color = step <= current ? '#0866E8' : p.secondary;
      const content = <><View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}><Txt color="#FFFFFF" size={16} weight="600">{step}</Txt></View><Txt color={step === current ? '#0866E8' : p.secondary} size={13} weight={step === current ? '700' : '400'}>{label}</Txt></>;
      return <View key={label} style={{ flex: 1, alignItems: 'center' }}>{index < 2 && <View style={{ position: 'absolute', top: 15, left: '50%', width: '100%', height: 2, backgroundColor: step < current ? '#0866E8' : p.border }} />}{onChange ? <Pressable accessibilityRole="button" accessibilityLabel={`Step ${step}: ${label}`} accessibilityState={{ selected: step === current }} onPress={() => onChange(step)} style={{ alignItems: 'center', gap: 6, minHeight: 54, minWidth: 60 }}>{content}</Pressable> : <View style={{ alignItems: 'center', gap: 6 }}>{content}</View>}</View>;
    })}
  </View>;
}
