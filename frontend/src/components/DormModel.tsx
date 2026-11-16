"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * โมเดล 3 มิติของหอพัก (คอนโด 12 ชั้น) สร้างจากโค้ดทั้งหมด ไม่โหลดไฟล์โมเดล
 * - ตัวตึกหลายส่วนยื่นเข้า-ออก ผนังครีม เสามุมสีส้มอิฐ หลังคาปั้นหยาสีน้ำตาล ป้อมบนหลังคา
 * - หน้าต่างกรอบขาวเรียงเป็นตาราง ระเบียงยื่นซ้อนกันเป็นแนวตั้ง
 * - ฐานคอนกรีตแบบโมเดลจำลอง มีสนามหญ้า พุ่มไม้ ต้นไม้ และบันไดทางเข้า
 * หน้าต่าง/ระเบียง/ซี่ราว ใช้ InstancedMesh เพื่อให้วาดได้เร็ว
 */

const FH = 1.05; // ความสูงต่อชั้น
const FLOORS = 12;
const TOP = FLOORS * FH;

type Block = { x0: number; x1: number; z0: number; z1: number; floors: number; roofH: number };

// ผังตึก (มองจากด้านบน แกน z บวก = ด้านหน้า)
const BLOCKS: Block[] = [
  { x0: -3, x1: 3, z0: -3, z1: 2.5, floors: FLOORS, roofH: 1.5 }, // ตัวตึกหลัก
  { x0: -5.2, x1: -3, z0: -2.4, z1: 1.4, floors: FLOORS, roofH: 1.1 }, // ปีกซ้าย
  { x0: 3, x1: 5.6, z0: -2.6, z1: 1.9, floors: FLOORS, roofH: 1.1 }, // ปีกขวา
  { x0: -1.2, x1: 1.6, z0: 2.5, z1: 3.5, floors: FLOORS, roofH: 0.9 }, // ส่วนยื่นด้านหน้า
];
const FRONT_BAY = BLOCKS[3];

type Facing = "front" | "back" | "left" | "right";
const NORMAL: Record<Facing, [number, number]> = { front: [0, 1], back: [0, -1], right: [1, 0], left: [-1, 0] };
const ROT: Record<Facing, number> = { front: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };

// ระเบียงที่ซ้อนกันเป็นแนวตั้ง: ผนังด้านไหน (at = ตำแหน่งผนัง) ตรงไหน (along) กว้างเท่าไร
const BALCONY_STACKS: { facing: Facing; at: number; along: number; width: number }[] = [
  { facing: "front", at: 2.5, along: -2.1, width: 1.5 }, // ผนังหน้าตัวหลัก ข้างส่วนยื่น
  { facing: "front", at: 1.9, along: 4.3, width: 1.9 }, // หน้าปีกขวา
  { facing: "left", at: -5.2, along: -0.5, width: 1.9 }, // ข้างปีกซ้าย
  { facing: "right", at: 5.6, along: -0.4, width: 1.8 }, // ข้างปีกขวา
];

const ENTRANCE = { x: 0.2, width: 1.3 }; // ประตูทางเข้าที่ผนังหน้าส่วนยื่น

const COLORS = {
  wall: "#ecdcc2",
  accent: "#c8733d", // ส้มอิฐ
  cornice: 0xf6f1e8,
  frame: 0xffffff,
  rail: 0x3f4650,
  plot: "#d9d6d1",
  grass: "#6bb35a",
  leaf: [0x5f9e45, 0x4f8f3c, 0x6fae52, 0x7cbb5c],
  trunk: 0x6b4a33,
};

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Texture ที่วาดบน canvas                                             */
/* ------------------------------------------------------------------ */

function canvasTexture(draw: (ctx: CanvasRenderingContext2D) => void, rx = 1, ry = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** ผิวปูน/คอนกรีต: จุดเล็กๆ สีอ่อน-เข้มสลับกัน */
function speckle(base: string, spread: number, seed: number) {
  return (ctx: CanvasRenderingContext2D) => {
    const rnd = seeded(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256 * 256 * 0.3; i++) {
      const v = (rnd() - 0.5) * spread;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(70,55,40,${-v})`;
      ctx.fillRect(rnd() * 256, rnd() * 256, 1 + rnd(), 1 + rnd());
    }
  };
}

/** กระเบื้องหลังคา: แถวแนวนอนสลับเฉดน้ำตาล */
function shingles(ctx: CanvasRenderingContext2D) {
  const rnd = seeded(5);
  ctx.fillStyle = "#6e5242";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = (y / 16) % 2 ? -12 : 0; x < 256; x += 24) {
      ctx.fillStyle = `hsl(24, 24%, ${36 + rnd() * 12}%)`;
      ctx.fillRect(x + 1, y + 1, 22, 13);
    }
  }
}

function grassTexture(ctx: CanvasRenderingContext2D) {
  const rnd = seeded(9);
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `hsla(${95 + rnd() * 20}, ${45 + rnd() * 20}%, ${30 + rnd() * 25}%, 0.6)`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 1, 2 + rnd() * 3);
  }
}

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#9fd0f0");
  g.addColorStop(0.6, "#dbe8f7");
  g.addColorStop(1, "#f1f4fb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createMaterials() {
  const wallMap = canvasTexture(speckle(COLORS.wall, 0.1, 1), 2, 6);
  const accentMap = canvasTexture(speckle(COLORS.accent, 0.12, 2), 1, 4);
  const roofMap = canvasTexture(shingles, 3, 3);
  const plotMap = canvasTexture(speckle(COLORS.plot, 0.12, 3), 4, 4);
  const grassMap = canvasTexture(grassTexture, 3, 3);
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  return {
    textures: [wallMap, accentMap, roofMap, plotMap, grassMap],
    wall: std({ map: wallMap, roughness: 0.9 }),
    accent: std({ map: accentMap, roughness: 0.85 }),
    cornice: std({ color: COLORS.cornice, roughness: 0.7 }),
    roof: std({ map: roofMap, roughness: 0.85, flatShading: true }),
    frame: std({ color: COLORS.frame, roughness: 0.4, metalness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x5f86ab,
      roughness: 0.05,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.4,
    }),
    slab: std({ color: 0xf3ede3, roughness: 0.75 }),
    rail: std({ color: COLORS.rail, roughness: 0.4, metalness: 0.7 }),
    plot: std({ map: plotMap, roughness: 0.95 }),
    grass: std({ map: grassMap, roughness: 1 }),
    step: std({ color: 0xe7e3dc, roughness: 0.9 }),
    trunk: std({ color: COLORS.trunk, roughness: 0.9 }),
    leaves: COLORS.leaf.map((c) => std({ color: c, roughness: 0.85 })),
  };
}
type Mats = ReturnType<typeof createMaterials>;

/* ------------------------------------------------------------------ */
/* ตัวช่วย                                                             */
/* ------------------------------------------------------------------ */

/** เก็บกล่องที่ใช้วัสดุเดียวกันไว้ แล้วสร้างเป็น InstancedMesh ทีเดียว (วาดเร็วกว่าหลายพัน mesh) */
class BoxBatch {
  private items = new Map<THREE.Material, THREE.Matrix4[]>();
  private tmp = new THREE.Object3D();

  add(mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0) {
    this.tmp.position.set(x, y, z);
    this.tmp.rotation.set(0, rotY, 0);
    this.tmp.scale.set(sx, sy, sz);
    this.tmp.updateMatrix();
    if (!this.items.has(mat)) this.items.set(mat, []);
    this.items.get(mat)!.push(this.tmp.matrix.clone());
  }

  build(parent: THREE.Object3D) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (const [mat, list] of this.items) {
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((mx, i) => m.setMatrixAt(i, mx));
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
    }
  }
}

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** หลังคาปั้นหยา: พีระมิดฐานสี่เหลี่ยม ขยายตามขนาดที่ต้องการ */
function hipRoof(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, w: number, d: number, h: number) {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1), mat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w, 1, d);
  roof.position.set(x, y + h / 2, z);
  roof.castShadow = true;
  roof.receiveShadow = true;
  parent.add(roof);
}

/** จุดนี้อยู่ข้างในตึกส่วนอื่นไหม (ใช้ตัดหน้าต่างที่ถูกบัง) */
function insideOther(x: number, z: number, self: Block) {
  return BLOCKS.some((b) => b !== self && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
}

/** แปลง (ตำแหน่งผนัง, ระยะตามแนวผนัง, ระยะยื่นออกจากผนัง) เป็นพิกัด x,z */
function onFace(facing: Facing, at: number, along: number, out: number): [number, number] {
  const [nx, nz] = NORMAL[facing];
  return nx !== 0 ? [at + nx * out, along] : [along, at + nz * out];
}

/* ------------------------------------------------------------------ */
/* ตัวตึก                                                              */
/* ------------------------------------------------------------------ */

function buildBuilding(m: Mats) {
  const g = new THREE.Group();
  const batch = new BoxBatch();

  for (const b of BLOCKS) {
    const w = b.x1 - b.x0;
    const d = b.z1 - b.z0;
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const h = b.floors * FH;

    // ผนัง + ฐานชั้นล่างสีส้มอิฐ + คิ้วขาวเหนือชั้นล่าง + แถบส้มและบัวใต้หลังคา
    mesh(g, new THREE.BoxGeometry(w, h, d), m.wall, cx, h / 2, cz);
    batch.add(m.accent, cx, FH / 2, cz, w + 0.08, FH, d + 0.08);
    batch.add(m.cornice, cx, FH, cz, w + 0.16, 0.1, d + 0.16);
    batch.add(m.accent, cx, h - 0.12, cz, w + 0.12, 0.2, d + 0.12);
    batch.add(m.cornice, cx, h + 0.05, cz, w + 0.4, 0.14, d + 0.4);

    // เสาสีส้มอิฐที่มุมตึก
    for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) {
      batch.add(m.accent, x, (h + FH) / 2, z, 0.32, h - FH, 0.32);
    }

    hipRoof(g, m.roof, cx, h + 0.12, cz, w + 0.5, d + 0.5, b.roofH);

    // หน้าต่างกรอบขาว ทุกด้านของตึกส่วนนี้ (ข้ามจุดที่ถูกส่วนอื่นบัง / ตรงระเบียง / ตรงประตูทางเข้า)
    const faces: { facing: Facing; at: number; from: number; to: number }[] = [
      { facing: "front", at: b.z1, from: b.x0, to: b.x1 },
      { facing: "back", at: b.z0, from: b.x0, to: b.x1 },
      { facing: "right", at: b.x1, from: b.z0, to: b.z1 },
      { facing: "left", at: b.x0, from: b.z0, to: b.z1 },
    ];
    for (const f of faces) {
      const len = f.to - f.from;
      const n = Math.max(1, Math.floor((len - 0.3) / 0.82));
      const r = ROT[f.facing];
      const stacks = BALCONY_STACKS.filter((s) => s.facing === f.facing && Math.abs(s.at - f.at) < 0.01);
      for (let i = 0; i < n; i++) {
        const along = f.from + (len * (i + 0.5)) / n;
        if (stacks.some((s) => Math.abs(along - s.along) < s.width / 2 + 0.2)) continue;
        const [px, pz] = onFace(f.facing, f.at, along, 0.05);
        if (insideOther(px, pz, b)) continue;
        const [fx, fz] = onFace(f.facing, f.at, along, 0.015);
        const [gx, gz] = onFace(f.facing, f.at, along, 0.04);
        const [sx, sz] = onFace(f.facing, f.at, along, 0.07);
        for (let fl = 0; fl < b.floors; fl++) {
          if (fl === 0 && b === FRONT_BAY && f.facing === "front" && Math.abs(along - ENTRANCE.x) < ENTRANCE.width) continue;
          const y = fl * FH + 0.55;
          batch.add(m.frame, fx, y, fz, 0.6, 0.7, 0.04, r); // กรอบ
          batch.add(m.glass, gx, y, gz, 0.48, 0.58, 0.02, r); // กระจก
          batch.add(m.frame, gx, y, gz, 0.03, 0.58, 0.035, r); // เสากลาง
          batch.add(m.cornice, sx, y - 0.37, sz, 0.7, 0.05, 0.1, r); // ขอบบัวใต้หน้าต่าง
        }
      }
    }
  }

  // ระเบียงซ้อนกันเป็นแนวตั้ง (ชั้น 2 ถึงชั้นบนสุด)
  for (const s of BALCONY_STACKS) {
    const r = ROT[s.facing];
    const depth = 0.7;
    for (let fl = 1; fl < FLOORS; fl++) {
      const y = fl * FH;
      const at = (along: number, out: number) => onFace(s.facing, s.at, along, out);
      let [x, z] = at(s.along, 0.03);
      batch.add(m.frame, x, y + 0.45, z, 0.95, 0.85, 0.04, r); // กรอบประตูระเบียง
      [x, z] = at(s.along, 0.055);
      batch.add(m.glass, x, y + 0.45, z, 0.85, 0.75, 0.02, r);
      [x, z] = at(s.along, depth / 2);
      batch.add(m.slab, x, y + 0.04, z, s.width, 0.08, depth, r); // พื้นระเบียง
      [x, z] = at(s.along, depth - 0.03);
      batch.add(m.rail, x, y + 0.52, z, s.width, 0.04, 0.04, r); // ราวบน
      batch.add(m.rail, x, y + 0.14, z, s.width, 0.03, 0.03, r); // ราวล่าง
      for (let p = -s.width / 2 + 0.05; p <= s.width / 2 - 0.04; p += 0.11) {
        [x, z] = at(s.along + p, depth - 0.03);
        batch.add(m.rail, x, y + 0.33, z, 0.02, 0.38, 0.02, r); // ซี่ราว
      }
      for (const side of [-1, 1]) {
        const edge = s.along + (side * s.width) / 2;
        for (let q = 0.1; q < depth - 0.05; q += 0.12) {
          [x, z] = at(edge, q);
          batch.add(m.rail, x, y + 0.33, z, 0.02, 0.38, 0.02, r);
        }
        [x, z] = at(edge, depth / 2);
        batch.add(m.rail, x, y + 0.52, z, 0.04, 0.04, depth, r);
      }
    }
  }

  // ป้อมบนหลังคา (สีส้มอิฐ + หลังคาเล็ก + หน้าต่าง)
  for (const [x, z, w] of [[-4.1, 0, 1.1], [4.3, 0.8, 1.2], [0.2, -1.6, 1.3]] as const) {
    const y0 = TOP + 0.1;
    mesh(g, new THREE.BoxGeometry(w, 1.6, w), m.accent, x, y0 + 0.8, z);
    batch.add(m.cornice, x, y0 + 1.63, z, w + 0.25, 0.08, w + 0.25);
    hipRoof(g, m.roof, x, y0 + 1.66, z, w + 0.35, w + 0.35, 0.55);
    batch.add(m.frame, x, y0 + 1.05, z + w / 2 + 0.02, 0.42, 0.42, 0.04);
    batch.add(m.glass, x, y0 + 1.05, z + w / 2 + 0.04, 0.32, 0.32, 0.02);
  }

  // ทางเข้า: ประตูกระจกบานคู่ กันสาด บันได (ยิ่งไกลตึกยิ่งเตี้ย)
  const fz = FRONT_BAY.z1;
  batch.add(m.frame, ENTRANCE.x, 0.55, fz + 0.02, 1.2, 1.0, 0.05);
  batch.add(m.glass, ENTRANCE.x - 0.27, 0.53, fz + 0.05, 0.5, 0.88, 0.02);
  batch.add(m.glass, ENTRANCE.x + 0.27, 0.53, fz + 0.05, 0.5, 0.88, 0.02);
  batch.add(m.cornice, ENTRANCE.x, 1.12, fz + 0.45, 1.9, 0.08, 0.9);
  for (let i = 0; i < 3; i++) batch.add(m.step, ENTRANCE.x, (3 - i) * 0.05, fz + 0.3 + i * 0.3, 2.2, (3 - i) * 0.1, 0.3);

  batch.build(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* ฐานคอนกรีต สนามหญ้า ต้นไม้                                          */
/* ------------------------------------------------------------------ */

/** แผ่นรูปหลายเหลี่ยมบนพื้น (จุดเป็นพิกัด x, z) */
function flatShape(points: [number, number][], depth: number, mat: THREE.Material, y: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.04, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y;
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

function buildSite(m: Mats, sway: THREE.Object3D[]) {
  const g = new THREE.Group();
  const rnd = seeded(31);

  // ฐานคอนกรีตทรงหลายเหลี่ยม (เหมือนโมเดลจำลอง)
  g.add(flatShape([[-8, -5.5], [7.5, -5.5], [9, 1], [7.5, 7.5], [-6.5, 7], [-9, 1.5]], 0.35, m.plot, -0.39));

  // สนามหญ้า (เว้นทางเดินหน้าตึกไว้)
  g.add(flatShape([[-8.2, 2], [-6.6, 3.8], [-1.1, 4], [-1.1, 6.6], [-6.2, 6.5]], 0.03, m.grass, 0));
  g.add(flatShape([[1.5, 4], [7, 3.5], [8.3, 1.5], [7.2, 7], [1.5, 6.8]], 0.03, m.grass, 0));
  g.add(flatShape([[-7.6, -5], [-5.8, -5], [-5.9, 0.9], [-8.3, 1.2]], 0.03, m.grass, 0));
  g.add(flatShape([[6.1, -5], [7.3, -5], [8.5, 0.8], [6.3, 0.6]], 0.03, m.grass, 0));

  // พุ่มไม้กลม
  const bushes: [number, number, number][] = [
    [-2.3, 4.7, 0.55], [2.7, 4.6, 0.6], [-4.6, 4.5, 0.5], [5.2, 4.2, 0.55], [-6.8, -1.5, 0.5], [7.1, -2, 0.5], [-1.7, 6, 0.4], [4, 6.2, 0.45],
  ];
  for (const [x, z, r] of bushes) {
    const b = mesh(g, new THREE.IcosahedronGeometry(r, 2), m.leaves[Math.floor(rnd() * m.leaves.length)], x, r * 0.8, z);
    b.scale.y = 0.85;
  }

  // ต้นไม้
  const trees: [number, number, number][] = [[-7, 4.8, 1.1], [7.3, 5.2, 1.2], [-7.2, -3.5, 1.0], [6.8, -4, 0.95]];
  trees.forEach(([x, z, s], ti) => {
    mesh(g, new THREE.CylinderGeometry(0.08 * s, 0.13 * s, 1.6 * s, 8), m.trunk, x, 0.8 * s, z);
    const crown = new THREE.Group();
    crown.position.set(x, 1.9 * s, z);
    const parts: [number, number, number, number][] = [[0, 0.2, 0, 0.85], [0.45, -0.15, 0.15, 0.6], [-0.4, -0.1, -0.2, 0.62], [0.05, 0.7, -0.05, 0.55]];
    parts.forEach(([dx, dy, dz, r], k) => mesh(crown, new THREE.IcosahedronGeometry(r * s, 2), m.leaves[(ti + k) % m.leaves.length], dx * s, dy * s, dz * s));
    crown.userData.phase = ti * 1.7;
    sway.push(crown);
    g.add(crown);
  });

  return g;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const ENTER_MS = 1900; // ความยาวแอนิเมชันซูมเข้าหอ
const DOOR = new THREE.Vector3(ENTRANCE.x, 0.7, FRONT_BAY.z1);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t: number) => t * t * t;

/**
 * @param entering เปลี่ยนเป็น true เพื่อเริ่มแอนิเมชันกล้องบินเข้าประตูหอ
 * @param onEntered เรียกเมื่อแอนิเมชันจบ (หรือทันที ถ้าเครื่องไม่รองรับ WebGL / ผู้ใช้ตั้งลดภาพเคลื่อนไหว)
 */
export default function DormModel({
  className,
  entering = false,
  onEntered,
}: {
  className?: string;
  entering?: boolean;
  onEntered?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onEnteredRef = useRef(onEntered);
  const startEnterRef = useRef<() => void>(() => onEnteredRef.current?.());

  useEffect(() => {
    onEnteredRef.current = onEntered;
  }, [onEntered]);

  useEffect(() => {
    if (entering) startEnterRef.current();
  }, [entering]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return; // ไม่รองรับ WebGL: แสดงพื้นหลังสีฟ้าเฉยๆ (startEnterRef จะเรียก onEntered ทันที)
    }
    const small = el.clientWidth < 640;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // ฉากไม่ขยับ (มีแต่กล้องหมุน) คำนวณเงาครั้งเดียวพอ
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "โมเดล 3 มิติของหอพัก");
    renderer.domElement.style.touchAction = "pan-y";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const sky = skyTexture();
    scene.background = sky;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.35;

    const mats = createMaterials();
    const sway: THREE.Object3D[] = [];
    scene.add(buildSite(mats, sway), buildBuilding(mats));

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0xcfe8c2, 0.6));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
    sun.position.set(-14, 26, 16); // แดดส่องจากด้านหน้าซ้าย
    sun.castShadow = true;
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 20, bottom: -16, near: 1, far: 80 });
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdbe4ff, 0.5);
    fill.position.set(14, 8, -10);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(17, 13, 26);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, TOP / 2 + 0.3, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false; // ไม่ดักการเลื่อนหน้าเว็บ
    controls.minPolarAngle = 0.6;
    controls.maxPolarAngle = 1.45;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;

    // Post-processing: ambient occlusion (เงานุ่มๆ ตามซอกมุม)
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 512, 512);
    ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1, scale: 1, samples: small ? 8 : 16 });
    ao.blendIntensity = 0.8;
    composer.addPass(ao);
    composer.addPass(new OutputPass());

    // สถานะแอนิเมชันซูมเข้าหอ (ดูรายละเอียดที่ startEnterRef ด้านล่าง)
    let enter: { start: number; target: THREE.Vector3; sph: THREE.Spherical; dTheta: number } | null = null;
    let entered = false;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      camera.aspect = w / h;
      if (!enter) {
        // ถอยกล้องให้ทั้งตึก (รัศมีประมาณ 10.5 หน่วย) อยู่ในจอพอดี ไม่ว่าจอจะกว้างหรือแคบ
        const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
        const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
        camera.position.setLength(10.5 / Math.sin(Math.min(vHalf, hHalf)));
      }
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    // ปรับคุณภาพอัตโนมัติ: ถ้าเครื่องวาดได้ช้า ปิด AO แล้วค่อยลดความละเอียด
    let quality = 2;
    let frames = 0;
    let windowStart = performance.now();
    const adapt = () => {
      frames++;
      const elapsed = performance.now() - windowStart;
      if (elapsed < 2000 || quality === 0) return;
      const fps = (frames * 1000) / elapsed;
      frames = 0;
      windowStart = performance.now();
      if (fps >= 40) return;
      quality--;
      if (quality === 1) ao.enabled = false;
      if (quality === 0) renderer.setPixelRatio(1);
      resize();
    };

    /*
     * แอนิเมชันซูมเข้าหอ (เล่นหลังล็อกอินสำเร็จ)
     * ช่วงแรก: กล้องหมุนมาด้านหน้าตึก ลดระดับลง และเล็งไปที่ประตูทางเข้า
     * ช่วงหลัง: พุ่งตรงเข้าประตู (หน้าเว็บจะค่อยๆ ขาวทับตอนท้าย)
     */
    const finishEnter = () => {
      if (entered) return;
      entered = true;
      onEnteredRef.current?.();
    };
    startEnterRef.current = () => {
      if (enter || entered) return;
      if (reduceMotion) return finishEnter();
      controls.enabled = false;
      controls.autoRotate = false;
      const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const dTheta = Math.atan2(Math.sin(-sph.theta), Math.cos(-sph.theta)); // หมุนทางที่ใกล้กว่าไปด้านหน้า (theta = 0)
      enter = { start: performance.now(), target: controls.target.clone(), sph, dTheta };
      sync();
    };

    const tmpTarget = new THREE.Vector3();
    const tmpSph = new THREE.Spherical();
    const updateEnter = () => {
      if (!enter) return;
      const p = Math.min(1, (performance.now() - enter.start) / ENTER_MS);
      const HALF = 0.55;
      if (p < HALF) {
        const a = easeInOut(p / HALF);
        tmpTarget.lerpVectors(enter.target, DOOR, a);
        tmpSph.set(
          THREE.MathUtils.lerp(enter.sph.radius, 9, a),
          THREE.MathUtils.lerp(enter.sph.phi, 1.3, a),
          enter.sph.theta + enter.dTheta * a,
        );
      } else {
        const b = easeIn((p - HALF) / (1 - HALF));
        tmpTarget.set(DOOR.x, DOOR.y, DOOR.z - b * 2);
        tmpSph.set(THREE.MathUtils.lerp(9, 0.15, b), THREE.MathUtils.lerp(1.3, Math.PI / 2, b), 0);
      }
      camera.position.setFromSpherical(tmpSph).add(tmpTarget);
      camera.lookAt(tmpTarget);
      if (p >= 1) finishEnter();
    };

    const clock = new THREE.Clock();
    const loop = () => {
      if (!enter) adapt();
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        for (const c of sway) {
          c.rotation.z = Math.sin(t * 0.9 + c.userData.phase) * 0.025;
          c.rotation.x = Math.cos(t * 0.7 + c.userData.phase) * 0.015;
        }
      }
      if (enter) updateEnter();
      else controls.update();
      composer.render();
    };

    // หยุดวาดเมื่อมองไม่เห็น (ประหยัดแบตมือถือ) ยกเว้นตอนกำลังเล่นแอนิเมชันเข้าหอ
    let visible = true;
    const sync = () => {
      const on = (visible && document.visibilityState === "visible") || (enter !== null && !entered);
      renderer.setAnimationLoop(on ? loop : null);
      frames = 0;
      windowStart = performance.now();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      startEnterRef.current = () => onEnteredRef.current?.();
      renderer.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", sync);
      io.disconnect();
      resizeObserver.disconnect();
      controls.dispose();
      ao.dispose();
      composer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => mat.dispose());
        }
      });
      mats.textures.forEach((t) => t.dispose());
      sky.dispose();
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={ref} className={className} />;
}
