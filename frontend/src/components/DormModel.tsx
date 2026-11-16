"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * โมเดล 3 มิติของหอพัก สร้างจากรูปทรงพื้นฐานของ three.js ทั้งหมด (ไม่ต้องโหลดไฟล์โมเดล)
 * หมุนเองช้าๆ และใช้เมาส์/นิ้วลากหมุนดูได้
 */

const FLOORS = 4;
const FLOOR_H = 2.4;
const W = 10; // กว้าง (แกน x)
const D = 6; // ลึก (แกน z)
const H = FLOORS * FLOOR_H;

const COLORS = {
  wall: 0xf5efe6,
  ledge: 0x6366f1, // indigo เข้ากับสีของเว็บ
  balcony: 0xe0e7ff,
  rail: 0xffffff,
  glass: 0x93c5fd,
  lit: 0xfde68a,
  door: 0x334155,
  roof: 0xcbd5e1,
  tank: 0x3b82f6,
  grass: 0x86efac,
  path: 0xd6d3d1,
  trunk: 0x92400e,
  leaf: 0x22c55e,
};

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** หน้าต่างบางบานเปิดไฟ เลือกแบบคงที่ (ไม่สุ่มใหม่ทุกครั้ง) */
const isLit = (floor: number, i: number, side: number) => (floor * 7 + i * 3 + side * 5) % 5 < 2;

function buildDorm(): THREE.Group {
  const g = new THREE.Group();
  const mat = {
    wall: new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.9 }),
    ledge: new THREE.MeshStandardMaterial({ color: COLORS.ledge, roughness: 0.6 }),
    balcony: new THREE.MeshStandardMaterial({ color: COLORS.balcony, roughness: 0.8 }),
    rail: new THREE.MeshStandardMaterial({ color: COLORS.rail, roughness: 0.4, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.15, metalness: 0.4 }),
    lit: new THREE.MeshStandardMaterial({ color: COLORS.lit, emissive: 0xfbbf24, emissiveIntensity: 0.7 }),
    door: new THREE.MeshStandardMaterial({ color: COLORS.door, roughness: 0.5 }),
    roof: new THREE.MeshStandardMaterial({ color: COLORS.roof, roughness: 0.9 }),
    tank: new THREE.MeshStandardMaterial({ color: COLORS.tank, roughness: 0.4, metalness: 0.2 }),
  };

  // ตัวตึก
  g.add(box(W, H, D, mat.wall, 0, H / 2, 0));

  // คิ้วสีม่วงคั่นแต่ละชั้น
  for (let f = 1; f <= FLOORS; f++) {
    g.add(box(W + 0.16, 0.14, D + 0.16, mat.ledge, 0, f * FLOOR_H, 0));
  }

  // ด้านหน้า: ชั้น 2-4 มีห้องละ 1 ระเบียง (4 ห้องต่อชั้น)
  const roomX = [-3.75, -1.25, 1.25, 3.75];
  for (let f = 1; f < FLOORS; f++) {
    const y0 = f * FLOOR_H;
    roomX.forEach((x, i) => {
      g.add(box(1.4, 1.7, 0.06, isLit(f, i, 0) ? mat.lit : mat.glass, x, y0 + 1.05, D / 2 + 0.03)); // ประตูกระจกระเบียง
      g.add(box(2.2, 0.12, 0.95, mat.balcony, x, y0 + 0.08, D / 2 + 0.47)); // พื้นระเบียง
      g.add(box(2.2, 0.06, 0.06, mat.rail, x, y0 + 0.95, D / 2 + 0.92)); // ราวจับ
      for (let p = -1; p <= 1; p += 0.25) g.add(box(0.04, 0.85, 0.04, mat.rail, x + p, y0 + 0.55, D / 2 + 0.92)); // ซี่ราว
      g.add(box(0.06, 0.9, 0.95, mat.rail, x - 1.1, y0 + 0.55, D / 2 + 0.47)); // ผนังกั้นข้าง
    });
  }

  // ชั้นล่าง: ประตูทางเข้า กันสาด บันได และหน้าต่างสองข้าง
  g.add(box(1.8, 2.1, 0.08, mat.glass, 0, 1.05, D / 2 + 0.04));
  g.add(box(0.06, 2.1, 0.1, mat.door, 0, 1.05, D / 2 + 0.06));
  g.add(box(3, 0.14, 1.4, mat.ledge, 0, 2.35, D / 2 + 0.7));
  g.add(box(2.6, 0.15, 0.5, mat.roof, 0, 0.075, D / 2 + 0.6));
  g.add(box(2.2, 0.15, 0.4, mat.roof, 0, 0.2, D / 2 + 0.4));
  [-3.5, -2, 2, 3.5].forEach((x, i) => g.add(box(1, 1.1, 0.06, isLit(0, i, 0) ? mat.lit : mat.glass, x, 1.3, D / 2 + 0.03)));

  // ด้านหลัง และด้านข้าง: หน้าต่างเล็ก
  for (let f = 0; f < FLOORS; f++) {
    const y = f * FLOOR_H + 1.3;
    roomX.forEach((x, i) => g.add(box(0.9, 0.9, 0.06, isLit(f, i, 1) ? mat.lit : mat.glass, x, y, -D / 2 - 0.03)));
    [-1.5, 1.5].forEach((z, i) => {
      g.add(box(0.06, 0.9, 0.9, isLit(f, i, 2) ? mat.lit : mat.glass, W / 2 + 0.03, y, z));
      g.add(box(0.06, 0.9, 0.9, isLit(f, i, 3) ? mat.lit : mat.glass, -W / 2 - 0.03, y, z));
    });
  }

  // ดาดฟ้า: ขอบกันตก ห้องบันได ถังน้ำ
  g.add(box(W, 0.5, 0.15, mat.wall, 0, H + 0.25, D / 2 - 0.08));
  g.add(box(W, 0.5, 0.15, mat.wall, 0, H + 0.25, -D / 2 + 0.08));
  g.add(box(0.15, 0.5, D, mat.wall, W / 2 - 0.08, H + 0.25, 0));
  g.add(box(0.15, 0.5, D, mat.wall, -W / 2 + 0.08, H + 0.25, 0));
  g.add(box(2, 1.8, 2, mat.wall, -3, H + 0.9, -1));
  g.add(box(2.2, 0.12, 2.2, mat.roof, -3, H + 1.86, -1));
  [-0.45, 0.45].forEach((dx) =>
    [-0.45, 0.45].forEach((dz) => g.add(box(0.08, 0.9, 0.08, mat.rail, 3 + dx, H + 0.45, -1.4 + dz))),
  );
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.3, 20), mat.tank);
  tank.position.set(3, H + 1.55, -1.4);
  tank.castShadow = true;
  g.add(tank);

  // ป้าย DORM-PAY บนดาดฟ้า (วาดตัวอักษรลง canvas แล้วใช้เป็น texture)
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#4f46e5";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 76px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DORM-PAY", 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 0.12), [
    mat.ledge, mat.ledge, mat.ledge, mat.ledge,
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }),
    mat.ledge,
  ]);
  sign.position.set(0, H + 1.35, D / 2 - 0.3);
  sign.castShadow = true;
  g.add(sign);
  [-1.6, 1.6].forEach((x) => g.add(box(0.1, 0.8, 0.1, mat.rail, x, H + 0.4, D / 2 - 0.3)));

  return g;
}

function buildGround(): THREE.Group {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(15, 48),
    new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  g.add(grass);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(2, 9), new THREE.MeshStandardMaterial({ color: COLORS.path }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, D / 2 + 5);
  path.receiveShadow = true;
  g.add(path);

  const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: COLORS.leaf, roughness: 0.9, flatShading: true });
  const trees: [number, number, number][] = [
    [-8, 5, 1.1], [8, 4, 1], [-9, -3, 1.2], [9, -4, 0.9], [-4, 8.5, 0.8], [5, 9, 0.85],
  ];
  for (const [x, z, s] of trees) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.6 * s, 8), trunkMat);
    trunk.position.set(x, 0.8 * s, z);
    trunk.castShadow = true;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * s, 0), leafMat);
    leaf.position.set(x, 2.2 * s, z);
    leaf.castShadow = true;
    g.add(trunk, leaf);
  }

  // พุ่มไม้หน้าตึก
  for (const x of [-4.2, -2.6, 2.6, 4.2]) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), leafMat);
    bush.position.set(x, 0.35, D / 2 + 1.1);
    bush.castShadow = true;
    g.add(bush);
  }
  return g;
}

export default function DormModel({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // เครื่องที่ไม่รองรับ WebGL: แสดงพื้นหลังเฉยๆ
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "โมเดล 3 มิติของหอพัก DORM-PAY");
    renderer.domElement.style.touchAction = "pan-y";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(buildGround(), buildDorm());

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x86efac, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(12, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(20, 13, 24);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 4.8, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false; // ไม่ดักการเลื่อนหน้าเว็บ
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.4;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.8;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // จอแคบ: ถอยกล้องออกให้เห็นทั้งตึก
      camera.position.setLength(w / h < 1 ? 44 : 34);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={ref} className={className} />;
}
