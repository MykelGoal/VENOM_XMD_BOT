import type { Command } from '../../types/command.type';
import { economyRepo, CURRENCY } from '../../database/repositories/economy.repo';

const toprank: Command = {
  name: 'toprank',
  aliases: ['top', 'rich', 'leaderboard', 'baltop'],
  category: 'economy',
  description: 'Show the richest players.',
  usage: 'toprank',
  async run({ sock, msg }) {
    const top = economyRepo.top(10);
    if (top.length === 0) {
      await sock.sendMessage(msg.chat, { text: 'No economy data yet.' }, { quoted: msg.raw });
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = ['🏆 *RICHEST PLAYERS*', ''];
    const mentions: string[] = [];
    top.forEach((u, i) => {
      const net = u.wallet + u.bank - u.loan;
      const jid = `${u.number}@s.whatsapp.net`;
      mentions.push(jid);
      lines.push(
        `${medals[i] ?? `${i + 1}.`} @${u.number} — ${CURRENCY} ${net.toLocaleString()}`,
      );
    });
    await sock.sendMessage(
      msg.chat,
      { text: lines.join('\n'), mentions },
      { quoted: msg.raw },
    );
  },
};

export default toprank;
