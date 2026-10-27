'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** A passive, self-animating conference-stage scene with no pointer or touch input. */
export function ConferenceScene({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.45, 9.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const stage = new THREE.Group();
    stage.scale.setScalar(0.84);
    scene.add(stage);

    const gold = 0xffd39b;
    const red = 0xe25546;
    const blue = 0x8ab5df;

    // A simple arch gives the 3D element a literal event/stage meaning.
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.38, 0.034, 10, 96, Math.PI * 1.08),
      new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.72 }),
    );
    arch.rotation.z = Math.PI * 0.04;
    stage.add(arch);

    const archInner = new THREE.Mesh(
      new THREE.TorusGeometry(1.96, 0.018, 8, 96, Math.PI * 1.03),
      new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: 0.55 }),
    );
    archInner.rotation.z = -Math.PI * 0.04;
    stage.add(archInner);

    const pillarMaterial = new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: 0.4 });
    [-2.38, 2.38].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 3.25, 0.025), pillarMaterial);
      pillar.position.set(x, -0.25, 0);
      stage.add(pillar);
    });

    const floor = new THREE.GridHelper(6.2, 12, blue, blue);
    floor.position.set(0, -1.72, 0.2);
    floor.rotation.x = Math.PI / 2.4;
    floor.material.transparent = true;
    floor.material.opacity = 0.12;
    stage.add(floor);

    const lightCones: THREE.Mesh[] = [];
    [-1.15, 1.15].forEach((x, index) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.72, 3.2, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: index === 0 ? gold : red, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
      );
      cone.position.set(x, 0.1, -0.35);
      cone.rotation.z = index === 0 ? -0.18 : 0.18;
      cone.rotation.x = Math.PI;
      stage.add(cone);
      lightCones.push(cone);
    });

    const stageLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xff755d, transparent: true, opacity: 0.62 }),
    );
    stageLight.position.set(0, -0.2, 0.1);
    stage.add(stageLight);

    // Small audience lights make the scene read as a gathering rather than a random orb.
    const audience = new THREE.Group();
    const audienceMaterial = new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.68 });
    for (let row = 0; row < 5; row += 1) {
      for (let seat = 0; seat < 11; seat += 1) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), audienceMaterial);
        dot.position.set((seat - 5) * 0.29 + (row % 2 ? 0.1 : 0), -1.15 + row * 0.12, 0.7 + row * 0.13);
        audience.add(dot);
      }
    }
    stage.add(audience);

    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 130;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      dustPositions[index * 3] = (Math.random() - 0.5) * 5.2;
      dustPositions[index * 3 + 1] = (Math.random() - 0.5) * 3.8;
      dustPositions[index * 3 + 2] = (Math.random() - 0.5) * 1.8;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xffd39b, size: 0.018, transparent: true, opacity: 0.5 }));
    stage.add(dust);

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frameId = 0;
    const animate = (time: number) => {
      const t = time * 0.00032;
      stage.rotation.y = Math.sin(t * 0.8) * 0.06;
      stage.position.y = Math.sin(t * 1.4) * 0.035;
      arch.rotation.z = Math.PI * 0.04 + Math.sin(t) * 0.025;
      archInner.rotation.z = -Math.PI * 0.04 - Math.sin(t * 1.2) * 0.02;
      lightCones[0].rotation.z = -0.18 + Math.sin(t * 1.5) * 0.04;
      lightCones[1].rotation.z = 0.18 - Math.sin(t * 1.5) * 0.04;
      stageLight.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      audience.position.z = Math.sin(t * 0.8) * 0.03;
      dust.rotation.y = t * 0.08;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else if (mesh.material) mesh.material.dispose();
      });
      renderer.dispose();
      dustGeometry.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className={`pointer-events-none absolute select-none overflow-hidden ${className}`} />;
}
