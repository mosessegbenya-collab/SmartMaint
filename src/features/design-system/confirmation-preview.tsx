import { useState } from 'react';
import { Choices, Detail, Field, Notice, Screen, Select } from '@/components/smart/ui';
import { ConfirmAction } from '@/features/staff/ui';
import { DateTimeField } from '@/components/smart/date-time-field';

export function ConfirmationPreview() {
  const [example, setExample] = useState('Long review');
  const [note, setNote] = useState('Fictional maintenance findings');
  const [attempts, setAttempts] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [priority, setPriority] = useState('Routine');
  const [due, setDue] = useState('2026-11-05T12:00:00Z');
  return <Screen title="Confirmation preview" subtitle="Development component reference">
    <Notice>Fictional actions only. No maintenance record, report or device file is changed.</Notice>
    <Choices label="Confirmation example" values={['Long review', 'Failed action', 'Slow action']} value={example} onChange={setExample} />
    <Field label="Sample work note" value={note} onChangeText={setNote} multiline />
    <Detail label="Action attempts" value={String(attempts)} /><Detail label="Confirmed sample actions" value={String(confirmed)} />
    <ConfirmAction key={example} label="Review sample action" title="Keep these reviewed maintenance details?" detail="Your next save will replace the current server work fields with the local details shown here. Review every field, including the diagnosis, supporting evidence, cause assessment, repair notes, parts and scheduled checklist. This review does not save or complete maintenance, independently verify a repair or authorize equipment use." onConfirm={async () => {
      setAttempts(prior => prior + 1);
      if (example === 'Slow action') await new Promise(resolve => setTimeout(resolve, 4000));
      if (example === 'Failed action') throw Error('The sample action could not be completed. Your local details remain available. Review the latest work order and its assignment before trying again. This example does not change any real maintenance record or equipment status.');
      setConfirmed(prior => prior + 1);
    }} />
    <Select label="Sample decision priority" value={priority} values={['Routine', 'High', 'Urgent']} onChange={setPriority} />
    <DateTimeField label="Sample maintenance date" value={due} onChange={setDue} />
  </Screen>;
}
