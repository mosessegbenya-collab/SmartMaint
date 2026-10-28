import { useEffect, useRef, useState } from 'react';
import { Choices, Detail, Notice, Screen } from '@/components/smart/ui';
import { PublicationQueueLoader, type QueueLoadState } from '@/domain/publication-queue-loader';
import { QueueAvailability } from '@/features/staff/queue-availability';
import { authErrorMessage } from '@/features/access/auth-policy';

export function QueueLoadingPreview() {
  const [scenario, setScenario] = useState('Transient failure');
  return <Screen title="Private queue loading" subtitle="Development component reference">
    <Notice>Fictional checks only. No private queue, server receipt or maintenance data is read or changed.</Notice>
    <Choices label="Queue loading example" values={['Transient failure', 'Incomplete data', 'Ready']} value={scenario} onChange={setScenario} />
    <Example key={scenario} scenario={scenario} />
  </Screen>;
}

function Example({ scenario }: { scenario: string }) {
  const [state, setState] = useState<QueueLoadState>({ phase: 'loading' });
  const [attempts, setAttempts] = useState(0);
  const reload = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    let active = true, count = 0;
    const loader = new PublicationQueueLoader(async () => {
      count += 1; setAttempts(count);
      await new Promise(resolve => setTimeout(resolve, 800));
      if (scenario === 'Incomplete data') throw Error('Sample private queue is incomplete. Its saved data has been preserved for review.');
      if (scenario === 'Transient failure' && count === 1) throw Error('Sample device storage was temporarily unavailable.');
      return [];
    }, () => active, setState);
    reload.current = () => loader.retry();
    void loader.ensureLoaded().catch(() => {});
    return () => { active = false; reload.current = null; };
  }, [scenario]);
  return <>
    <QueueAvailability available={state.phase === 'ready'} loading={state.phase === 'loading'} error={state.phase === 'failed' ? authErrorMessage(state.error) : ''} reload={() => { void reload.current?.().catch(() => {}); }} />
    <Detail label="Sample load attempts" value={String(attempts)} />
    <Detail label="Sample submission attempts" value="0" />
    {state.phase === 'ready' && <Notice>No sample reports were submitted. Reloading checks saved state; it does not confirm a report receipt.</Notice>}
  </>;
}
