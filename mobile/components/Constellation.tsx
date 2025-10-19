import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// Agent Orb Component
interface AgentOrbProps {
  position: [number, number, number];
  color: string;
  name: string;
  size?: number;
  pulseSpeed?: number;
}

const AgentOrb: React.FC<AgentOrbProps> = ({
  position,
  color,
  name,
  size = 0.5,
  pulseSpeed = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1;
      meshRef.current.scale.setScalar(scale);

      // Gentle rotation
      meshRef.current.rotation.y += 0.005;
    }

    if (glowRef.current) {
      // Glow effect
      const glowScale = 1.2 + Math.sin(state.clock.elapsedTime * pulseSpeed * 0.8) * 0.2;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  return (
    <group position={position}>
      {/* Main orb */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, size + 0.3, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
};

// Connection Line Component
interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  start,
  end,
  color = '#00ffff'
}) => {
  const lineRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (lineRef.current) {
      // Animate data flow along the line
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  const points = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    return [startVec, endVec];
  }, [start, end]);

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          count={2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.5}
      />
    </line>
  );
};

// Floating Particle Component
const FloatingParticle: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => [
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10
  ], []);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating motion
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.001;
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position as [number, number, number]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color="#00ffff" opacity={0.6} transparent />
    </mesh>
  );
};

// Main Constellation Component
const Constellation: React.FC = () => {
  // Agent positions in 3D space
  const agentPositions = useMemo(() => [
    { pos: [-3, 2, 0] as [number, number, number], color: '#ff6b6b', name: 'Nova' },
    { pos: [3, 2, 0] as [number, number, number], color: '#4ecdc4', name: 'Atlas' },
    { pos: [0, -2, 2] as [number, number, number], color: '#45b7d1', name: 'Mercury' },
    { pos: [0, -2, -2] as [number, number, number], color: '#f9ca24', name: 'Sentinel' },
  ], []);

  // Connection pairs
  const connections = useMemo(() => [
    [0, 1], // Nova <-> Atlas
    [1, 2], // Atlas <-> Mercury
    [2, 3], // Mercury <-> Sentinel
    [3, 0], // Sentinel <-> Nova
    [0, 2], // Nova <-> Mercury
    [1, 3], // Atlas <-> Sentinel
  ], []);

  return (
    <>
      {/* Background stars */}
      <Stars
        radius={50}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Central hub */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Agent orbs */}
      {agentPositions.map((agent, index) => (
        <AgentOrb
          key={agent.name}
          position={agent.pos}
          color={agent.color}
          name={agent.name}
          size={0.4}
          pulseSpeed={1.5 + index * 0.2}
        />
      ))}

      {/* Connection lines */}
      {connections.map(([startIdx, endIdx], index) => (
        <ConnectionLine
          key={index}
          start={agentPositions[startIdx].pos}
          end={agentPositions[endIdx].pos}
          color="#00ffff"
        />
      ))}

      {/* Floating particles */}
      {Array.from({ length: 50 }, (_, i) => (
        <FloatingParticle key={i} />
      ))}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />

      {/* Camera controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
};

export default Constellation;