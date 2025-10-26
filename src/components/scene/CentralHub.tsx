import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface CentralHubProps {
  netWorth: number;
  healthScore: number;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
}

function mapHealthToColor(score: number): string {
  if (score >= 80) return '#52f6a1';
  if (score >= 60) return '#3ba0ff';
  if (score >= 40) return '#facc15';
  if (score >= 20) return '#fb923c';
  return '#ef4444';
}

export function CentralHub({
  netWorth,
  healthScore,
  selected,
  reducedMotion,
  onSelect
}: CentralHubProps) {
  const meshRef = useRef<Mesh>(null);
  const pulseStrength = reducedMotion ? 0 : 0.02;

  const radius = useMemo(() => {
    const base = Math.cbrt(Math.max(netWorth, 1)) / 15;
    return Math.min(Math.max(base, 1.5), 3);
  }, [netWorth]);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.5) * pulseStrength;
    meshRef.current.scale.setScalar(pulse);
  });

  const color = mapHealthToColor(healthScore);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} onPointerDown={onSelect}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 1.4 : 0.8}
        roughness={0.2}
        metalness={0.6}
      />
    </mesh>
  );
}
