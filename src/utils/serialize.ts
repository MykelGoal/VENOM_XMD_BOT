import type { proto, WASocket } from '@whiskeysockets/baileys';
import { getContentType, jidNormalizedUser } from '@whiskeysockets/baileys';
import type { SerializedMessage } from '../types/message.type';
import { jidToNumber } from './helpers';

/** Extract the best-effort text body from any message type. */
function extractBody(message: proto.IMessage | null | undefined): string {
  if (!message) return '';
  const type = getContentType(message);
  switch (type) {
    case 'conversation':
      return message.conversation ?? '';
    case 'extendedTextMessage':
      return message.extendedTextMessage?.text ?? '';
    case 'imageMessage':
      return message.imageMessage?.caption ?? '';
    case 'videoMessage':
      return message.videoMessage?.caption ?? '';
    case 'buttonsResponseMessage':
      return message.buttonsResponseMessage?.selectedButtonId ?? '';
    case 'listResponseMessage':
      return (
        message.listResponseMessage?.singleSelectReply?.selectedRowId ?? ''
      );
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

  const chat = raw.key.remoteJid ?? '';
  const isGroup = chat.endsWith('@g.us');
  const fromMe = raw.key.fromMe ?? false;

  const sender = isGroup
    ? jidNormalizedUser(raw.key.participant ?? '')
    : fromMe
      ? jidNormalizedUser(sock.user?.id ?? '')
      : jidNormalizedUser(chat);

  const type = getContentType(raw.message) ?? 'unknown';
  const body = extractBody(raw.message);

  const contextInfo =
    (raw.message as any)?.[type]?.contextInfo ??
    raw.message.extendedTextMessage?.contextInfo;

  const mentions: string[] = contextInfo?.mentionedJid ?? [];

  let quoted: SerializedMessage | undefined;
  const quotedMsg = contextInfo?.quotedMessage;
  if (quotedMsg) {
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
      body: extractBody(quotedMsg),
      type: getContentType(quotedMsg) ?? 'unknown',
      mentions: [],
    };
  }

  return {
    raw,
    chat,
    sender,
    senderNumber: jidToNumber(sender),
    isGroup,
    fromMe,
    id: raw.key.id ?? '',
    body,
    type,
    quoted,
    mentions,
  };
}
