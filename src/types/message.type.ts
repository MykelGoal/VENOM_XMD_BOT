import type { proto } from '@whiskeysockets/baileys';

/**
 * A clean, flattened view of a raw Baileys message so commands don't
 * have to dig through the nested protobuf structure.
 */
export interface SerializedMessage {
  /** The raw underlying message, if you need something not exposed here. */
  raw: proto.IWebMessageInfo;
  /** Chat JID the message belongs to (group or DM). */
  chat: string;
  /** Sender JID (in groups this is the participant, not the group). */
  sender: string;
  /** Bare sender number without the @s.whatsapp.net suffix. */
  senderNumber: string;
  /** True if the chat is a group. */
  isGroup: boolean;
  /** True if the bot itself sent this message. */
  fromMe: boolean;
  /** Message id. */
  id: string;
  /** Best-effort extracted text body. */
  body: string;
  /** Detected message type, e.g. conversation / imageMessage. */
  type: string;
  /** JID this message quotes/replies to, if any. */
  quoted?: SerializedMessage;
  /** Mentioned JIDs. */
  mentions: string[];
}
