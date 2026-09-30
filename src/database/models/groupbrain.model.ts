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

export type FreeFireRole = 'rusher' | 'sniper' | 'support' | 'igl' | 'all-rounder';

export interface GroupBrainMemberIntro {
  preferredName: string;
  freeFireName: string;
  freeFireUid: string;
  region: string;
  role: FreeFireRole;
  submittedAt: number;
  /** Profile lookup never blocks onboarding; verification is a separate lane. */
  verification: 'pending' | 'verified' | 'unavailable' | 'mismatch';
  verifiedAt?: number;
}

export interface GroupBrainMember {
  joinedAt: number;
  leftAt?: number;
  onboardingStartedAt?: number;
  intro?: GroupBrainMemberIntro;
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
  /** Automatic introductions for future joins. */
  onboardingEnabled: boolean;
  /** One-time introduction drive for members already in the group. */
  onboardingCampaignActive: boolean;
  onboardingCampaignStartedAt?: number;
  onboardingCampaignCompletedAt?: number;
  /** Low-spam autonomous community management. */
  communityManagerEnabled: boolean;
  engagementEnabled: boolean;
  ownerDigestEnabled: boolean;
  weeklyActivityEnabled: boolean;
  lastOwnerDigestDate?: string;
  lastWeeklyActivityDate?: string;
  lastEngagementDate?: string;
  engagementIndex: number;
  members: Record<string, GroupBrainMember>;
  events: GroupBrainEvent[];
  createdAt: number;
  updatedAt: number;
}
