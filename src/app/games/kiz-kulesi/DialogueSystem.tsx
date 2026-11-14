/**
 * Diyalog arayüzü: altta, daktilo efektiyle yazılan konuşma kutusu.
 *  - react-spring: kutu aşağıdan yaylanarak girer/çıkar, isim etiketi her yeni satırda hafifçe zıplar.
 *  - Geç: kutuya dokun / Boşluk / E / sağdaki etkileşim düğmesi → önce satırı tamamlar, sonra sonraki satır.
 *  - Satır bittikten sonra okuma süresi kadar bekleyip kendiliğinden ilerler (oyuncu hiçbir şeye basmak zorunda değil).
 *  - Sesli okuma (açılıp kapatılabilir): satır başlarken tr-TR konuşma sentezi okur.
 * Neden alt kutu: Şanlıurfa'daki rehber diyaloglarıyla aynı yerleşim; oyuncu ekranın üst ve ortasında sahneyi görmeye devam eder.
 */
import { useEffect, useState } from 'react';
import { animated, useSpring, useTransition } from '@react-spring/web';
import { ChevronsRight } from 'lucide-react';
import { CHARACTER, isTyping, lineDuration, shownText } from './dialogue';
import { now, useKiz } from './store';
import { kizSound } from './sound';

export function DialogueBox() {
  const playback = useKiz((s) => s.playback);
  const tts = useKiz((s) => s.tts);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const key = playback ? `${playback.dialogue.id}:${playback.line}` : '';

  // daktilo: yalnızca görünen harf sayısı değişince yeniden çiz
  useEffect(() => {
    if (!playback) { setText(''); return; }
    let raf = 0, last = -1;
    const loop = () => {
      const p = useKiz.getState().playback; if (!p) return;
      const s = shownText(p, now()); if (s.length !== last) { last = s.length; setText(s); setTyping(isTyping(p, now())); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playback]);

  // sesli okuma + kendiliğinden ilerleme
  useEffect(() => {
    if (!playback) return;
    const line = playback.dialogue.lines[playback.line];
    if (tts) kizSound.speak(line.text);
    const wait = (lineDuration(line.text) + 2.2 + line.text.length * 0.03) * 1000;
    const id = setTimeout(() => { const p = useKiz.getState().playback; if (p && `${p.dialogue.id}:${p.line}` === key) { if (!p.revealed) useKiz.getState().next(); useKiz.getState().next(); } }, wait);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // klavye: Boşluk / Enter / E
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') && useKiz.getState().playback) { e.preventDefault(); skip(); } };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, []);

  const transitions = useTransition(playback ? [key.split(':')[0]] : [], {
    keys: (k) => k, from: { y: 60, opacity: 0 }, enter: { y: 0, opacity: 1 }, leave: { y: 40, opacity: 0 }, config: { tension: 260, friction: 22 },
  });
  // isim etiketi yalnızca yeni satırda zıplar (deps = satır anahtarı)
  const [bounce] = useSpring(() => ({ from: { scale: 0.85 }, to: { scale: 1 }, reset: true, config: { tension: 400, friction: 12 } }), [key]);

  return transitions((style) => (
    <animated.div style={{ transform: style.y.to((y) => `translateY(${y}px)`), opacity: style.opacity }}
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 mx-auto max-w-2xl sm:bottom-5">
      <button onClick={skip} className="block w-full rounded-2xl bg-black/75 p-4 pr-12 text-left text-white shadow-2xl backdrop-blur" aria-live="polite">
        <animated.span style={{ transform: bounce.scale.to((s) => `scale(${s})`) }} className="mb-1 inline-block origin-left rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold">
          {CHARACTER.name}
        </animated.span>
        <p className="min-h-[3rem] text-[15px] leading-relaxed sm:text-base">{text}<span className={`ml-0.5 inline-block w-2 ${typing ? 'animate-pulse' : 'opacity-0'}`}>▍</span></p>
        <ChevronsRight size={20} className="absolute bottom-4 right-4 text-white/70" aria-label={typing ? 'Satırı tamamla' : 'Devam'} />
      </button>
    </animated.div>
  ));
}

/** Geç: satırı tamamla ya da sonrakine geç (etkileşim düğmesi de bunu çağırır) */
export function skip() {
  const r = useKiz.getState().next();
  if (r === 'next-line' || r === 'end') kizSound.hush();
}
