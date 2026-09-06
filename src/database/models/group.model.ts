export interface GroupModel extends Record<string, unknown> {
  jid: string;
  welcome: boolean;
  antilink: boolean;
  createdAt: number;
}
