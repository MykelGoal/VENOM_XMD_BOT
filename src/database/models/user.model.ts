export interface UserModel extends Record<string, unknown> {
  number: string;
  name?: string;
  banned: boolean;
  commandCount: number;
  firstSeen: number;
}
