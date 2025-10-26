import { useMemo } from 'react';
import { AgentConfig } from '../../data/constellation.ts';
import type { SelectedEntity } from '../../App.tsx';
import { AgentOrb } from './AgentOrb.tsx';

interface AgentSwarmProps {
  agents: AgentConfig[];
  reducedMotion: boolean;
  selected: SelectedEntity;
  onSelect: (entity: SelectedEntity) => void;
}

export function AgentSwarm({ agents, reducedMotion, selected, onSelect }: AgentSwarmProps) {
  const phases = useMemo(() =>
    Object.fromEntries(
      agents.map((agent, index) => [agent.id, (index / agents.length) * Math.PI * 2])
    ),
  [agents]);

  return (
    <group>
      {agents.map((agent) => (
        <AgentOrb
          key={agent.id}
          agent={agent}
          initialPhase={phases[agent.id]}
          reducedMotion={reducedMotion}
          active={selected?.type === 'agent' && selected.id === agent.id}
          onSelect={() => onSelect({ type: 'agent', id: agent.id })}
        />
      ))}
    </group>
  );
}
