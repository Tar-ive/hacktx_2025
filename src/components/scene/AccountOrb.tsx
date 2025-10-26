import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Mesh } from 'three';
import type { AccountConfig } from '../../data/constellation.ts';

interface AccountOrbProps {
  account: AccountConfig;
  phaseOffset: number;
  reducedMotion: boolean;
  active: boolean;
  onSelect: () => void;
}

const COLOR_BY_TYPE: Record<AccountConfig['type'], string> = {
  checking: '#10B981',
  savings: '#3B82F6',
  credit: '#8B5CF6'
};

const ACTIVITY_MULTIPLIER: Record<AccountConfig['activityLevel'], number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.9
};

export function AccountOrb({
  account,
  phaseOffset,
  reducedMotion,
  active,
  onSelect
}: AccountOrbProps) {
  const meshRef = useRef<Mesh>(null);
  const scaleVector = useMemo(() => new Vector3(1, 1, 1), []);
  const baseRadius = useMemo(() => 3 + (account.balance > 0 ? 0.4 : -0.2), [account.balance]);
  const orbitSpeed = 0.6 + ACTIVITY_MULTIPLIER[account.activityLevel];
  const scale = useMemo(() => {
    const absoluteBalance = Math.abs(account.balance);
    return Math.min(Math.max(absoluteBalance / 5000, 0.3), 1.5);
  }, [account.balance]);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const time = clock.elapsedTime;
    const radius = baseRadius + Math.sin(time * 0.5 + phaseOffset) * 0.3;
    const x = Math.cos(time * orbitSpeed + phaseOffset) * radius;
    const z = Math.sin(time * orbitSpeed + phaseOffset) * radius;
    const y = reducedMotion ? 0 : Math.sin(time * 1.2 + phaseOffset) * 0.2;
    meshRef.current.position.set(x, y, z);

    const targetScale = active ? scale * 1.2 : scale;
    scaleVector.setScalar(targetScale);
    meshRef.current.scale.lerp(scaleVector, 0.1);
  });

  return (
    <mesh ref={meshRef} onPointerDown={onSelect}>
      <sphereGeometry args={[0.4, 24, 24]} />
      <meshStandardMaterial
        color={COLOR_BY_TYPE[account.type]}
        emissive={COLOR_BY_TYPE[account.type]}
        emissiveIntensity={active ? 1 : 0.6}
        roughness={0.5}
        metalness={0.3}
      />
    </mesh>
  );
}
