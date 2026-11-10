import { createMockDb } from './db';

// Wednesday 11 Nov 2026, 9 am.
const NOW = new Date(2026, 10, 11, 9, 0);
const fresh = () => createMockDb(() => NOW);

describe('mock backend', () => {
  it('lists upcoming events soonest first', () => {
    const list = fresh().listEvents(null);
    expect(list).toHaveLength(8);
    const times = list.map((e) => new Date(e.start_at).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times.every((t) => t > NOW.getTime())).toBe(true);
  });

  it('puts "Morning walk" tomorrow at 7 am with 12 going, for Raj to join (golden path)', () => {
    const walk = fresh().getEvent('e_walk_bishan');
    const start = new Date(walk.start_at);
    expect(start.getDate()).toBe(12);
    expect(start.getHours()).toBe(7);
    expect(walk.going_count).toBe(12);
    expect(walk.host.name).toBe('Lim Ah Kow');
    expect(walk.my_rsvp).toBeNull();
  });

  it.each([
    ['walk', ['walk']],
    ['class', ['class', 'exercise']],
    ['kids', ['kids']],
  ] as const)('filter %s returns only %j', (filter, categories) => {
    const list = fresh().listEvents(filter);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((e) => (categories as readonly string[]).includes(e.category))).toBe(true);
  });

  it('filters today and this week by date', () => {
    const db = fresh();
    expect(db.listEvents('today').every((e) => new Date(e.start_at).getDate() === 11)).toBe(true);
    expect(db.listEvents('week').length).toBeGreaterThan(0);
  });

  it('RSVP and cancel change the count and my_rsvp', () => {
    const db = fresh();
    const before = db.getEvent('e_taichi');
    expect(before.my_rsvp).toBeNull();
    expect(db.rsvp('e_taichi')).toMatchObject({
      my_rsvp: 'going',
      going_count: before.going_count + 1,
    });
    expect(db.rsvp('e_taichi').going_count).toBe(before.going_count + 1); // idempotent
    expect(db.cancelRsvp('e_taichi')).toMatchObject({
      my_rsvp: null,
      going_count: before.going_count,
    });
  });

  it('a host cannot drop out of their own event', () => {
    const db = fresh();
    expect(db.cancelRsvp('e_chess').my_rsvp).toBe('going');
  });

  it('creates an event hosted by the member', () => {
    const db = fresh();
    const created = db.createEvent({
      title: 'Coffee and chat',
      category: 'meetup',
      start_at: new Date(2026, 10, 13, 10).toISOString(),
      end_at: null,
      place_name: 'Bishan Community Club',
      whatsapp_link: null,
    });
    expect(created).toMatchObject({ my_rsvp: 'going', going_count: 1 });
    expect(db.listEvents(null).map((e) => e.id)).toContain(created.id);
  });

  it('Today offers a walk to join, the check-in and the reminder', () => {
    const today = fresh().getToday();
    expect(today.checkin.pending).toBe(true);
    expect(today.next_event).toMatchObject({ category: 'walk', my_rsvp: null });
    expect(today.next_reminder).toMatchObject({ text: 'Take medicine', time: '08:00' });
  });

  it('check-in "no" suggests a walk; "yes" grows the streak; both clear the card', () => {
    const db = fresh();
    expect(db.answerCheckin('no')).toMatchObject({
      answer: 'no',
      suggestion: { category: 'walk' },
    });
    expect(db.getToday().checkin.pending).toBe(false);
    expect(fresh().answerCheckin('yes')).toMatchObject({ streak: 6, suggestion: null });
  });

  it('completing the reminder removes it from Today', () => {
    const db = fresh();
    db.completeReminder('r_medicine');
    expect(db.getToday().next_reminder).toBeNull();
  });

  it('joining and leaving a Circle moves it between lists', () => {
    const db = fresh();
    expect(db.listCircles().near.map((c) => c.id)).toEqual(['c_gardeners']);
    db.joinCircle('c_gardeners');
    expect(db.listCircles().mine.map((c) => c.id)).toContain('c_gardeners');
    db.leaveCircle('c_gardeners');
    expect(db.listCircles().near.map((c) => c.id)).toEqual(['c_gardeners']);
  });

  it('a Circle page lists its upcoming events and captain', () => {
    const circle = fresh().getCircle('c_walkers');
    expect(circle.captain.name).toBe('Lim Ah Kow');
    expect(circle.upcoming.map((e) => e.id)).toEqual(['e_walk_bishan', 'e_taichi']);
    expect(circle.member_count).toBe(48);
  });

  it('unknown ids fail like a 404', () => {
    expect(() => fresh().getEvent('nope')).toThrow('Not found');
  });
});
