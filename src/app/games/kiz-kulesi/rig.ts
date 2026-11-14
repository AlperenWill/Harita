/**
 * Karakter iskeleti için geometri listesi (DOM'suz; poligon bütçesi testte buradan sayılır).
 * Neden prosedürel: Mixamo gibi hazır varlıklar bu ortamdan indirilemiyor ve lisansları ayrıca kontrol gerektiriyor.
 * Karakter, "kemik" görevi gören iç içe gruplardan oluşur (kalça → gövde → göğüs → omuz → dirsek → el; boyun → baş → çene).
 * SkinnedMesh yerine katı parçalar: mobilde kemik hesabı yok, 4 animasyon durumu yine de kemik dönüşleriyle yapılır.
 */
import * as THREE from 'three';

export const DIM = { hip: 0.95, leg: 0.86, torso: 0.56, upper: 0.3, fore: 0.28, headR: 0.15 } as const;

export function buildGeometries() {
  return {
    leg: new THREE.CapsuleGeometry(0.075, DIM.leg - 0.15, 3, 8).translate(0, -DIM.leg / 2, 0),
    shoe: new THREE.BoxGeometry(0.12, 0.08, 0.24).translate(0, -DIM.leg + 0.02, -0.04),
    torso: new THREE.CapsuleGeometry(0.17, DIM.torso - 0.25, 4, 10).scale(1, 1, 0.72).translate(0, DIM.torso / 2, 0),
    upper: new THREE.CapsuleGeometry(0.055, DIM.upper - 0.1, 3, 8).translate(0, -DIM.upper / 2, 0),
    fore: new THREE.CapsuleGeometry(0.048, DIM.fore - 0.1, 3, 8).translate(0, -DIM.fore / 2, 0),
    hand: new THREE.SphereGeometry(0.055, 8, 6),
    finger: new THREE.CapsuleGeometry(0.016, 0.08, 2, 4).rotateX(Math.PI / 2).translate(0, 0, -0.07),
    neck: new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8),
    head: new THREE.SphereGeometry(DIM.headR, 16, 12),
    hair: new THREE.SphereGeometry(DIM.headR * 1.06, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    eye: new THREE.SphereGeometry(0.018, 6, 4),
    brow: new THREE.BoxGeometry(0.045, 0.01, 0.01),
    nose: new THREE.ConeGeometry(0.018, 0.05, 5).rotateX(-Math.PI / 2),
    mouthTop: new THREE.BoxGeometry(0.06, 0.008, 0.012),
    jaw: new THREE.BoxGeometry(0.07, 0.04, 0.03).translate(0, -0.02, 0),
    mouthIn: new THREE.BoxGeometry(0.055, 0.022, 0.01).translate(0, -0.012, 0),
    scarf: new THREE.BoxGeometry(0.1, 0.16, 0.02).translate(0, -0.08, 0),
    collar: new THREE.TorusGeometry(0.075, 0.025, 6, 12).rotateX(Math.PI / 2),
  };
}
export type Geos = ReturnType<typeof buildGeometries>;
/** Her parçanın karakterde kaç kez kullanıldığı */
export const USES: Record<keyof Geos, number> = {
  leg: 2, shoe: 2, torso: 1, upper: 2, fore: 2, hand: 2, finger: 1, neck: 1, head: 1, hair: 1, eye: 2, brow: 2, nose: 1, mouthTop: 1, jaw: 1, mouthIn: 1, scarf: 3, collar: 1,
};
export function triangleCount(g: Geos): number {
  let n = 0;
  for (const k of Object.keys(g) as (keyof Geos)[]) {
    const geo = g[k], tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    n += tris * USES[k];
  }
  return n;
}
