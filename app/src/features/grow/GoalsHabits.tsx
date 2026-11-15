import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { addGoal, addHabit, addStep, archiveNode, logHabit, setStatus, type Tree, type TreeNode } from '../../api/nodes';
import { colors, space } from '../../theme/tokens';

type T = (key: string, vars?: Record<string, string | number>) => string;
const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 } as const;
const LINE = '#EDE6DA';

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 8, borderRadius: 999, backgroundColor: '#EDE6DA', overflow: 'hidden' }}>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.leaf, width: `${Math.max(2, Math.round(value * 100))}%` }} />
    </View>
  );
}

function AddRow({ placeholder, onAdd, addLabel, children }: { placeholder: string; onAdd: (text: string) => Promise<void>; addLabel: string; children?: React.ReactNode }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      await onAdd(v);
      setText('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => void go()} placeholder={placeholder} placeholderTextColor={colors.muted} accessibilityLabel={placeholder} maxLength={200}
          style={{ flex: 1, minHeight: 46, fontSize: 16, color: colors.ink, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line }} />
        <Pressable onPress={() => void go()} accessibilityRole="button" accessibilityLabel={addLabel} style={{ minHeight: 46, minWidth: 64, borderRadius: 12, backgroundColor: text.trim() ? colors.accent : '#D9CFC0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>{addLabel}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

/** The person's own goals: each with steps to tick off. Ticking a step closes it (a green leaf grows); when it is all done the goal can be closed too. */
export function MyGoals({ tree, t, reload }: { tree: Tree; t: T; reload: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const goals = tree.nodes.filter((n) => n.type === 'goal' && n.path.length === 2 && tree.nodes.find((a) => a.nid === n.parent_id)?.key === 'goals');
  const stepsOf = (g: TreeNode) => tree.nodes.filter((n) => n.type === 'task' && n.parent_id === g.nid);
  const act = (fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
    } finally {
      reload();
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('tree.goals')}</Text>
      <View style={[box, { paddingHorizontal: space.lg }]}>
        {goals.map((g) => {
          const steps = stepsOf(g);
          const done = steps.filter((s) => s.status === 'closed').length;
          const closed = g.status === 'closed';
          const expanded = open === g.nid;
          return (
            <View key={g.nid} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE, gap: 8 }}>
              <Pressable onPress={() => setOpen(expanded ? null : g.nid)} accessibilityRole="button" accessibilityState={{ expanded }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={closed ? 'checkmark-circle' : 'flag-outline'} size={22} color={closed ? colors.leaf : colors.navy} />
                <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.ink, textDecorationLine: closed ? 'line-through' : 'none' }}>{g.title}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
              </Pressable>
              <Bar value={closed ? 1 : g.progress} label={g.title} />
              <Text style={{ fontSize: 14, color: '#4A5361' }}>{closed ? t('tree.goal_done') : t('tree.steps_of', { done, total: steps.length })}</Text>
              {expanded ? (
                <View style={{ gap: 4 }}>
                  {steps.map((s) => (
                    <Pressable key={s.nid} onPress={act(() => setStatus(s.nid, s.status === 'closed' ? 'open' : 'closed'))} accessibilityRole="checkbox" accessibilityState={{ checked: s.status === 'closed' }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                      <Ionicons name={s.status === 'closed' ? 'checkbox' : 'square-outline'} size={24} color={s.status === 'closed' ? colors.leaf : '#9CA3AF'} />
                      <Text style={{ flex: 1, fontSize: 16, color: colors.ink, textDecorationLine: s.status === 'closed' ? 'line-through' : 'none' }}>{s.title}</Text>
                    </Pressable>
                  ))}
                  {!closed ? <AddRow placeholder={t('tree.step_ph')} addLabel={t('tree.add')} onAdd={async (v) => { await addStep(g.nid, v); reload(); }} /> : null}
                  <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                    <Pressable onPress={act(() => setStatus(g.nid, closed ? 'open' : 'closed'))} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>{closed ? t('tree.reopen') : t('tree.mark_goal')}</Text>
                    </Pressable>
                    <Pressable onPress={act(() => archiveNode(g.nid))} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16, color: '#4A5361', textDecorationLine: 'underline' }}>{t('tree.remove')}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        <AddRow placeholder={t('tree.goal_ph')} addLabel={t('tree.add')} onAdd={async (v) => { await addGoal(v); reload(); }} />
      </View>
    </View>
  );
}

/** Repeating things. Each time one is done today its stem grows thicker on the tree; the bar shows how steady it has been over four weeks. A gap never scolds. */
export function MyHabits({ tree, t, reload }: { tree: Tree; t: T; reload: () => void }) {
  const [kind, setKind] = useState<'daily' | 'weekly'>('daily');
  const log = (nid: string, undo: boolean) => async () => {
    try {
      await logHabit(nid, undo);
    } finally {
      reload();
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('tree.habits')}</Text>
      <View style={[box, { paddingHorizontal: space.lg }]}>
        {tree.habits.map((h) => (
          <View key={h.nid} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{h.title}</Text>
                <Text style={{ fontSize: 14, color: '#4A5361' }}>{t(h.kind === 'weekly' ? 'tree.weekly' : 'tree.daily')}{h.streak === 1 ? ` · ${t(h.kind === 'weekly' ? 'tree.streak_week' : 'tree.streak_day')}` : h.streak > 1 ? ` · ${t(h.kind === 'weekly' ? 'tree.streak_weeks' : 'tree.streak_days', { n: h.streak })}` : ''}</Text>
              </View>
              <Pressable onPress={log(h.nid, h.done_today)} accessibilityRole="button" accessibilityState={{ selected: h.done_today }} style={{ minHeight: 44, minWidth: 96, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: h.done_today ? colors.navySoft : colors.accent, flexDirection: 'row', gap: 6 }}>
                {h.done_today ? <Ionicons name="checkmark" size={18} color={colors.navy} /> : null}
                <Text style={{ fontSize: 15, fontWeight: '600', color: h.done_today ? '#15202E' : '#FFFFFF' }}>{t(h.kind === 'weekly' ? 'tree.done_week' : 'tree.done_today')}</Text>
              </Pressable>
            </View>
            <Bar value={h.strength} label={h.title} />
          </View>
        ))}
        <AddRow placeholder={t('tree.habit_ph')} addLabel={t('tree.add')} onAdd={async (v) => { await addHabit(v, kind); reload(); }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['daily', 'weekly'] as const).map((k) => (
              <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="radio" accessibilityState={{ checked: kind === k }} style={{ minHeight: 40, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: kind === k ? colors.navy : '#FFFFFF', borderWidth: 1, borderColor: colors.navy }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: kind === k ? '#FFFFFF' : colors.navy }}>{t(`tree.${k}`)}</Text>
              </Pressable>
            ))}
          </View>
        </AddRow>
      </View>
      <Text style={{ fontSize: 15, color: '#5A6472', paddingHorizontal: 4 }}>{t('tree.stronger')}</Text>
    </View>
  );
}
