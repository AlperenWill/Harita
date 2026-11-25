/**
 * Kabartma (bump) gölgelendiricisini NaN'a karşı güvenli yapar.
 *
 * three r169'daki `perturbNormalArb`, ekran türevlerini (`dFdx`/`dFdy`) doğrudan `normalize` eder. Ufka yatık bakılan uzak zeminde
 * bu türevler sıfıra inebilir; `normalize(0)` NaN verir. Tek bir NaN piksel, son işlemedeki (Polish: bloom/AO) bulanıklaştırmalarla
 * bütün kareye yayılır ve ekran tamamen siyah görünür (Meydan Medresesi ve Odunpazarı'nda yakalandı, swiftshader ile).
 *
 * Bu modül içe aktarıldığında parçayı bir kez değiştirir: türevler ya da sonuç vektörü sıfıra yakınsa yüzey normaline geri döner.
 * Görünüm, sağlıklı piksellerde öncekiyle aynıdır. three sürümü değişir ve özgün parça beklenen imzayı taşımazsa dokunulmaz
 * (`tests/safeBump.test.ts` bunu yakalar).
 */
import * as THREE from 'three';

const SIGNATURE = 'vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection )';

export const SAFE_BUMP_PARS = /* glsl */ `
#ifdef USE_BUMPMAP

	uniform sampler2D bumpMap;
	uniform float bumpScale;

	// Bump Mapping Unparametrized Surfaces on the GPU by Morten S. Mikkelsen
	// https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf

	vec2 dHdxy_fwd() {

		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );

		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;

		return vec2( dBx, dBy );

	}

	${SIGNATURE} {

		vec3 dpx = dFdx( surf_pos.xyz );
		vec3 dpy = dFdy( surf_pos.xyz );

		// Türev sıfırsa normalize(0) NaN verir; kabartmasız yüzey normaline dön
		if ( dot( dpx, dpx ) < 1e-20 || dot( dpy, dpy ) < 1e-20 ) return surf_norm;

		vec3 vSigmaX = normalize( dpx );
		vec3 vSigmaY = normalize( dpy );
		vec3 vN = surf_norm; // normalized

		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );

		float fDet = dot( vSigmaX, R1 ) * faceDirection;

		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		vec3 n = abs( fDet ) * surf_norm - vGrad;
		float l2 = dot( n, n );
		return l2 > 1e-12 ? n * inversesqrt( l2 ) : surf_norm;

	}

#endif
`;

/** Yamayı uygular; uygulandıysa ya da zaten uygulanmışsa true döner */
export function installSafeBump(): boolean {
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  const cur = chunks.bumpmap_pars_fragment;
  if (cur === SAFE_BUMP_PARS) return true;
  if (!cur || !cur.includes(SIGNATURE)) return false;   // beklenmeyen three sürümü: dokunma
  chunks.bumpmap_pars_fragment = SAFE_BUMP_PARS;
  return true;
}

export const SAFE_BUMP_INSTALLED = installSafeBump();

/**
 * Sıfır uzunluklu köşe normalleri (birleştirilmiş geometride dejenere üçgenler) de aynı siyah kareyi üretir: köşe gölgelendiricisindeki
 * `normalize(transformedNormal)` NaN verir (Konuralp'te yakalandı; Hattuşa, Amasra ve Yason'da da bulundu). Normal sıfırsa yukarıyı al.
 */
const NV_FROM = 'vNormal = normalize( transformedNormal );';
const NV_TO = 'vNormal = dot( transformedNormal, transformedNormal ) > 1e-20 ? normalize( transformedNormal ) : vec3( 0.0, 1.0, 0.0 );';
const NF_FROM = 'vec3 normal = normalize( vNormal );';
const NF_TO = 'vec3 normal = dot( vNormal, vNormal ) > 1e-20 ? normalize( vNormal ) : vec3( 0.0, 0.0, 1.0 );';
export function installSafeNormals(): boolean {
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  if (chunks.normal_vertex.includes(NV_TO) && chunks.normal_fragment_begin.includes(NF_TO)) return true;
  if (!chunks.normal_vertex.includes(NV_FROM) || !chunks.normal_fragment_begin.includes(NF_FROM)) return false;
  chunks.normal_vertex = chunks.normal_vertex.replace(NV_FROM, NV_TO);
  chunks.normal_fragment_begin = chunks.normal_fragment_begin.replace(NF_FROM, NF_TO);
  return true;
}
export const SAFE_NORMALS_INSTALLED = installSafeNormals();
