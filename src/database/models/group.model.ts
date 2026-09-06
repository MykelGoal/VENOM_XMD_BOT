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
}
