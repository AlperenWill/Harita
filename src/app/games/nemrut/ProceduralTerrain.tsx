/**
 * Prosedürel arazi: yükseklik fonksiyonundan (terrain.heightAt) üretilen tek ağ + GPU instancing ile kaya ve çalılar.
 *
 * Neden: Nemrut'ta ölçek duygusunu veren, tümülüsün arkasında dik inen yamaçlar ve uzak sırtlardır. Tek bir düzlem ağı (orta kademede
 * 180×180) yükseklik fonksiyonuyla yer değiştirir. Arazi gölge haritasına girmez: eğime ve yüksekliğe göre gölgelendirme köşe renklerine
 * bir kez yazılır ("statik ışık haritası" görevi görür) ve gerçek zamanlı güneş yalnızca yönlü ışık olarak eklenir. Dinamik gölgeyi
 * yalnızca heykeller üretir/alır. Kaya ve çalılar iki InstancedMesh'tir (2 çizim çağrısı) ve gölge üretmez.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PLATEAU_R, TUMULUS, heightAt, scatter } from './terrain';

export type Tier = 'low' | 'medium' | 'high';
const SIZE = 2600;
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const n = tier === 'low' ? 110 : tier === 'medium' ? 180 : 240, g = new THREE.PlaneGeometry(SIZE, SIZE, n, n).rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color();
    // köşeleri merkeze doğru sıklaştır: plato ve tümülüs ayrıntılı, uzak sırtlar kaba
    for (let i = 0; i < p.count; i++) { const x0 = p.getX(i) / (SIZE / 2), z0 = p.getZ(i) / (SIZE / 2), x = Math.sign(x0) * Math.pow(Math.abs(x0), 1.9) * (SIZE / 2), z = Math.sign(z0) * Math.pow(Math.abs(z0), 1.9) * (SIZE / 2); p.setXYZ(i, x, heightAt(x, z), z); }
    g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z), slope = 1 - nrm.getY(i);
      const gravel = r < TUMULUS.r + 2 && y > 0.5;                          // tümülüs: açık renkli kırma kireçtaşı
      c.set(gravel ? '#b9b0a0' : r < PLATEAU_R ? '#a39680' : '#8b7d68');
      const shade = 1 - Math.min(0.5, slope * 1.5) - (y < -40 ? Math.min(0.25, -y / 900) : 0);   // statik gölgelendirme: dik yüzler ve vadi tabanları koyu
      const tint = (Math.sin(x * 0.07) * Math.cos(z * 0.05) + 1) * 0.04;
      col[i * 3] = c.r * shade + tint; col[i * 3 + 1] = c.g * shade + tint * 0.8; col[i * 3 + 2] = c.b * shade;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  }, [tier]);
  return <mesh geometry={geo}><meshLambertMaterial vertexColors /></mesh>;
}

/** Kaya ve çalılar: GPU instancing (her biri tek çizim çağrısı) */
export function Scatter({ tier }: { tier: Tier }) {
  const { rocks, shrubs } = useMemo(() => {
    const nR = tier === 'low' ? 220 : tier === 'medium' ? 520 : 900, nS = tier === 'low' ? 120 : tier === 'medium' ? 320 : 600;
    const rg = new THREE.IcosahedronGeometry(1, 0), sg = new THREE.IcosahedronGeometry(1, 0).scale(1, 0.6, 1);
    const rm = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: '#9a8f7e', flatShading: true }), nR), sm = new THREE.InstancedMesh(sg, new THREE.MeshLambertMaterial({ color: '#6b6a44', flatShading: true }), nS);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    scatter(nR, 11, TUMULUS.r + 4, 330).forEach((s, i) => { e.set(s.rot, s.rot * 2, s.rot * 0.5); m.compose(new THREE.Vector3(s.x, heightAt(s.x, s.z) + s.s * 0.2, s.z), q.setFromEuler(e), new THREE.Vector3(s.s, s.s * 0.7, s.s * 1.2)); rm.setMatrixAt(i, m); });
    scatter(nS, 29, TUMULUS.r + 10, 300).forEach((s, i) => { m.compose(new THREE.Vector3(s.x, heightAt(s.x, s.z) + 0.2, s.z), q.identity(), new THREE.Vector3(s.s * 0.6, s.s * 0.5, s.s * 0.6)); sm.setMatrixAt(i, m); });
    return { rocks: rm, shrubs: sm };
  }, [tier]);
  return <><primitive object={rocks} /><primitive object={shrubs} /></>;
}
