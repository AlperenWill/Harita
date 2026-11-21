/**
 * Karakter iskeleti için geometri listesi (DOM'suz; poligon bütçesi testte buradan sayılır).
 * Neden prosedürel: Mixamo gibi hazır varlıklar bu ortamdan indirilemiyor ve lisansları ayrıca kontrol gerektiriyor.
 * Karakter, "kemik" görevi gören iç içe gruplardan oluşur (kalça → uyluk → diz → baldır; gövde → göğüs → omuz → dirsek → el; boyun → baş → çene).
 * SkinnedMesh yerine katı parçalar: mobilde kemik hesabı yok, animasyon kemik dönüşleriyle yapılır.
 *
 * Oranlar (v2): yetişkin, ~7,5 baş boyu. Baş küçültüldü (çizgi film kafası yerine), uzuvlar torna (lathe) profilleriyle
 * konik: uyluk → diz → baldır → bilek, omuz → dirsek → bilek. Gövde göğüs-bel-kalça hatlı, önden arkaya basık.
 * Yüz: beyaz göz + koyu iris, kaş, burun, dudak, kulak; saç başın arkasını ve yanlarını örter.
 */
import * as THREE from 'three';

export const DIM = { hip: 0.93, thigh: 0.45, shin: 0.43, torso: 0.56, upper: 0.29, fore: 0.26, headR: 0.112 } as const;

/** Y ekseni boyunca torna: [yarıçap, y] noktaları (y yukarı); sonra x/z ölçeklenebilir */
function lathe(prof: [number, number][], seg: number, sx = 1, sz = 1) {
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)), seg);
  g.scale(sx, 1, sz); g.computeVertexNormals(); return g;
}

export function buildGeometries() {
  const T = DIM.thigh, S = DIM.shin, U = DIM.upper, F = DIM.fore, H = DIM.headR;
  return {
    // bacak: uyluk (kalçadan dize, aşağı doğru) ve baldır (dizden bileğe)
    thigh: lathe([[0.001, -T - 0.01], [0.058, -T], [0.066, -T * 0.8], [0.08, -T * 0.4], [0.088, -T * 0.12], [0.08, 0.02], [0.001, 0.05]], 10),
    shin: lathe([[0.001, -S - 0.01], [0.04, -S], [0.044, -S * 0.82], [0.062, -S * 0.42], [0.06, -S * 0.15], [0.056, 0], [0.001, 0.03]], 10),
    shoe: new THREE.CapsuleGeometry(0.048, 0.15, 3, 8).rotateX(Math.PI / 2).scale(1.05, 0.78, 1).translate(0, -S - 0.025, -0.045),
    pelvis: new THREE.SphereGeometry(1, 12, 8).scale(0.165, 0.12, 0.115).translate(0, 0.02, 0),
    // gövde: bel → göğüs → omuz → boyun dibi; önden arkaya basık
    torso: lathe([[0.001, -0.03], [0.15, -0.02], [0.142, 0.1], [0.135, 0.18], [0.155, 0.3], [0.168, 0.4], [0.17, DIM.torso - 0.1], [0.14, DIM.torso - 0.035], [0.065, DIM.torso], [0.001, DIM.torso + 0.005]], 14, 1, 0.66),
    shoulder: new THREE.SphereGeometry(0.06, 10, 8),
    upper: lathe([[0.001, -U - 0.01], [0.042, -U], [0.046, -U * 0.6], [0.054, -U * 0.25], [0.056, 0], [0.001, 0.04]], 8),
    fore: lathe([[0.001, -F - 0.005], [0.032, -F], [0.036, -F * 0.7], [0.046, -F * 0.25], [0.044, 0], [0.001, 0.03]], 8),
    hand: new THREE.SphereGeometry(1, 8, 6).scale(0.04, 0.062, 0.022).translate(0, -0.05, 0),
    finger: new THREE.CapsuleGeometry(0.014, 0.06, 2, 4).rotateX(Math.PI / 2).translate(0, 0, -0.06),
    thumb: new THREE.CapsuleGeometry(0.012, 0.035, 2, 4).rotateZ(0.6).translate(0.03, -0.035, -0.01),
    neck: new THREE.CylinderGeometry(0.047, 0.055, 0.11, 10),
    // baş: hafif yumurta biçimi (çene daralır), önden arkaya biraz uzun
    head: (() => { const g = new THREE.SphereGeometry(H, 18, 14), p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), lower = Math.max(0, -y / H); p.setXYZ(i, x * (0.9 - lower * 0.16), y * 1.14, z * (1.0 - lower * 0.08) + (y < 0 && z < 0 ? lower * 0.012 : 0)); }
      g.computeVertexNormals(); return g; })(),
    hair: new THREE.SphereGeometry(H * 1.07, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(0.93, 1.12, 1.04),
    hairBack: new THREE.SphereGeometry(H * 1.05, 12, 8, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.35, Math.PI * 0.35).scale(0.93, 1.1, 1.04),
    ear: new THREE.SphereGeometry(1, 6, 5).scale(0.012, 0.028, 0.02),
    sclera: new THREE.SphereGeometry(1, 8, 6).scale(0.017, 0.011, 0.008),
    iris: new THREE.SphereGeometry(0.0075, 8, 6),
    brow: new THREE.BoxGeometry(0.036, 0.007, 0.008),
    nose: new THREE.CylinderGeometry(0.006, 0.017, 0.045, 6).rotateX(-0.35).scale(1, 1, 0.9),
    mouthTop: new THREE.CapsuleGeometry(0.007, 0.035, 2, 6).rotateZ(Math.PI / 2),
    jaw: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55).scale(0.05, 0.035, 0.03).translate(0, 0, 0),
    mouthIn: new THREE.BoxGeometry(0.04, 0.016, 0.008).translate(0, -0.01, 0),
    scarf: new THREE.BoxGeometry(0.09, 0.15, 0.018).translate(0, -0.075, 0),
    collar: new THREE.TorusGeometry(0.066, 0.024, 6, 14).rotateX(Math.PI / 2),
  };
}
export type Geos = ReturnType<typeof buildGeometries>;
/** Her parçanın karakterde kaç kez kullanıldığı */
export const USES: Record<keyof Geos, number> = {
  thigh: 2, shin: 2, shoe: 2, pelvis: 1, torso: 1, shoulder: 2, upper: 2, fore: 2, hand: 2, finger: 1, thumb: 2, neck: 1, head: 1, hair: 1, hairBack: 1,
  ear: 2, sclera: 2, iris: 2, brow: 2, nose: 1, mouthTop: 1, jaw: 1, mouthIn: 1, scarf: 3, collar: 1,
};
export function triangleCount(g: Geos): number {
  let n = 0;
  for (const k of Object.keys(g) as (keyof Geos)[]) {
    const geo = g[k], tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    n += tris * USES[k];
  }
  return n;
}
