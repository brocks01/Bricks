import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calendarApi, type Occurrence } from '../../api/calendar';
import { useStore } from '../../core/store';
import { useLanguage, useT } from '../../i18n';
import { useNavigate } from '../../navigation';
import { sessionStore } from '../../session/store';
import { colors, radius, size, space, type } from '../../theme/tokens';
import { minutesUntil, popupsDue, type Popup } from './day';

/**
 * The reminders the person never has to set: as a calendar item comes closer, a card slides in at the top two hours before, one hour before,
 * fifteen minutes before and when it starts ("Tai chi starts in 1 h 0 min"). Each is shown once. It lives in the root layout, so it shows on any screen.
 * This is the in-app reminder; the phone call (and later push) is the calendar's own reminder loop on the server.
 */
export function ReminderPopups() {
  const t = useT();
  const lang = useLanguage();
  const go = useNavigate();
  const insets = useSafeAreaInsets();
  const { status, user } = useStore(sessionStore);
  const [occs, setOccs] = useState<Occurrence[]>([]);
  const [queue, setQueue] = useState<Popup[]>([]);
  const shown = useRef(new Set<string>());
  const live = status === 'in' && !!user?.profile_complete;

  const fetchDay = useCallback(() => {
    const from = new Date(Date.now() - 3 * 3_600_000);
    const to = new Date(Date.now() + 3 * 3_600_000);
    calendarApi.occurrences(undefined, from.toISOString(), to.toISOString()).then((r) => setOccs(r.occurrences)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!live) return;
    fetchDay();
    const refresh = setInterval(fetchDay, 5 * 60_000);
    return () => clearInterval(refresh);
  }, [live, fetchDay]);

  useEffect(() => {
    if (!live) return;
    const check = () => {
      const due = popupsDue(occs, new Date(), shown.current);
      if (!due.length) return;
      due.forEach((d) => shown.current.add(d.key)); // shown once, whether or not the person reads it
      setQueue((q) => [...q, ...due]);
    };
    check();
    const timer = setInterval(check, 20_000);
    return () => clearInterval(timer);
  }, [live, occs]);

  if (!live || queue.length === 0) return null;
  const p = queue[0];
  const when = (() => {
    const m = Math.max(0, minutesUntil(p.occ, new Date()));
    if (m === 0) return t('home.index.now');
    return m < 60 ? t('home.index.in_min', { n: m }) : t('home.index.in_hm', { h: Math.floor(m / 60), m: m % 60 });
  })();
  const time = new Date(p.occ.occurs_at).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + space.sm, left: space.md, right: space.md, zIndex: 50 }}>
      <View accessibilityLiveRegion="assertive" style={{ backgroundColor: colors.warnSoft, borderWidth: 2, borderColor: colors.warn, borderRadius: radius.card, padding: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="alarm-outline" size={size.icon.lg} color={colors.warn} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.warn }}>{t('home.index.popup_title')}{queue.length > 1 ? `  (+${queue.length - 1})` : ''}</Text>
        </View>
        <Text style={[type.h2, { color: colors.ink, marginTop: space.xs }]}>{t('home.index.popup_starts', { title: p.occ.title, when })}</Text>
        <Text style={[type.small, { color: colors.muted }]}>{time}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Pressable onPress={dismiss} accessibilityRole="button" style={{ flex: 1, minHeight: size.touch, borderRadius: radius.button, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.card }}>{t('home.index.popup_ok')}</Text>
          </Pressable>
          <Pressable onPress={() => { dismiss(); go('calendar.today'); }} accessibilityRole="button" style={{ flex: 1, minHeight: size.touch, borderRadius: radius.button, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.accent }}>{t('home.index.popup_open')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
