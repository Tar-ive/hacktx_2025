import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { TransactionFlow } from '../../data/constellation.ts';

interface TransactionParticleProps {
  flow: TransactionFlow;
  seed: number;
  color: string;
}

export function TransactionParticle({ flow, seed, color }: TransactionParticleProps) {
  const meshRef = useRef<Mesh>(null);

  const direction = flow.direction === 'inbound' ? -1 : 1;
  const speed = useMemo(() => 0.4 + Math.min(Math.abs(flow.amount) / 2000, 1), [flow.amount]);
  const baseRadius = useMemo(() => 6 + (seed % 1) * 4, [seed]);
  const verticalPhase = useMemo(() => seed * Math.PI * 2, [seed]);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const progress = ((clock.elapsedTime * speed + seed) % 1 + 1) % 1;
    const angle = seed * Math.PI * 2;

    const distance = direction === -1 ? baseRadius * (1 - progress) : baseRadius * progress;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = Math.sin(progress * Math.PI + verticalPhase) * 0.6;

    meshRef.current.position.set(x, y, z);
    const scale = 0.08 + Math.min(flow.amount / 2000, 0.15);
    meshRef.current.scale.setScalar(scale);
    const material = meshRef.current.material as MeshBasicMaterial;
    if (!Array.isArray(material)) {
      material.opacity = direction === -1 ? progress : 1 - progress * 0.5;
      material.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}
