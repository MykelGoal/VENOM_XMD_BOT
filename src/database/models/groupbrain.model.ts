export type GroupBrainMode = 'mentions' | 'selective' | 'active';
export type NewcomerPhotoPolicy = 'off' | 'record' | 'review';

export interface GroupBrainFact {
  id: string;
  text: string;
  updatedBy: string;
  updatedAt: number;
}

export interface GroupBrainObservation {
  sender: string;
  text: string;
  at: number;
}

export interface GroupBrainMember {
  joinedAt: number;
  photoSubmittedAt?: number;
  photoReview?: 'accepted' | 'review';
}

export interface GroupBrainEvent {
  id: string;
  kind: 'room-match' | 'event';
  title: string;
  startsAt: number;
  createdBy: string;
  createdAt: number;
  status: 'scheduled' | 'cancelled' | 'completed';
  adminReminderSentAt?: number;
  groupReminderSentAt?: number;
  startNoticeSentAt?: number;
}

export interface GroupBrainModel extends Record<string, unknown> {
  jid: string;
  enabled: boolean;
  mode: GroupBrainMode;
  purpose: string;
  facts: GroupBrainFact[];
  rules: string[];
  ownerStyle: string[];
  observations: GroupBrainObservation[];
  roomAdmins: string[];
  newcomerPhotoPolicy: NewcomerPhotoPolicy;
  members: Record<string, GroupBrainMember>;
  events: GroupBrainEvent[];
  createdAt: number;
  updatedAt: number;
}
