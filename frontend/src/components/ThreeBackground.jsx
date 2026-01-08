import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField({ count = 5000 }) {
    const points = useRef();

    // Generate random particle positions in a sphere
    const particlesPosition = useMemo(() => {
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const distance = Math.sqrt(Math.random()) * 25;
            const theta = THREE.MathUtils.randFloatSpread(360);
            const phi = THREE.MathUtils.randFloatSpread(360);

            let x = distance * Math.sin(theta) * Math.cos(phi);
            let y = distance * Math.sin(theta) * Math.sin(phi);
            let z = distance * Math.cos(theta);

            positions.set([x, y, z], i * 3);
        }

        return positions;
    }, [count]);

    // Animate particles
    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        if (points.current) {
            points.current.rotation.x = time * 0.05;
            points.current.rotation.y = time * 0.075;
        }
    });

    return (
        <Points ref={points} positions={particlesPosition} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color="#4f46e5"
                size={0.05}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}

function AnimatedSphere() {
    const mesh = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        mesh.current.rotation.x = time * 0.2;
        mesh.current.rotation.y = time * 0.3;
        mesh.current.scale.x = 1 + Math.sin(time * 0.5) * 0.1;
        mesh.current.scale.y = 1 + Math.sin(time * 0.5) * 0.1;
        mesh.current.scale.z = 1 + Math.sin(time * 0.5) * 0.1;
    });

    return (
        <mesh ref={mesh}>
            <icosahedronGeometry args={[2, 4]} />
            <meshStandardMaterial
                color="#6366f1"
                wireframe
                transparent
                opacity={0.3}
                emissive="#4f46e5"
                emissiveIntensity={0.5}
            />
        </mesh>
    );
}

function FloatingRings() {
    const group = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        group.current.rotation.x = time * 0.1;
        group.current.rotation.y = time * 0.15;
    });

    return (
        <group ref={group}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[3, 0.05, 16, 100]} />
                <meshStandardMaterial
                    color="#8b5cf6"
                    emissive="#7c3aed"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.6}
                />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[3.5, 0.05, 16, 100]} />
                <meshStandardMaterial
                    color="#3b82f6"
                    emissive="#2563eb"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        </group>
    );
}

export default function ThreeBackground() {
    return (
        <div className="fixed inset-0 z-0">
            <Canvas
                camera={{ position: [0, 0, 10], fov: 75 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#4f46e5" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />

                <ParticleField />
                <AnimatedSphere />
                <FloatingRings />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 2}
                    minPolarAngle={Math.PI / 2}
                />
            </Canvas>
        </div>
    );
}
