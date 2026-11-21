/**
 * Yürüme modunda E / "İncele" düğmesi: yakındaki kapıdan geçer ya da incelenebilir noktanın kartını açar.
 * Hiçbir kart kendiliğinden açılmaz; oyuncu yaklaşınca yalnızca istem (prompt) görünür.
 */
import { useMonumentStore } from '../store';
import { DOORS, EXHIBITS } from './interior';

export function interact() {
  const s = useMonumentStore.getState(), p = s.prompt;
  if (s.exhibit) { s.set({ exhibit: null }); return; }
  if (!p) return;
  const door = DOORS.find((d) => 'door:' + d.id === p.id);
  if (door) { s.teleportTo(door.to.x, door.to.z, door.to.yaw, door.to.level); s.set({ prompt: null }); return; }
  const ex = EXHIBITS.find((e) => 'ex:' + e.id === p.id);
  if (ex) s.set({ exhibit: { kicker: ex.kicker, title: ex.title, text: ex.text, source: ex.source } });
}
