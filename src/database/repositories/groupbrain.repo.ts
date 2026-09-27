import crypto from 'crypto';
import { createCollection } from '../index';
import type {
  GroupBrainEvent,
  GroupBrainFact,
  GroupBrainMode,
  GroupBrainModel,
  GroupBrainObservation,
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

  markJoined(jid: string, member: string, at = Date.now()): GroupBrainModel {
    const brain = this.ensure(jid);
    const number = digits(member);
    if (!number) return brain;
    brain.members[number] = { joinedAt: at };
    return save(brain);
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
