"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * โมเดล 3 มิติของหอพัก DORM-PAY (สร้างจากโค้ดทั้งหมด ไม่โหลดไฟล์โมเดล)
 * - ตึก 4 ชั้น ระเบียงชั้นละ 4 ห้อง ทางเข้ากลางตึก ถังน้ำ + ป้ายบนดาดฟ้า
 * - วัสดุแบบ PBR + texture ที่วาดเองบน canvas, ขอบมน, กระจกสะท้อนแสง
 * - แสงแดด เงา แสงไฟอุ่น และ ambient occlusion (GTAO)
 */

const FLOORS = 4;
const FLOOR_H = 2.4;
const W = 10; // กว้าง (แกน x)
const D = 6; // ลึก (แกน z)
const H = FLOORS * FLOOR_H;
const FRONT = D / 2;
const ROOM_X = [-3.75, -1.25, 1.25, 3.75];

/** หน้าต่างบางบานเปิดไฟ เลือกแบบคงที่ (ไม่สุ่มใหม่ทุกครั้ง) */
const isLit = (floor: number, i: number, side: number) => (floor * 7 + i * 3 + side * 5) % 5 < 2;

/** ตัวสุ่มที่ให้ผลเหมือนเดิมทุกครั้ง (ต้นหญ้า/ดอกไม้จะไม่ขยับที่เมื่อรีเฟรช) */
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
/* Texture ที่วาดเองบน canvas                                          */
/* ------------------------------------------------------------------ */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 1, srgb = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** ผิวปูนฉาบ: จุดเล็กๆ สีอ่อน-เข้มสลับกันแบบเนียนๆ */
function speckle(base: string, spread: number, seed: number) {
  return (ctx: CanvasRenderingContext2D, s: number) => {
    const rnd = seeded(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s * s * 0.35; i++) {
      const v = (rnd() - 0.5) * spread;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(60,50,40,${-v})`;
      ctx.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
    }
  };
}

function grassTexture(ctx: CanvasRenderingContext2D, s: number) {
  const rnd = seeded(7);
  ctx.fillStyle = "#79c98a";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const g = 150 + rnd() * 70;
    ctx.strokeStyle = `rgba(${70 + rnd() * 40},${g},${90 + rnd() * 30},0.55)`;
    ctx.lineWidth = 1;
    const x = rnd() * s;
    const y = rnd() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 5);
    ctx.stroke();
  }
}

function pavingTexture(ctx: CanvasRenderingContext2D, s: number) {
  const rnd = seeded(11);
  ctx.fillStyle = "#cfc8bd";
  ctx.fillRect(0, 0, s, s);
  const n = 4;
  const cell = s / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const off = y % 2 ? cell / 2 : 0;
      const tone = 228 + rnd() * 16;
      ctx.fillStyle = `rgb(${tone},${tone - 5},${tone - 12})`;
      ctx.fillRect(x * cell + off + 2, y * cell + 2, cell - 4, cell - 4);
      if (off) ctx.fillRect(off - cell + 2, y * cell + 2, cell - 4, cell - 4);
    }
  }
}

function signTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 1024, 256);
  g.addColorStop(0, "#7c83f0");
  g.addColorStop(1, "#5b5fd6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 0, 1024, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 150px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(30,27,75,0.35)";
  ctx.shadowBlur = 12;
  ctx.fillText("DORM-PAY", 512, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#a9dcf7");
  g.addColorStop(0.55, "#dfe7fb");
  g.addColorStop(1, "#eef0ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/* วัสดุ                                                              */
/* ------------------------------------------------------------------ */

function createMaterials() {
  const plaster = canvasTexture(256, speckle("#f3e6d0", 0.09, 1), 3);
  const plasterBump = canvasTexture(256, speckle("#808080", 0.5, 2), 3, false);
  const concrete = canvasTexture(256, speckle("#d6d9de", 0.14, 3), 2);
  const stone = canvasTexture(256, speckle("#e4ddd2", 0.12, 4), 1);
  const grass = canvasTexture(512, grassTexture, 10);
  const paving = canvasTexture(256, pavingTexture, 1);
  paving.repeat.set(1, 4);

  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  return {
    textures: [plaster, plasterBump, concrete, stone, grass, paving],
    wall: std({ color: 0xffffff, map: plaster, bumpMap: plasterBump, bumpScale: 0.6, roughness: 0.93 }),
    plinth: std({ color: 0xffffff, map: stone, roughness: 0.85 }),
    trim: std({ color: 0xa9adf2, roughness: 0.45, metalness: 0.05 }), // ม่วงพาสเทล
    slab: std({ color: 0xfbf8f2, map: stone, roughness: 0.8 }),
    roof: std({ color: 0xffffff, map: concrete, roughness: 0.95 }),
    rail: std({ color: 0xeef0f4, roughness: 0.3, metalness: 0.75 }),
    frame: std({ color: 0xfafbfc, roughness: 0.35, metalness: 0.4 }),
    darkFrame: std({ color: 0x475569, roughness: 0.35, metalness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x8fc3ec,
      roughness: 0.04,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.2,
    }),
    litGlass: std({ color: 0xfff3d6, emissive: 0xffc46b, emissiveIntensity: 0.85, roughness: 0.2 }),
    lamp: std({ color: 0xfff7e6, emissive: 0xffd08a, emissiveIntensity: 2.2 }),
    door: std({ color: 0x64748b, roughness: 0.6 }),
    tank: new THREE.MeshPhysicalMaterial({ color: 0x8cc4f5, roughness: 0.25, metalness: 0.1, clearcoat: 0.8 }),
    tankBand: std({ color: 0x5b9bd9, roughness: 0.35 }),
    pot: std({ color: 0xd98a6a, roughness: 0.75 }),
    soil: std({ color: 0x8a6a52, roughness: 1 }),
    base: std({ color: 0xece2d0, map: stone, roughness: 0.9 }),
    grass: std({ color: 0xffffff, map: grass, roughness: 1 }),
    paving: std({ color: 0xffffff, map: paving, roughness: 0.85 }),
    trunk: std({ color: 0x8b6247, roughness: 0.9 }),
    leaves: [0x6cc27c, 0x55b06a, 0x86d48f, 0x4a9e5e].map((c) => std({ color: c, roughness: 0.85 })),
    blade: std({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }),
    flower: std({ color: 0xffffff, roughness: 0.6 }),
    sign: std({ color: 0xffffff, map: signTexture(), roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.08 }),
  };
}
type Mats = ReturnType<typeof createMaterials>;

/* ------------------------------------------------------------------ */
/* ตัวช่วยสร้างรูปทรง                                                  */
/* ------------------------------------------------------------------ */

const geoCache = new Map<string, THREE.BufferGeometry>();
function roundedGeo(w: number, h: number, d: number, r: number) {
  const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const key = `${w}|${h}|${d}|${radius}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, radius);
    geoCache.set(key, g);
  }
  return g;
}

/** กล่องขอบมน */
function rbox(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0.04) {
  const m = new THREE.Mesh(roundedGeo(w, h, d, r), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cylinder(parent: THREE.Object3D, rt: number, rb: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

type Facing = "front" | "back" | "left" | "right";

/** หน้าต่างกระจก + กรอบอลูมิเนียม + ขอบบัวใต้หน้าต่าง */
function addWindow(parent: THREE.Object3D, m: Mats, o: { w: number; h: number; x: number; y: number; z: number; facing: Facing; lit: boolean; sill?: boolean }) {
  const g = new THREE.Group();
  const t = 0.07;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), o.lit ? m.litGlass : m.glass);
  glass.position.z = 0.015;
  g.add(glass);
  rbox(g, o.w + 2 * t, t, 0.08, m.frame, 0, o.h / 2 + t / 2, 0.04, 0.02);
  rbox(g, o.w + 2 * t, t, 0.08, m.frame, 0, -o.h / 2 - t / 2, 0.04, 0.02);
  rbox(g, t, o.h, 0.08, m.frame, -o.w / 2 - t / 2, 0, 0.04, 0.02);
  rbox(g, t, o.h, 0.08, m.frame, o.w / 2 + t / 2, 0, 0.04, 0.02);
  if (o.w > 0.95) rbox(g, 0.045, o.h, 0.06, m.frame, 0, 0, 0.035, 0.015); // เสากลางบานเลื่อน
  if (o.sill !== false) rbox(g, o.w + 0.3, 0.06, 0.16, m.slab, 0, -o.h / 2 - t - 0.03, 0.08, 0.025);

  const rot = { front: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 }[o.facing];
  g.rotation.y = rot;
  g.position.set(o.x, o.y, o.z);
  parent.add(g);
}

/** กระถางต้นไม้ + ดอกไม้เล็กๆ */
function addPlant(parent: THREE.Object3D, m: Mats, x: number, y: number, z: number, rnd: () => number, flowers: THREE.Matrix4[], flowerColors: THREE.Color[]) {
  cylinder(parent, 0.13, 0.095, 0.22, m.pot, x, y + 0.11, z, 14);
  cylinder(parent, 0.115, 0.115, 0.02, m.soil, x, y + 0.215, z, 14);
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 + rnd() * 0.05, 1), m.leaves[Math.floor(rnd() * m.leaves.length)]);
  leaf.position.set(x, y + 0.36, z);
  leaf.scale.y = 0.9 + rnd() * 0.3;
  leaf.castShadow = true;
  parent.add(leaf);
  const palette = [0xf9a8d4, 0xc4b5fd, 0xfde68a, 0xfda4af, 0xffffff];
  const color = new THREE.Color(palette[Math.floor(rnd() * palette.length)]);
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    flowers.push(new THREE.Matrix4().makeTranslation(x + Math.cos(a) * 0.12, y + 0.42 + rnd() * 0.08, z + Math.sin(a) * 0.12));
    flowerColors.push(color);
  }
}

/* ------------------------------------------------------------------ */
/* ตัวตึก                                                              */
/* ------------------------------------------------------------------ */

function buildDorm(m: Mats, lights: THREE.Object3D[]) {
  const g = new THREE.Group();
  const rnd = seeded(42);
  const balusters: THREE.Matrix4[] = [];
  const flowers: THREE.Matrix4[] = [];
  const flowerColors: THREE.Color[] = [];

  // ตัวตึก + ฐาน
  rbox(g, W, H, D, m.wall, 0, H / 2, 0, 0.18);
  rbox(g, W + 0.3, 0.22, D + 0.3, m.plinth, 0, 0.11, 0, 0.06);

  // คิ้วสีม่วงพาสเทลคั่นแต่ละชั้น
  for (let f = 1; f <= FLOORS; f++) rbox(g, W + 0.2, 0.16, D + 0.2, m.trim, 0, f * FLOOR_H, 0, 0.06);

  // ชั้น 2-4: ห้องละ 1 ระเบียง
  for (let f = 1; f < FLOORS; f++) {
    const y0 = f * FLOOR_H;
    ROOM_X.forEach((x, i) => {
      const lit = isLit(f, i, 0);
      addWindow(g, m, { w: 1.4, h: 1.7, x, y: y0 + 1.07, z: FRONT, facing: "front", lit, sill: false });

      const zb = FRONT + 0.47; // กลางระเบียง
      const zr = FRONT + 0.9; // แนวราวด้านหน้า
      rbox(g, 2.2, 0.14, 0.95, m.slab, x, y0 + 0.08, zb, 0.04);
      rbox(g, 0.08, 1.0, 0.95, m.wall, x - 1.08, y0 + 0.6, zb, 0.03); // ผนังกั้นระหว่างห้อง

      // ราวเหล็ก: ราวบน ราวกลาง ราวล่าง + ซี่ราว (ใช้ InstancedMesh)
      for (const [yy, s] of [[1.0, 0.06], [0.55, 0.035], [0.22, 0.035]] as const) {
        rbox(g, 2.12, s, s, m.rail, x + 0.02, y0 + yy, zr, s / 2.2);
        rbox(g, s, s, 0.86, m.rail, x + 1.06, y0 + yy, zb + 0.02, s / 2.2);
      }
      for (let p = -0.98; p <= 1.0; p += 0.14) balusters.push(new THREE.Matrix4().makeTranslation(x + p, y0 + 0.6, zr));
      for (let q = 0.12; q < 0.88; q += 0.14) balusters.push(new THREE.Matrix4().makeTranslation(x + 1.06, y0 + 0.6, FRONT + q));

      // กระถางต้นไม้ 1-3 ใบ
      const spots = [-0.72, 0.1, 0.72].filter(() => rnd() > 0.3);
      if (!spots.length) spots.push(-0.7);
      spots.forEach((sx) => addPlant(g, m, x + sx, y0 + 0.15, FRONT + 0.7, rnd, flowers, flowerColors));

      // โคมไฟเพดานระเบียง (ห้องที่เปิดไฟ)
      if (lit) cylinder(g, 0.11, 0.11, 0.03, m.lamp, x, y0 + FLOOR_H - 0.1, zb, 16);
    });
  }

  // ชั้นล่าง: หน้าต่าง 4 บาน
  [-3.5, -2, 2, 3.5].forEach((x, i) => addWindow(g, m, { w: 1, h: 1.1, x, y: 1.3, z: FRONT, facing: "front", lit: isLit(0, i, 0) }));

  // ทางเข้า: ประตูกระจกบานคู่ กรอบสีเทาเข้ม มือจับ กันสาด เสา บันได โคมไฟผนัง
  rbox(g, 2.2, 2.05, 0.12, m.darkFrame, 0, 1.2, FRONT + 0.02, 0.03);
  for (const sx of [-0.45, 0.45]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.82), m.glass);
    pane.position.set(sx, 1.15, FRONT + 0.09);
    g.add(pane);
    cylinder(g, 0.018, 0.018, 0.6, m.rail, sx > 0 ? 0.1 : -0.1, 1.15, FRONT + 0.14, 8);
  }
  rbox(g, 0.05, 1.85, 0.05, m.darkFrame, 0, 1.15, FRONT + 0.1, 0.02);
  rbox(g, 3.1, 0.14, 1.5, m.trim, 0, 2.27, FRONT + 0.72, 0.05);
  for (const sx of [-1.4, 1.4]) cylinder(g, 0.04, 0.04, 2.2, m.rail, sx, 1.1, FRONT + 1.35, 10);
  rbox(g, 2.8, 0.2, 1.0, m.plinth, 0, 0.1, FRONT + 0.6, 0.04);
  rbox(g, 3.2, 0.1, 0.5, m.plinth, 0, 0.05, FRONT + 1.3, 0.03);
  for (const sx of [-1.3, 1.3]) {
    rbox(g, 0.16, 0.24, 0.1, m.lamp, sx, 1.75, FRONT + 0.08, 0.04);
    const light = new THREE.PointLight(0xffc77a, 3, 5, 2);
    light.position.set(sx, 1.75, FRONT + 0.5);
    lights.push(light);
  }

  // ด้านหลัง และด้านข้าง
  for (let f = 0; f < FLOORS; f++) {
    const y = f * FLOOR_H + 1.3;
    ROOM_X.forEach((x, i) => addWindow(g, m, { w: 0.9, h: 0.9, x, y, z: -FRONT, facing: "back", lit: isLit(f, i, 1) }));
    [-1.5, 1.5].forEach((z, i) => {
      addWindow(g, m, { w: 0.9, h: 0.9, x: W / 2, y, z, facing: "right", lit: isLit(f, i, 2) });
      addWindow(g, m, { w: 0.9, h: 0.9, x: -W / 2, y, z, facing: "left", lit: isLit(f, i, 3) });
    });
  }

  // ดาดฟ้า: พื้นคอนกรีต ขอบกันตก ห้องบันได ถังน้ำ
  rbox(g, W - 0.25, 0.05, D - 0.25, m.roof, 0, H + 0.1, 0, 0.02);
  for (const [w, d, x, z] of [
    [W, 0.18, 0, FRONT - 0.09],
    [W, 0.18, 0, -FRONT + 0.09],
    [0.18, D, W / 2 - 0.09, 0],
    [0.18, D, -W / 2 + 0.09, 0],
  ] as const) {
    rbox(g, w, 0.5, d, m.wall, x, H + 0.25, z, 0.06);
    rbox(g, w + 0.04, 0.06, d + 0.04, m.trim, x, H + 0.52, z, 0.025);
  }
  rbox(g, 2, 1.8, 2, m.wall, -3, H + 0.9, -1, 0.1);
  rbox(g, 2.25, 0.14, 2.25, m.trim, -3, H + 1.86, -1, 0.05);
  rbox(g, 0.7, 1.3, 0.06, m.door, -3, H + 0.75, 0.02, 0.02);

  rbox(g, 1.3, 0.08, 1.3, m.rail, 3, H + 0.9, -1.4, 0.02);
  for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) cylinder(g, 0.035, 0.035, 0.85, m.rail, 3 + dx, H + 0.47, -1.4 + dz, 8);
  cylinder(g, 0.62, 0.62, 1.1, m.tank, 3, H + 1.5, -1.4, 32);
  for (const yy of [1.15, 1.85]) cylinder(g, 0.635, 0.635, 0.05, m.tankBand, 3, H + yy, -1.4, 32);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.tank);
  cap.scale.y = 0.35;
  cap.position.set(3, H + 2.05, -1.4);
  cap.castShadow = true;
  g.add(cap);

  // ป้าย DORM-PAY
  rbox(g, 4.6, 1.2, 0.16, m.trim, 0, H + 1.4, FRONT - 0.3, 0.07);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.35, 1.0), m.sign);
  face.position.set(0, H + 1.4, FRONT - 0.21);
  g.add(face);
  for (const sx of [-1.6, 1.6]) cylinder(g, 0.05, 0.05, 0.85, m.rail, sx, H + 0.45, FRONT - 0.3, 8);

  // InstancedMesh: ซี่ราวทั้งหมด และดอกไม้บนระเบียง
  const bal = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.016, 0.78, 6), m.rail, balusters.length);
  balusters.forEach((mat, i) => bal.setMatrixAt(i, mat));
  bal.castShadow = true;
  g.add(bal);

  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 0), m.flower, flowers.length);
  flowers.forEach((mat, i) => {
    fl.setMatrixAt(i, mat);
    fl.setColorAt(i, flowerColors[i]);
  });
  g.add(fl);

  return g;
}

/* ------------------------------------------------------------------ */
/* สภาพแวดล้อม                                                         */
/* ------------------------------------------------------------------ */

function insideFootprint(x: number, z: number) {
  if (Math.abs(x) < W / 2 + 0.6 && Math.abs(z) < D / 2 + 0.6) return true; // ตัวตึก
  if (Math.abs(x) < 1.7 && z > FRONT) return true; // ทางเดิน + บันได
  if (Math.abs(Math.abs(x) - 3.2) < 1.7 && z > FRONT && z < FRONT + 1.8) return true; // แปลงดอกไม้
  return false;
}

function buildEnvironment(m: Mats, detail: number, sway: THREE.Object3D[], lights: THREE.Object3D[]) {
  const g = new THREE.Group();
  const rnd = seeded(2026);
  const R = 15;

  // ฐานแบบโมเดลจำลอง (diorama) + สนามหญ้า
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.25, 0.8, 72), m.base);
  base.position.y = -0.41;
  base.receiveShadow = true;
  g.add(base);
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(R, 72), m.grass);
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  g.add(lawn);

  // ทางเดินปูกระเบื้อง + ขอบคันหิน
  const pathLen = R - FRONT - 1.4;
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, pathLen), m.paving);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, FRONT + 1.55 + pathLen / 2);
  path.receiveShadow = true;
  g.add(path);
  for (const sx of [-1.28, 1.28]) rbox(g, 0.14, 0.1, pathLen, m.plinth, sx, 0.05, FRONT + 1.55 + pathLen / 2, 0.03);

  // โคมไฟริมทาง
  for (const [sx, z] of [[-1.7, FRONT + 4.5], [1.7, FRONT + 7.5]] as const) {
    cylinder(g, 0.05, 0.07, 1.9, m.darkFrame, sx, 0.95, z, 10);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), m.lamp);
    globe.position.set(sx, 2.0, z);
    g.add(globe);
    const light = new THREE.PointLight(0xffc77a, 2, 4, 2);
    light.position.set(sx, 1.9, z);
    lights.push(light);
  }

  // แปลงดอกไม้หน้าตึก (ตำแหน่งพุ่มไม้เดิม)
  const flowerM: THREE.Matrix4[] = [];
  const flowerC: THREE.Color[] = [];
  const palette = [0xf9a8d4, 0xc4b5fd, 0xfde68a, 0xfbcfe8, 0xffffff, 0xa5b4fc];
  for (const sx of [-3.2, 3.2]) {
    rbox(g, 3.1, 0.22, 1.2, m.plinth, sx, 0.11, FRONT + 1.05, 0.06);
    rbox(g, 2.9, 0.04, 1.0, m.soil, sx, 0.22, FRONT + 1.05, 0.02);
    for (const bx of [-1, 1]) {
      const bush = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + rnd() * 0.1, 1), m.leaves[k % m.leaves.length]);
        s.position.set((k - 1) * 0.28, 0.28 + rnd() * 0.08, (rnd() - 0.5) * 0.2);
        s.castShadow = true;
        bush.add(s);
      }
      bush.position.set(sx + bx * 0.85, 0.2, FRONT + 1.05);
      g.add(bush);
    }
    for (let i = 0; i < 26; i++) {
      flowerM.push(new THREE.Matrix4().makeTranslation(sx + (rnd() - 0.5) * 1.1, 0.3 + rnd() * 0.12, FRONT + 0.6 + rnd() * 0.9));
      flowerC.push(new THREE.Color(palette[Math.floor(rnd() * palette.length)]));
    }
  }

  // ต้นไม้ (ตำแหน่งเดิม): ลำต้นเรียว + พุ่มใบหลายลูก
  const trees: [number, number, number][] = [
    [-8, 5, 1.1], [8, 4, 1], [-9, -3, 1.2], [9, -4, 0.9], [-4, 8.5, 0.8], [5, 9, 0.85],
  ];
  trees.forEach(([x, z, s], ti) => {
    cylinder(g, 0.13 * s, 0.24 * s, 2 * s, m.trunk, x, s, z, 10);
    const crown = new THREE.Group();
    crown.position.set(x, 2.3 * s, z);
    const parts: [number, number, number, number][] = [
      [0, 0.15, 0, 1.15], [0.6, -0.15, 0.2, 0.8], [-0.55, -0.1, -0.25, 0.85], [0.1, 0.75, -0.1, 0.75], [-0.2, -0.2, 0.6, 0.7],
    ];
    parts.forEach(([dx, dy, dz, r], k) => {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 2), m.leaves[(ti + k) % m.leaves.length]);
      blob.position.set(dx * s, dy * s, dz * s);
      blob.castShadow = true;
      blob.receiveShadow = true;
      crown.add(blob);
    });
    crown.userData.phase = ti * 1.3;
    sway.push(crown);
    g.add(crown);
  });

  // ใบหญ้า + ดอกไม้ในสนาม (InstancedMesh)
  const bladeGeo = new THREE.ConeGeometry(0.035, 0.32, 3);
  bladeGeo.translate(0, 0.16, 0);
  const bladeCount = Math.round(2600 * detail);
  const blades = new THREE.InstancedMesh(bladeGeo, m.blade, bladeCount);
  const tmp = new THREE.Object3D();
  const col = new THREE.Color();
  let n = 0;
  while (n < bladeCount) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * (R - 0.3);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (insideFootprint(x, z)) continue;
    tmp.position.set(x, 0, z);
    tmp.rotation.set((rnd() - 0.5) * 0.4, rnd() * Math.PI, (rnd() - 0.5) * 0.4);
    tmp.scale.setScalar(0.7 + rnd() * 0.8);
    tmp.updateMatrix();
    blades.setMatrixAt(n, tmp.matrix);
    blades.setColorAt(n, col.setHSL(0.31 + rnd() * 0.06, 0.5 + rnd() * 0.15, 0.36 + rnd() * 0.12));
    n++;
  }
  g.add(blades);

  for (let i = 0; i < Math.round(160 * detail); i++) {
    const a = rnd() * Math.PI * 2;
    const r = 3 + Math.sqrt(rnd()) * (R - 3.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (insideFootprint(x, z)) continue;
    flowerM.push(new THREE.Matrix4().makeTranslation(x, 0.16 + rnd() * 0.08, z));
    flowerC.push(new THREE.Color(palette[Math.floor(rnd() * palette.length)]));
  }
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), m.flower, flowerM.length);
  flowerM.forEach((mat, i) => {
    fl.setMatrixAt(i, mat);
    fl.setColorAt(i, flowerC[i]);
  });
  g.add(fl);

  return g;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function DormModel({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      return; // ไม่รองรับ WebGL: แสดงพื้นหลังสีฟ้าเฉยๆ
    }
    const small = el.clientWidth < 640;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
    renderer.toneMapping = THREE.NeutralToneMapping; // คงสีพาสเทลไว้ ไม่ซีดแบบ ACES
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // ฉากไม่ขยับ (มีแต่กล้องหมุน) จึงคำนวณเงาครั้งเดียวพอ ไม่ต้องทุกเฟรม
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "โมเดล 3 มิติของหอพัก DORM-PAY");
    renderer.domElement.style.touchAction = "pan-y";
    el.appendChild(renderer.domElement);

    // ฉาก + แสงสะท้อนรอบทิศ (ทำให้กระจกและโลหะสะท้อนแสงได้สมจริง)
    const scene = new THREE.Scene();
    const sky = skyTexture();
    scene.background = sky;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.35;

    const mats = createMaterials();
    const sway: THREE.Object3D[] = [];
    const lights: THREE.Object3D[] = [];
    scene.add(buildEnvironment(mats, small ? 0.45 : 1, sway, lights), buildDorm(mats, lights));
    scene.add(...lights);

    // แสงแดดอุ่นๆ + แสงฟ้า + แสงเติมด้านตรงข้าม
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0xb7e4c0, 0.55));
    const sun = new THREE.DirectionalLight(0xffedd2, 2.6);
    sun.position.set(14, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc7d2fe, 0.5);
    fill.position.set(-12, 8, -10);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(20, 13, 24);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 4.8, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false; // ไม่ดักการเลื่อนหน้าเว็บ
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.4;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.7;

    // Post-processing: ambient occlusion (เงานุ่มๆ ตามซอกมุม)
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 512, 512);
    ao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.5, thickness: 1.2, scale: 1, samples: small ? 8 : 16 });
    ao.blendIntensity = 0.85;
    composer.addPass(ao);
    composer.addPass(new OutputPass());

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.setLength(w / h < 1 ? 46 : 35); // จอแคบ: ถอยกล้องให้เห็นทั้งตึก
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    // ปรับคุณภาพอัตโนมัติ: ถ้าเครื่องวาดได้ช้า ปิด AO และลดความละเอียด
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

    const clock = new THREE.Clock();
    const loop = () => {
      adapt();
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        for (const c of sway) {
          c.rotation.z = Math.sin(t * 0.9 + c.userData.phase) * 0.025;
          c.rotation.x = Math.cos(t * 0.7 + c.userData.phase) * 0.015;
        }
      }
      controls.update();
      composer.render();
    };

    // หยุดวาดเมื่อมองไม่เห็น (ประหยัดแบตมือถือ)
    let visible = true;
    const sync = () => {
      const on = visible && document.visibilityState === "visible";
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
      geoCache.clear();
      mats.textures.forEach((t) => t.dispose());
      mats.sign.map?.dispose();
      sky.dispose();
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={ref} className={className} />;
}
