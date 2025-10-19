import { useMemo } from 'react';
import { TransactionFlow } from '../../data/constellation.ts';
import type { PerformanceMode } from '../../App.tsx';
import { TransactionParticle } from './TransactionParticle.tsx';

interface TransactionParticlesProps {
  flows: TransactionFlow[];
  reducedMotion: boolean;
  performanceMode: PerformanceMode;
}

const COLOR_BY_CATEGORY: Record<TransactionFlow['category'], string> = {
  bills: '#60A5FA',
  entertainment: '#A855F7',
  food: '#34D399',
  income: '#FDE68A'
};

export function TransactionParticles({ flows, reducedMotion, performanceMode }: TransactionParticlesProps) {
  const repeatCount = performanceMode === 'high' ? 8 : performanceMode === 'medium' ? 4 : 2;

  const particles = useMemo(
    () =>
      Array.from({ length: flows.length * repeatCount }).map((_, index) => {
        const flow = flows[index % flows.length];
        const seed = index / flows.length;
        return {
          flow,
          color: COLOR_BY_CATEGORY[flow.category],
          seed
        };
      }),
    [flows, repeatCount]
  );

  if (reducedMotion) {
    return null;
  }

  return (
    <group>
      {particles.map((particle, index) => (
        <TransactionParticle
          key={`${particle.flow.id}-${index}`}
          flow={particle.flow}
          seed={particle.seed}
          color={particle.color}
        />
      ))}
    </group>
  );
}
