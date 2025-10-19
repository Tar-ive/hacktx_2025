import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { ConstellationSnapshot } from '../data/constellation.ts';
import type { PerformanceMode, SelectedEntity, ViewMode } from '../App.tsx';
import { CentralHub } from './scene/CentralHub.tsx';
import { AgentSwarm } from './scene/AgentSwarm.tsx';
import { AccountRing } from './scene/AccountRing.tsx';
import { TransactionParticles } from './scene/TransactionParticles.tsx';

interface ConstellationSceneProps {
  snapshot: ConstellationSnapshot;
  viewMode: ViewMode;
  performanceMode: PerformanceMode;
  reducedMotion: boolean;
  selected: SelectedEntity;
  onSelect: (entity: SelectedEntity) => void;
}

const DPR_BY_MODE: Record<PerformanceMode, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [0.8, 1]
};

const FRAMELOOP_BY_MODE: Record<PerformanceMode, 'always' | 'demand'> = {
  high: 'always',
  medium: 'always',
  low: 'demand'
};

export function ConstellationScene({
  snapshot,
  viewMode,
  performanceMode,
  reducedMotion,
  selected,
  onSelect
}: ConstellationSceneProps) {
  const cameraPosition = useMemo(() => {
    if (viewMode === '2d') {
      return [0, 0, 18] as const;
    }
    return [0, 8, 18] as const;
  }, [viewMode]);

  return (
    <div className="canvas-wrapper">
      <Canvas
        dpr={DPR_BY_MODE[performanceMode]}
        frameloop={FRAMELOOP_BY_MODE[performanceMode]}
        camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 200 }}
      >
        <color attach="background" args={[viewMode === '2d' ? '#080b1a' : '#050713']} />
        <fog attach="fog" args={["#03040c", 15, 60]} />

        <ambientLight intensity={0.25} />
        <pointLight position={[0, 0, 0]} intensity={2} distance={40} color="#72E6FF" />
        <spotLight
          position={[10, 15, 10]}
          angle={0.45}
          penumbra={0.3}
          intensity={0.7}
          color="#5B8DFF"
        />

        <Suspense fallback={null}>
          <group rotation={[viewMode === '2d' ? 0 : -Math.PI / 8, 0, 0]}>
            <CentralHub
              netWorth={snapshot.netWorth}
              healthScore={snapshot.healthScore}
              selected={selected?.type === 'hub'}
              reducedMotion={reducedMotion}
              onSelect={() => onSelect({ type: 'hub' })}
            />
            <AgentSwarm
              agents={snapshot.agents}
              reducedMotion={reducedMotion}
              selected={selected}
              onSelect={onSelect}
            />
            <AccountRing
              accounts={snapshot.accounts}
              reducedMotion={reducedMotion}
              selected={selected}
              onSelect={onSelect}
            />
            <TransactionParticles
              flows={snapshot.transactions}
              reducedMotion={reducedMotion}
              performanceMode={performanceMode}
            />
          </group>
          <Stars
            radius={60}
            depth={30}
            count={performanceMode === 'low' ? 500 : 1200}
            factor={2}
            saturation={0}
            fade
          />
        </Suspense>

        {viewMode === '3d' && <OrbitControls enablePan={false} enableZoom maxPolarAngle={Math.PI / 2} />}
      </Canvas>
    </div>
  );
}
