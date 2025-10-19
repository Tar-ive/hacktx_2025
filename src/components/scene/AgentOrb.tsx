import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import type { AgentConfig } from '../../data/constellation.ts';

interface AgentOrbProps {
  agent: AgentConfig;
  initialPhase: number;
  reducedMotion: boolean;
  active: boolean;
  onSelect: () => void;
}

const STATE_SCALE: Record<AgentConfig['state'], number> = {
  idle: 1,
  listening: 1.2,
  speaking: 1.1,
  thinking: 1.05,
  alert: 1.15
};

const STATE_EMISSIVE: Record<AgentConfig['state'], number> = {
  idle: 0.4,
  listening: 0.8,
  speaking: 1,
  thinking: 0.7,
  alert: 1.2
};

export function AgentOrb({
  agent,
  initialPhase,
  reducedMotion,
  active,
  onSelect
}: AgentOrbProps) {
  const meshRef = useRef<Mesh>(null);
  const phaseRef = useRef(initialPhase);
  const scaleVector = useMemo(() => new Vector3(1, 1, 1), []);

  const baseRadius = useMemo(() => Math.max(agent.orbitRadius, 2.5), [agent.orbitRadius]);
  const jitter = agent.orbitVariance ?? 0.2;

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const time = clock.elapsedTime;
    const orbitSpeed = agent.orbitSpeed * (agent.state === 'speaking' ? 1.4 : 1);
    const phase = phaseRef.current + time * orbitSpeed;
    const radius = baseRadius + Math.sin(time * 0.5) * jitter;
    const positionX = Math.cos(phase) * radius;
    const positionZ = Math.sin(phase) * radius;
    const verticalDrift = reducedMotion ? 0 : Math.sin(time * 0.8 + initialPhase) * 0.3;

    meshRef.current.position.set(positionX, verticalDrift, positionZ);

    const scaleTarget = STATE_SCALE[agent.state] * (active ? 1.15 : 1);
    const emissiveTarget = STATE_EMISSIVE[agent.state] * (active ? 1.4 : 1);

    scaleVector.setScalar(scaleTarget);
    meshRef.current.scale.lerp(scaleVector, 0.1);
    const material = meshRef.current.material as MeshStandardMaterial;
    if (!Array.isArray(material)) {
      material.emissiveIntensity = emissiveTarget;
    }
  });

  const radius = 0.6;

  return (
    <mesh ref={meshRef} onPointerDown={onSelect}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={agent.color}
        emissive={agent.color}
        emissiveIntensity={STATE_EMISSIVE[agent.state]}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}
