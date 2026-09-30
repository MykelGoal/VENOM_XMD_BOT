import crypto from 'crypto';
import { createCollection } from '../index';
import type {
  GroupBrainEvent,
  GroupBrainFact,
  GroupBrainMode,
  GroupBrainModel,
  GroupBrainObservation,
  GroupBrainMemberIntro,
  NewcomerPhotoPolicy,
} from '../models/groupbrain.model';

const brains = createCollection<GroupBrainModel>('groupbrains');
const MAX_FACTS = 120;
const MAX_RULES = 40;
const MAX_STYLE_RULES = 30;
const MAX_OBSERVATIONS = 60;
const MAX_EVENTS = 30;
const OBSERVATION_TTL_MS = 48 * 60 * 60 * 1000;

function digits(value: string): string {
  return value.split('@')[0].split(':')[0].replace(/\D/g, '');
}

function defaults(jid: string): GroupBrainModel {
  const now = Date.now();
  return {
    jid,
    enabled: false,
    mode: 'selective',
    purpose: '',
    facts: [],
    rules: [],
    ownerStyle: [],
    observations: [],
    roomAdmins: [],
    newcomerPhotoPolicy: 'off',
    onboardingEnabled: false,
    onboardingCampaignActive: false,
    communityManagerEnabled: false,
    engagementEnabled: false,
    ownerDigestEnabled: false,
    weeklyActivityEnabled: false,
    engagementIndex: 0,
    members: {},
    events: [],
    createdAt: now,
    updatedAt: now,
  };
}

function cleanText(value: string, max = 500): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function save(model: GroupBrainModel): GroupBrainModel {
  model.updatedAt = Date.now();
  brains.set(model.jid, model);
  return model;
}

function uniqueLines(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) break;
  }
  return result;
}

export const groupBrainRepo = {
  get(jid: string): GroupBrainModel | undefined {
    const current = brains.get(jid);
    if (!current) return undefined;
    return {
      ...defaults(jid),
      ...current,
      facts: Array.isArray(current.facts) ? current.facts : [],
      rules: Array.isArray(current.rules) ? current.rules : [],
      ownerStyle: Array.isArray(current.ownerStyle) ? current.ownerStyle : [],
      observations: Array.isArray(current.observations) ? current.observations : [],
      roomAdmins: Array.isArray(current.roomAdmins) ? current.roomAdmins : [],
      members: current.members && typeof current.members === 'object' ? current.members : {},
      events: Array.isArray(current.events) ? current.events : [],
    };
  },

  ensure(jid: string): GroupBrainModel {
    return this.get(jid) ?? save(defaults(jid));
  },

  all(): GroupBrainModel[] {
    return brains.all().map((brain) => this.get(brain.jid) ?? brain);
  },

  setEnabled(jid: string, enabled: boolean): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.enabled = enabled;
    return save(brain);
  },

  setMode(jid: string, mode: GroupBrainMode): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.mode = mode;
    return save(brain);
  },

  setPurpose(jid: string, purpose: string): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.purpose = cleanText(purpose, 800);
    return save(brain);
  },

  addFact(jid: string, text: string, updatedBy: string): GroupBrainFact | null {
    const cleaned = cleanText(text, 700);
    if (!cleaned) return null;
    const brain = this.ensure(jid);
    const existing = brain.facts.find(
      (fact) => fact.text.toLowerCase() === cleaned.toLowerCase(),
    );
    if (existing) return existing;
    const fact: GroupBrainFact = {
      id: crypto.randomUUID().slice(0, 8),
      text: cleaned,
      updatedBy: digits(updatedBy),
      updatedAt: Date.now(),
    };
    brain.facts = [...brain.facts, fact].slice(-MAX_FACTS);
    save(brain);
    return fact;
  },

  removeFacts(jid: string, query: string): number {
    const brain = this.ensure(jid);
    const needle = cleanText(query).toLowerCase();
    if (!needle) return 0;
    const before = brain.facts.length;
    brain.facts = brain.facts.filter(
      (fact) =>
        fact.id.toLowerCase() !== needle &&
        !fact.text.toLowerCase().includes(needle),
    );
    if (brain.facts.length !== before) save(brain);
    return before - brain.facts.length;
  },

  addRule(jid: string, rule: string): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.rules = uniqueLines([...brain.rules, rule], MAX_RULES);
    return save(brain);
  },

  removeRule(jid: string, query: string): number {
    const brain = this.ensure(jid);
    const needle = cleanText(query).toLowerCase();
    const before = brain.rules.length;
    brain.rules = brain.rules.filter((rule) => !rule.toLowerCase().includes(needle));
    if (brain.rules.length !== before) save(brain);
    return before - brain.rules.length;
  },

  addStyle(jid: string, instruction: string): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.ownerStyle = uniqueLines(
      [...brain.ownerStyle, instruction],
      MAX_STYLE_RULES,
    );
    return save(brain);
  },

  setPhotoPolicy(jid: string, policy: NewcomerPhotoPolicy): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.newcomerPhotoPolicy = policy;
    return save(brain);
  },

  setRoomAdmins(jid: string, values: string[]): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.roomAdmins = [...new Set(values.map(digits).filter(Boolean))].slice(0, 10);
    return save(brain);
  },

  setOnboardingEnabled(jid: string, enabled: boolean): GroupBrainModel {
    const brain = this.ensure(jid);
    if (enabled) brain.enabled = true;
    brain.onboardingEnabled = enabled;
    if (!enabled) brain.onboardingCampaignActive = false;
    return save(brain);
  },

  startOnboardingCampaign(
    jid: string,
    members: string[],
    at = Date.now(),
  ): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.enabled = true;
    brain.onboardingEnabled = true;
    brain.onboardingCampaignActive = true;
    brain.onboardingCampaignStartedAt = at;
    for (const member of members) {
      const number = digits(member);
      if (!number) continue;
      const current = brain.members[number];
      brain.members[number] = {
        ...current,
        joinedAt: current?.joinedAt ?? at,
        leftAt: undefined,
        onboardingStartedAt: current?.intro ? current.onboardingStartedAt : at,
      };
    }
    return save(brain);
  },

  stopOnboardingCampaign(jid: string): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.onboardingCampaignActive = false;
    return save(brain);
  },

  reconcileMemberAlias(
    jid: string,
    canonicalNumber: string,
    aliasJid: string,
  ): GroupBrainModel | undefined {
    const brain = this.get(jid);
    if (!brain) return undefined;
    const canonical = digits(canonicalNumber);
    const alias = digits(aliasJid);
    if (!canonical || !alias || canonical === alias || !brain.members[alias]) return brain;
    const aliasRecord = brain.members[alias];
    const current = brain.members[canonical];
    brain.members[canonical] = current
      ? {
          ...aliasRecord,
          ...current,
          intro: current.intro ?? aliasRecord.intro,
          joinedAt: Math.min(current.joinedAt, aliasRecord.joinedAt),
        }
      : aliasRecord;
    delete brain.members[alias];
    return save(brain);
  },

  markJoined(jid: string, member: string, at = Date.now()): GroupBrainModel {
    const brain = this.ensure(jid);
    const number = digits(member);
    if (!number) return brain;
    const current = brain.members[number];
    brain.members[number] = {
      ...current,
      joinedAt: at,
      leftAt: undefined,
      onboardingStartedAt: brain.onboardingEnabled && !current?.intro ? at : current?.onboardingStartedAt,
    };
    return save(brain);
  },

  markLeft(jid: string, member: string, at = Date.now()): GroupBrainModel {
    const brain = this.ensure(jid);
    const number = digits(member);
    if (!number) return brain;
    const current = brain.members[number] ?? { joinedAt: at };
    brain.members[number] = { ...current, leftAt: at };
    return save(brain);
  },

  needsIntroduction(jid: string, member: string): boolean {
    const brain = this.get(jid);
    if (!brain?.onboardingEnabled) return false;
    const record = brain.members[digits(member)];
    return Boolean(record && !record.leftAt && !record.intro);
  },

  saveIntroduction(
    jid: string,
    member: string,
    intro: Omit<GroupBrainMemberIntro, 'submittedAt' | 'verification'> & {
      verification?: GroupBrainMemberIntro['verification'];
    },
  ): GroupBrainModel {
    const brain = this.ensure(jid);
    const number = digits(member);
    if (!number) return brain;
    const current = brain.members[number] ?? {
      joinedAt: Date.now(),
      onboardingStartedAt: Date.now(),
    };
    brain.members[number] = {
      ...current,
      leftAt: undefined,
      intro: {
        preferredName: cleanText(intro.preferredName, 40),
        freeFireName: cleanText(intro.freeFireName, 40),
        freeFireUid: digits(intro.freeFireUid).slice(0, 15),
        region: cleanText(intro.region, 8).toUpperCase(),
        role: intro.role,
        submittedAt: Date.now(),
        verification: intro.verification ?? 'pending',
      },
    };
    if (
      brain.onboardingCampaignActive &&
      Object.values(brain.members)
        .filter((member) => !member.leftAt)
        .every((member) => Boolean(member.intro))
    ) {
      brain.onboardingCampaignActive = false;
      brain.onboardingCampaignCompletedAt = Date.now();
    }
    return save(brain);
  },

  updateIntroductionVerification(
    jid: string,
    member: string,
    verification: GroupBrainMemberIntro['verification'],
    canonicalName?: string,
  ): GroupBrainModel {
    const brain = this.ensure(jid);
    const record = brain.members[digits(member)];
    if (!record?.intro) return brain;
    record.intro.verification = verification;
    record.intro.verifiedAt = verification === 'verified' ? Date.now() : undefined;
    if (canonicalName?.trim()) record.intro.freeFireName = cleanText(canonicalName, 40);
    return save(brain);
  },

  onboardingCounts(jid: string): {
    tracked: number;
    completed: number;
    pending: number;
    verified: number;
  } {
    const members = Object.values(this.get(jid)?.members ?? {}).filter((member) => !member.leftAt);
    const completed = members.filter((member) => Boolean(member.intro)).length;
    const verified = members.filter((member) => member.intro?.verification === 'verified').length;
    return {
      tracked: members.length,
      completed,
      pending: members.length - completed,
      verified,
    };
  },

  setCommunityManager(jid: string, enabled: boolean): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.enabled = enabled || brain.enabled;
    brain.communityManagerEnabled = enabled;
    brain.engagementEnabled = enabled;
    brain.ownerDigestEnabled = enabled;
    brain.weeklyActivityEnabled = enabled;
    return save(brain);
  },

  configureCommunityFeature(
    jid: string,
    feature: 'engagement' | 'digest' | 'weekly',
    enabled: boolean,
  ): GroupBrainModel {
    const brain = this.ensure(jid);
    if (feature === 'engagement') brain.engagementEnabled = enabled;
    if (feature === 'digest') brain.ownerDigestEnabled = enabled;
    if (feature === 'weekly') brain.weeklyActivityEnabled = enabled;
    return save(brain);
  },

  markCommunityRun(
    jid: string,
    kind: 'digest' | 'weekly' | 'engagement',
    date: string,
  ): GroupBrainModel {
    const brain = this.ensure(jid);
    if (kind === 'digest') brain.lastOwnerDigestDate = date;
    if (kind === 'weekly') brain.lastWeeklyActivityDate = date;
    if (kind === 'engagement') {
      brain.lastEngagementDate = date;
      brain.engagementIndex = (brain.engagementIndex + 1) % 1000;
    }
    return save(brain);
  },

  /** Delete only empty/incomplete departure workflow shells after 30 days. */
  cleanupDepartedMembers(jid: string, at = Date.now()): number {
    const brain = this.ensure(jid);
    const cutoff = at - 30 * 86_400_000;
    let removed = 0;
    for (const [number, member] of Object.entries(brain.members)) {
      const usefulProfile = Boolean(member.intro || member.photoSubmittedAt);
      if (member.leftAt && member.leftAt < cutoff && !usefulProfile) {
        delete brain.members[number];
        removed++;
      }
    }
    if (removed) save(brain);
    return removed;
  },

  needsPhoto(jid: string, member: string): boolean {
    const brain = this.get(jid);
    if (!brain || brain.newcomerPhotoPolicy === 'off') return false;
    const record = brain.members[digits(member)];
    return Boolean(record && !record.photoSubmittedAt);
  },

  markPhotoSubmitted(
    jid: string,
    member: string,
    review: 'accepted' | 'review' = 'accepted',
  ): GroupBrainModel {
    const brain = this.ensure(jid);
    const number = digits(member);
    const current = brain.members[number] ?? { joinedAt: Date.now() };
    brain.members[number] = {
      ...current,
      photoSubmittedAt: Date.now(),
      photoReview: review,
    };
    return save(brain);
  },

  clearObservations(jid: string): GroupBrainModel {
    const brain = this.ensure(jid);
    brain.observations = [];
    return save(brain);
  },

  recordObservation(
    jid: string,
    sender: string,
    text: string,
    at = Date.now(),
  ): void {
    const brain = this.get(jid);
    if (!brain?.enabled) return;
    const cleaned = cleanText(text, 360);
    if (!cleaned) return;
    const cutoff = at - OBSERVATION_TTL_MS;
    const observation: GroupBrainObservation = {
      sender: `member-${digits(sender).slice(-4) || 'unknown'}`,
      text: cleaned,
      at,
    };
    brain.observations = [...brain.observations.filter((item) => item.at >= cutoff), observation]
      .slice(-MAX_OBSERVATIONS);
    save(brain);
  },

  addEvent(
    jid: string,
    event: Omit<GroupBrainEvent, 'id' | 'createdAt' | 'status'>,
  ): GroupBrainEvent {
    const brain = this.ensure(jid);
    const created: GroupBrainEvent = {
      ...event,
      id: crypto.randomUUID().slice(0, 8),
      createdAt: Date.now(),
      status: 'scheduled',
    };
    brain.events = [...brain.events.filter((item) => item.status === 'scheduled'), created]
      .slice(-MAX_EVENTS);
    save(brain);
    return created;
  },

  updateEvent(
    jid: string,
    eventId: string,
    patch: Partial<GroupBrainEvent>,
  ): GroupBrainEvent | undefined {
    const brain = this.ensure(jid);
    const event = brain.events.find((item) => item.id === eventId);
    if (!event) return undefined;
    Object.assign(event, patch);
    save(brain);
    return event;
  },
};
