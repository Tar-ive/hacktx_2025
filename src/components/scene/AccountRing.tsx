import { useMemo } from 'react';
import type { AccountConfig } from '../../data/constellation.ts';
import type { SelectedEntity } from '../../App.tsx';
import { AccountOrb } from './AccountOrb.tsx';

interface AccountRingProps {
  accounts: AccountConfig[];
  reducedMotion: boolean;
  selected: SelectedEntity;
  onSelect: (entity: SelectedEntity) => void;
}

export function AccountRing({ accounts, reducedMotion, selected, onSelect }: AccountRingProps) {
  const phases = useMemo(() =>
    accounts.map((_, index) => (index / accounts.length) * Math.PI * 2),
  [accounts]);

  return (
    <group>
      {accounts.map((account, index) => (
        <AccountOrb
          key={account.id}
          account={account}
          phaseOffset={phases[index]}
          reducedMotion={reducedMotion}
          active={selected?.type === 'account' && selected.id === account.id}
          onSelect={() => onSelect({ type: 'account', id: account.id })}
        />
      ))}
    </group>
  );
}
