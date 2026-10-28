import { useState } from 'react';
import { Keyboard, Modal, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Button, DialogSurface, Notice, Txt } from '@/components/smart/ui';

/** Guards route removal; it does not retain work across app/session termination. */
export function useWorkExit(dirty: boolean, saving: boolean) {
  const navigation = useNavigation();
  const [pending, setPending] = useState<{ proceed: () => void } | null>(null);
  usePreventRemove(dirty || saving, ({ data }) => {
    Keyboard.dismiss();
    setPending({ proceed: () => navigation.dispatch(data.action) });
  });
  const cancel = () => setPending(null);
  const leave = () => {
    if (!pending || saving) return;
    setPending(null);
    pending.proceed();
  };
  return <Modal visible={!!pending} transparent animationType="none" onRequestClose={cancel}>
    <DialogSurface>
      <Txt size={22} weight="800" accessibilityRole="header">{saving ? 'Work save in progress' : dirty ? 'Discard unsaved work?' : 'Leave work editor?'}</Txt>
      {saving ? <Notice>Wait for the save result before leaving. A save already sent to the server cannot be cancelled here.</Notice> : <Txt>{dirty ? 'Your unsaved findings, notes, checklist changes and any pending part will be discarded from this editor. Recorded server work stays available.' : 'Your work was recorded. You can now leave this editor.'}</Txt>}
      <View style={{ gap: 10 }}>
        <Button label="Stay in editor" variant="secondary" onPress={cancel} />
        <Button label={dirty ? 'Discard and leave' : 'Leave editor'} variant={dirty ? 'danger' : 'primary'} disabled={saving} onPress={leave} />
      </View>
    </DialogSurface>
  </Modal>;
}
