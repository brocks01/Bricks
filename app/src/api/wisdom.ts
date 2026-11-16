import { api } from './client';

// ---- who the person is to Wisdom, and what to show them (the backend decides; the app never hard-codes who sees what) ----
export type Surface = 'home' | 'agent' | 'profile' | 'community' | 'markets' | 'health' | 'calendar' | 'wisdom_share' | 'wisdom_learn' | 'wisdom_help' | 'freelance' | 'family_circle';
export interface Profile { name: string | null; roles: string[]; roles_chosen: boolean; surfaces: Surface[]; focus: 'serve' | 'learn' | 'both' | 'connect'; wisdom: { parts: ('stories' | 'mentors' | 'learners' | 'mine' | 'paid')[]; default: 'stories' | 'mentors' | 'learners' | 'mine' }; onboarded: boolean; next: { id: string; title: string; required: boolean } | null }
export const getProfile = () => api<Profile>('GET', '/v1/profile');

// ---- onboarding: the steps live in the backend; the app (and a call, and a chat) only answer them ----
export type QuestionKind = 'text' | 'choice' | 'multi' | 'int' | 'time' | 'phone' | 'bool';
export interface Question { key: string; label: string; kind: QuestionKind; options: string[]; required: boolean; answer: unknown }
export interface Section { id: string; title: string; required: boolean; done: boolean; skipped: boolean; questions: Question[] }
export interface OnboardingState { completed: boolean; roles: string[]; sections: Section[]; next: Section | null }
export const getOnboarding = () => api<OnboardingState>('GET', '/v1/onboarding');
export const putOnboarding = (section: string, answers: Record<string, unknown>) => api<OnboardingState>('PUT', `/v1/onboarding/${section}`, { answers });
export const skipOnboarding = (section: string) => api<OnboardingState>('POST', `/v1/onboarding/${section}/skip`);

// ---- Wisdom: stories, offers, requests, introductions ----
export type CapsuleKind = 'cultural' | 'social' | 'professional'; // the three domains of experience
export type OfferKind = 'mentoring' | 'workshop' | 'freelance';
export type OfferMode = 'volunteer' | 'paid' | 'either';
export const CAPSULE_KINDS: CapsuleKind[] = ['cultural', 'social', 'professional'];
export const OFFER_KINDS: OfferKind[] = ['mentoring', 'workshop', 'freelance'];
export const OFFER_MODES: OfferMode[] = ['volunteer', 'paid', 'either'];

export interface Capsule { id: string; title: string; body: string; kind: CapsuleKind; tags: string[]; status: 'draft' | 'published'; by: string; mine: boolean; created_at: string }
export interface Offer { id: string; title: string; about: string | null; kind: OfferKind; mode: OfferMode; domain: CapsuleKind | null; price_note: string | null; availability: string | null; status: string; by: string; mine: boolean; proof_field: string | null; proof_years: number | null; proof_where: string | null; topics: string[]; languages: string[]; sensitive: boolean; endorsements: number; sessions: number; area: string | null }
export interface Request { id: string; topic: string; about: string | null; kind: 'learn' | 'support'; status: string; by: string; mine: boolean }
export interface Connection { id: string; with: string; i_am: 'mentor' | 'learner'; about: string | null; message: string | null; status: 'pending' | 'accepted' | 'declined'; waiting_for_me: boolean; offer_id: string | null; sessions: number; endorsed: boolean; unread: number }
export interface WisdomMessage { id: string; from: string; mine: boolean; body: string; at: string; read: boolean }
export interface WisdomStats { calls: number; minutes: number; people_helped: number; mentors_learned_from: number }

export const getLibrary = (q = '', kind?: string) => api<{ capsules: Capsule[] }>('GET', `/v1/wisdom/capsules?q=${encodeURIComponent(q)}${kind ? `&kind=${kind}` : ''}`).then((r) => r.capsules);
export const getMyCapsules = () => api<{ capsules: Capsule[] }>('GET', '/v1/wisdom/capsules/mine').then((r) => r.capsules);
export const keepCapsule = (b: { title: string; body: string; kind: CapsuleKind; tags?: string[] }) => api<{ id: string }>('POST', '/v1/wisdom/capsules', b);
export const shareCapsule = (id: string, on: boolean) => api<{ status: string }>('POST', `/v1/wisdom/capsules/${id}/${on ? 'share' : 'unshare'}`);

export const getOffers = (q = '', kind?: string, f?: { mode?: string; domain?: string; topic?: string; language?: string; area?: string }) =>
  api<{ offers: Offer[] }>('GET', `/v1/wisdom/offers?q=${encodeURIComponent(q)}${kind ? `&kind=${kind}` : ''}${f?.mode ? `&mode=${f.mode}` : ''}${f?.domain ? `&domain=${f.domain}` : ''}${f?.topic ? `&topic=${encodeURIComponent(f.topic)}` : ''}${f?.language ? `&language=${encodeURIComponent(f.language)}` : ''}${f?.area ? `&area=${encodeURIComponent(f.area)}` : ''}`).then((r) => r.offers);
export const getMyOffers = () => api<{ offers: Offer[] }>('GET', '/v1/wisdom/offers/mine').then((r) => r.offers);
export const createOffer = (b: { title: string; about?: string; kind: OfferKind; mode: OfferMode; availability?: string; domain?: CapsuleKind; price_note?: string; proof_field?: string; proof_years?: number; proof_where?: string; topics?: string[]; languages?: string[] }) => api<{ id: string }>('POST', '/v1/wisdom/offers', b);
export const endorseOffer = (id: string, note?: string) => api<{ endorsed: boolean; endorsements: number }>('POST', `/v1/wisdom/offers/${id}/endorse`, { note });
export const setOfferStatus = (id: string, status: 'active' | 'paused' | 'closed') => api<{ status: string }>('PATCH', `/v1/wisdom/offers/${id}`, { status });
export const askOffer = (id: string, message?: string) => api<{ id: string }>('POST', `/v1/wisdom/offers/${id}/ask`, { message });

export const getRequests = (q = '', kind?: 'learn' | 'support') => api<{ requests: Request[] }>('GET', `/v1/wisdom/requests?q=${encodeURIComponent(q)}${kind ? `&kind=${kind}` : ''}`).then((r) => r.requests);
export const getMyRequests = () => api<{ requests: Request[] }>('GET', '/v1/wisdom/requests/mine').then((r) => r.requests);
export const createRequest = (b: { topic: string; about?: string; kind?: 'learn' | 'support' }) => api<{ id: string }>('POST', '/v1/wisdom/requests', b);
export const closeRequest = (id: string) => api<{ closed: boolean }>('POST', `/v1/wisdom/requests/${id}/close`);
export const answerRequest = (id: string, message?: string) => api<{ id: string }>('POST', `/v1/wisdom/requests/${id}/answer`, { message });

export const getConnections = () => api<{ connections: Connection[] }>('GET', '/v1/wisdom/connections').then((r) => r.connections);
export const decideConnection = (id: string, accept: boolean) => api<{ status: string }>('POST', `/v1/wisdom/connections/${id}/decide`, { accept });
export const logSession = (id: string, minutes: number) => api<{ logged: number }>('POST', `/v1/wisdom/connections/${id}/sessions`, { minutes });
export const getConnectionMessages = (cid: string) => api<{ messages: WisdomMessage[] }>('GET', `/v1/wisdom/connections/${cid}/messages`).then((r) => r.messages);
export const sendConnectionMessage = (cid: string, body: string) => api<{ sent: boolean; to: string }>('POST', `/v1/wisdom/connections/${cid}/messages`, { body });
export const getWisdomStats = () => api<WisdomStats>('GET', '/v1/wisdom/stats');

// ---- paid sessions: a person's own services by the hour, and the sessions other people offer (the server's market endpoints, unchanged) ----
export type MarketCategory = 'crafts' | 'cooking' | 'teaching' | 'repair' | 'music' | 'wellness' | 'advice' | 'storytelling' | 'other';
export type MarketTier = 'basic' | 'skilled' | 'expert';
export const CATEGORIES: MarketCategory[] = ['crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other'];
export const TIERS: MarketTier[] = ['basic', 'skilled', 'expert'];

export interface Listing { id: string; owner_id: string; owner_name: string; title: string; category: MarketCategory; description: string | null; tier: MarketTier; experience_years: number; proof_text: string | null; proof_links: string[]; verified: boolean; rate_per_hour: number | null; currency: string; area_name: string | null; status: string; endorsements: number; mine: boolean; created_at: string }
export interface ListingDetail extends Listing { endorsed_by: { name: string; note: string | null; at: string }[]; can_endorse: boolean }
export const getListings = (q = '', category?: string, mine = false) => api<{ listings: Listing[] }>('GET', `/v1/market/listings?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}${mine ? '&mine=true' : ''}`).then((r) => r.listings);
export const getListing = (id: string) => api<ListingDetail>('GET', `/v1/market/listings/${id}`);
export interface ListingBody { title: string; category: MarketCategory; tier: MarketTier; description?: string; experience_years?: number; proof_text?: string; rate_per_hour?: number | null; area_name?: string }
export const createListing = (b: ListingBody) => api<{ id: string }>('POST', '/v1/market/listings', b);
export const updateListing = (id: string, b: Partial<ListingBody> & { status?: 'active' | 'paused' }) => api<{ id: string }>('PATCH', `/v1/market/listings/${id}`, b);
export const archiveListing = (id: string) => api<{ archived: boolean }>('DELETE', `/v1/market/listings/${id}`);
export interface Guide { tier: MarketTier; low: number; high: number; currency: string; per: string; note: string }
export const getGuide = (tier: MarketTier) => api<Guide>('GET', `/v1/market/guide?tier=${tier}`, undefined, { auth: false });

export interface Booking { id: string; listing_id: string; title: string; starts_at: string; hours: number; agreed_rate: number | null; currency: string; status: 'requested' | 'accepted' | 'declined' | 'cancelled' | 'done'; note: string | null; role: 'provider' | 'requester'; other_name: string; community_name: string | null; created_at: string }
export const getBookings = () => api<{ bookings: Booking[] }>('GET', '/v1/market/bookings').then((r) => r.bookings);
export const bookListing = (id: string, b: { starts_at: string; hours: number; note?: string; community_id?: string }) => api<{ id: string; status: string }>('POST', `/v1/market/listings/${id}/bookings`, b);
export const decideBooking = (id: string, accept: boolean) => api<{ status: string }>('POST', `/v1/market/bookings/${id}/decide`, { accept });
export const cancelBooking = (id: string) => api<{ status: string }>('POST', `/v1/market/bookings/${id}/cancel`);
export const completeBooking = (id: string) => api<{ status: string }>('POST', `/v1/market/bookings/${id}/complete`);
export const endorseListing = (id: string, note?: string) => api<{ endorsed: boolean }>('POST', `/v1/market/listings/${id}/endorse`, { note });

// ---- the inbox: what Wisdom told the person on any channel ----
export interface Notice { id: number; kind: string; body: string; read: boolean; via: string; at: string }
export const getInbox = () => api<{ unread: number; notifications: Notice[] }>('GET', '/v1/notifications');
export const readAllNotices = () => api<{ marked: number }>('POST', '/v1/notifications/read');

// ---- connecting chats: the same agent on Telegram, WhatsApp and text messages ----
export interface ChannelState { available: boolean; connected: boolean; number?: string }
export interface ChannelsStatus { telegram: ChannelState & { bot: string | null }; whatsapp: ChannelState; sms: ChannelState; phone: ChannelState }
export interface LinkCode { code: string; expires_in_s: number; bot?: string | null; link?: string | null }
export const getChannels = () => api<ChannelsStatus>('GET', '/v1/channels');
export const makeLinkCode = (kind: 'telegram' | 'whatsapp' | 'sms') => api<LinkCode>('POST', `/v1/channels/${kind}/link-code`);
export const disconnectTelegram = () => api<{ disconnected: boolean }>('DELETE', '/v1/channels/telegram');

// ---- suggestions from what the person enjoys ----
export interface Suggestion { interest: string; nearby_people: number; start_one: boolean; groups: { id: string; name: string; members: number; joined: boolean; can_join: boolean }[] }
export const getSuggestions = () => api<{ area: string | null; suggestions: Suggestion[] }>('GET', '/v1/suggestions/communities');
