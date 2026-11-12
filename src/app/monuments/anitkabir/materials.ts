import * as THREE from 'three';

/**
 * Prosedürel taş malzemesi: doku dosyası indirilmez (0 bayt). Standart PBR malzemenin shader'ına
 * dünya koordinatına bağlı gürültü ve taş sırası derzleri eklenir; aynı malzeme InstancedMesh ile
 * binlerce parçada paylaşılır. Dünya koordinatı kullanıldığı için UV açmaya da gerek kalmaz.
 */
type Variant = 'stone' | 'kilim' | 'grass' | 'paving' | 'hall' | 'mosaic';

const NOISE = /* glsl */ `
  varying vec3 vWPos;
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
const BODY: Record<Variant, string> = {
  // traverten: iki oktav gürültü + yatay derzler
  stone: /* glsl */ `
    float n = vnoise(vWPos * 0.4) * 0.6 + vnoise(vWPos * 2.6) * 0.4;
    diffuseColor.rgb *= 0.84 + 0.26 * n;
    float j = smoothstep(0.93, 1.0, abs(fract(vWPos.y / 1.2) * 2.0 - 1.0));
    float jv = smoothstep(0.96, 1.0, abs(fract((vWPos.x + vWPos.z + floor(vWPos.y / 1.2) * 1.1) / 2.4) * 2.0 - 1.0));
    diffuseColor.rgb *= 1.0 - 0.10 * max(j, jv);
    // gece projektörü: emissive ışık taş dokusunu korur ve yukarı doğru söner
    totalEmissiveRadiance *= (0.65 + 0.55 * n) * (1.0 - 0.3 * max(j, jv)) * mix(1.3, 0.55, clamp((vWPos.y - 6.7) / 17.0, 0.0, 1.0));
  `,
  // Tören Meydanı: açık traverten zemin, içte dikdörtgen bordür ve soluk kilim desenleri
  kilim: /* glsl */ `
    vec2 c = vWPos.xz / 6.0, id = floor(c), f = fract(c) - 0.5;
    float d = abs(f.x) + abs(f.y);
    float pick = h3(vec3(id, 1.0));
    vec3 cream = vec3(0.87, 0.81, 0.69), red = vec3(0.70, 0.45, 0.38), black = vec3(0.45, 0.42, 0.40);
    vec3 col = cream;
    float inside = step(abs(vWPos.x), 52.0) * step(abs(vWPos.z), 30.0);
    col = mix(col, pick > 0.5 ? red : black, inside * step(d, 0.30) * step(0.22, d) * 0.6);
    col = mix(col, pick > 0.5 ? black : red, inside * step(d, 0.10) * 0.6);
    col = mix(col, vec3(0.74, 0.68, 0.57), step(0.485, max(abs(f.x), abs(f.y))) * 0.6);
    float border = max(abs(vWPos.x) - 54.0, abs(vWPos.z) - 32.0);
    col = mix(col, vec3(0.62, 0.55, 0.45), step(0.0, border) * step(border, 1.2));
    diffuseColor.rgb = col * (0.9 + 0.16 * vnoise(vWPos * 1.7));
  `,
  // Şeref Holü zemini: krem, kırmızı ve siyah mermer şeritler
  hall: /* glsl */ `
    vec2 c = vWPos.xz / 3.0, f = abs(fract(c) - 0.5);
    float pick = h3(vec3(floor(c), 3.0));
    vec3 col = vec3(0.90, 0.86, 0.78);
    col = mix(col, vec3(0.55, 0.16, 0.14), step(0.38, max(f.x, f.y)));
    col = mix(col, vec3(0.10, 0.10, 0.11), step(0.46, max(f.x, f.y)));
    col = mix(col, vec3(0.55, 0.16, 0.14), step(f.x + f.y, 0.16) * step(0.5, pick));
    diffuseColor.rgb = col * (0.85 + 0.25 * vnoise(vWPos * 0.9));
  `,
  // Şeref Holü tavanı: kilim motifli altın mozaik
  mosaic: /* glsl */ `
    vec2 c = vWPos.xz / 2.2, f = fract(c) - 0.5;
    float d = abs(f.x) + abs(f.y);
    vec3 gold = vec3(0.86, 0.66, 0.22);
    vec3 col = mix(gold, vec3(0.55, 0.14, 0.12), step(d, 0.30) * step(0.20, d));
    col = mix(col, vec3(0.12, 0.25, 0.30), step(d, 0.10));
    col = mix(col, vec3(0.45, 0.32, 0.10), step(0.47, max(abs(f.x), abs(f.y))));
    float t = h3(vec3(floor(vWPos.xz * 6.0), 5.0));
    diffuseColor.rgb = col * (0.8 + 0.35 * t);
    totalEmissiveRadiance = diffuseColor.rgb * 0.35;
  `,
  grass: /* glsl */ `
    float n = vnoise(vWPos * 0.05) * 0.55 + vnoise(vWPos * 0.6) * 0.3 + vnoise(vWPos * 4.0) * 0.15;
    diffuseColor.rgb *= 0.7 + 0.55 * n;
  `,
  // Aslanlı Yol: aralarında boşluk bırakılmış taş döşeme
  paving: /* glsl */ `
    vec2 g = abs(fract(vWPos.xz / vec2(1.6, 1.1) + vec2(floor(vWPos.z / 1.1) * 0.5, 0.0)) - 0.5);
    float joint = step(0.455, max(g.x, g.y));
    diffuseColor.rgb *= (0.86 + 0.22 * vnoise(vWPos * 1.3)) * (1.0 - 0.38 * joint);
  `,
};

export function proceduralMaterial(variant: Variant, color: THREE.ColorRepresentation, opts: THREE.MeshStandardMaterialParameters = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        vWPos = (modelMatrix * wp).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + BODY[variant]);
  };
  m.customProgramCacheKey = () => 'anitkabir-' + variant;
  return m;
}

/** Sahnedeki tüm malzemeler tek yerde: az sayıda malzeme = az shader programı ve az durum değişimi */
export function createMaterials() {
  return {
    travertine: proceduralMaterial('stone', '#e4d6b8'),
    travertineLight: proceduralMaterial('stone', '#efe6d2'),
    travertineDark: proceduralMaterial('stone', '#c9b894'),
    kilim: proceduralMaterial('kilim', '#ffffff', { roughness: 0.8 }),
    paving: proceduralMaterial('paving', '#d9ccb0'),
    grass: proceduralMaterial('grass', '#6f8a4a', { roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: '#b9a888', roughness: 0.85 }),
    bronze: new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: 0.45, metalness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c9a23f', roughness: 0.55, metalness: 0.15 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 }),
    marble: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 }),
    redMarble: new THREE.MeshStandardMaterial({ color: '#8f3b34', roughness: 0.45 }),
    lion: proceduralMaterial('stone', '#d8ccb2'),
    treeDark: new THREE.MeshStandardMaterial({ color: '#3e5c38', roughness: 1, flatShading: true }),
    treeLight: new THREE.MeshStandardMaterial({ color: '#6f8f4e', roughness: 1, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: '#5a4634', roughness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: '#d9dde0', roughness: 0.35, metalness: 0.8 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffb347' }),
    roofMetal: new THREE.MeshStandardMaterial({ color: '#8d99a4', roughness: 0.55, metalness: 0.35 }),
    asphalt: new THREE.MeshStandardMaterial({ color: '#77777a', roughness: 1 }),
    hallFloor: proceduralMaterial('hall', '#ffffff', { roughness: 0.35 }),
    mosaic: proceduralMaterial('mosaic', '#ffffff', { roughness: 0.5 }),
    hallWall: proceduralMaterial('stone', '#eee6d6', { roughness: 0.6 }),
    // gündüz sönük, gece parlayan yüzeyler (ışık hesabı gerektirmez)
    bulb: new THREE.MeshBasicMaterial({ color: '#b9b4a6' }),
    windowGlow: new THREE.MeshBasicMaterial({ color: '#2a2622' }),
    hallWindow: new THREE.MeshBasicMaterial({ color: '#dfeaf2' }),
  };
}
export type Materials = ReturnType<typeof createMaterials>;

/**
 * Gece modu: mozole projektörle aydınlanmış gibi parlar (emissive; ek ışık maliyeti yok),
 * lambalar, pencereler ve galeriler yanar.
 */
export function applyNight(m: Materials, night: boolean) {
  for (const mat of [m.travertineLight, m.marble]) { mat.emissive.set(night ? '#ffcf8a' : '#000000'); mat.emissiveIntensity = night ? 0.34 : 0; }
  m.travertine.emissive.set(night ? '#ffb86a' : '#000000'); m.travertine.emissiveIntensity = night ? 0.12 : 0;
  m.kilim.emissive.set(night ? '#ffc98a' : '#000000'); m.kilim.emissiveIntensity = night ? 0.1 : 0;
  m.gold.emissive.set(night ? '#c98a2a' : '#000000'); m.gold.emissiveIntensity = night ? 0.6 : 0;
  m.hallWall.emissive.set('#ffd9a0'); m.hallWall.emissiveIntensity = night ? 0.3 : 0.12;
  m.bulb.color.set(night ? '#fff0c2' : '#b9b4a6');
  m.windowGlow.color.set(night ? '#ffc56e' : '#2a2622');
  m.hallWindow.color.set(night ? '#1b2440' : '#dfeaf2');
}

let _flag: THREE.CanvasTexture | null = null;
/** Türk bayrağı (canvas ile çizilir; ay ve yıldız resmî oranlara yakın) */
export function flagTexture() {
  if (_flag) return _flag;
  const c = document.createElement('canvas'); c.width = 300; c.height = 200;
  const g = c.getContext('2d')!; const G = 200;
  g.fillStyle = '#E30A17'; g.fillRect(0, 0, 300, 200);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0.5 * G, 100, 0.25 * G, 0, 7); g.fill();
  g.fillStyle = '#E30A17'; g.beginPath(); g.arc(0.5625 * G, 100, 0.2 * G, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath();
  const cx = 0.8475 * G - 0.125 * G + 0.02 * G, r = 0.125 * G;
  for (let i = 0; i < 10; i++) { const a = Math.PI + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r; g.lineTo(cx + Math.cos(a) * rr, 100 + Math.sin(a) * rr); }
  g.closePath(); g.fill();
  _flag = new THREE.CanvasTexture(c); _flag.colorSpace = THREE.SRGBColorSpace; return _flag;
}
