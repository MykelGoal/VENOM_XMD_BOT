export interface GroupModel extends Record<string, unknown> {
  jid: string;
  welcome: boolean;
  goodbye: boolean;
  antilink: boolean;
  antispam: boolean;
  antitag: boolean;
  antibot: boolean;
  antiword: boolean;
  bannedWords: string[];
  mutedUsers: string[];
  createdAt: number;
  /** Custom welcome message template (supports @user @group @count @desc). */
  welcomeText?: string;
  /** Custom goodbye message template (supports @user @group @count). */
  goodbyeText?: string;
  /** Revert unauthorized promotions (only admins the bot didn't promote). */
  antipromote?: boolean;
  /** Revert unauthorized demotions. */
  antidemote?: boolean;
}
