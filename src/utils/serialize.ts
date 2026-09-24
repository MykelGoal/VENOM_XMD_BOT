import type {
  proto,
  WAMessageKey,
  WASocket,
} from '@whiskeysockets/baileys';
import {
  extractMessageContent,
  getContentType,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { jidToNumber } from './helpers';

/**
 * Remove WhatsApp wrapper messages (ephemeral/view-once/edited/etc.) so the
 * rest of the bot sees the actual text or media message inside.
 */
function unwrapMessage(
  message: proto.IMessage | null | undefined,
): proto.IMessage | undefined {
  if (!message) return undefined;
  return extractMessageContent(message) ?? message;
}

/** Extract the best-effort text body from any message type. */
function extractBody(message: proto.IMessage | null | undefined): string {
  const content = unwrapMessage(message);
  if (!content) return '';

  const type = getContentType(content);
  switch (type) {
    case 'conversation':
      return content.conversation ?? '';
    case 'extendedTextMessage':
      return content.extendedTextMessage?.text ?? '';
    case 'imageMessage':
      return content.imageMessage?.caption ?? '';
    case 'videoMessage':
      return content.videoMessage?.caption ?? '';
    case 'documentMessage':
      return content.documentMessage?.caption ?? '';
    case 'buttonsResponseMessage':
      return content.buttonsResponseMessage?.selectedButtonId ?? '';
    case 'listResponseMessage':
      return content.listResponseMessage?.singleSelectReply?.selectedRowId ?? '';
    case 'templateButtonReplyMessage':
      return content.templateButtonReplyMessage?.selectedId ?? '';
    default:
      return '';
  }
}

/**
 * Convert a raw Baileys message into a clean SerializedMessage.
 * Returns null for messages we can't/shouldn't process.
 */
export function serializeMessage(
  raw: proto.IWebMessageInfo,
  sock: WASocket,
): SerializedMessage | null {
  if (!raw.message) return null;

  const key = raw.key as WAMessageKey;
  const chat = key.remoteJid ?? '';
  const isGroup = chat.endsWith('@g.us');
  const fromMe = key.fromMe ?? false;

  // Keep @lid senders as @lid for group actions, but use participantPn below
  // for senderNumber when WhatsApp supplies the phone-number alias.
  const sender = isGroup
    ? jidNormalizedUser(
        key.participant ?? key.participantLid ?? key.participantPn ?? '',
      )
    : fromMe
      ? jidNormalizedUser(sock.user?.id ?? '')
      : jidNormalizedUser(chat);

  const content = unwrapMessage(raw.message) ?? raw.message;
  const type = getContentType(content) ?? 'unknown';
  const body = extractBody(content);

  const contextInfo =
    (content as any)?.[type]?.contextInfo ??
    content.extendedTextMessage?.contextInfo;

  const mentions: string[] = contextInfo?.mentionedJid ?? [];
  const isNewsletterForward = Boolean(
    contextInfo?.forwardedNewsletterMessageInfo,
  );

  let quoted: SerializedMessage | undefined;
  const quotedMsg = contextInfo?.quotedMessage;
  if (quotedMsg) {
    const quotedContent = unwrapMessage(quotedMsg) ?? quotedMsg;
    quoted = {
      raw: {
        key: {
          remoteJid: chat,
          fromMe: false,
          id: contextInfo?.stanzaId ?? '',
          participant: contextInfo?.participant ?? undefined,
        },
        message: quotedMsg,
      } as proto.IWebMessageInfo,
      chat,
      sender: jidNormalizedUser(contextInfo?.participant ?? ''),
      senderNumber: jidToNumber(contextInfo?.participant ?? ''),
      isGroup,
      fromMe: false,
      id: contextInfo?.stanzaId ?? '',
      body: extractBody(quotedContent),
      type: getContentType(quotedContent) ?? 'unknown',
      mentions: [],
    };
  }

  return {
    raw,
    chat,
    sender,
    senderNumber: jidToNumber(
      (isGroup ? key.participantPn : key.senderPn) ?? sender,
    ),
    isGroup,
    fromMe,
    id: raw.key.id ?? '',
    body,
    type,
    quoted,
    mentions,
    isNewsletterForward,
  };
}
