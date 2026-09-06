import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';
import { sleep } from '../../utils/helpers';

/** opentdb.com — free, no key. Reveals the answer after 15s. */
const trivia: Command = {
  name: 'trivia',
  aliases: ['quiz'],
  category: 'game',
  description: 'Answer a random trivia question (answer revealed in 15s).',
  usage: 'trivia',
  async run({ sock, msg }) {
    try {
      const d = await fetchJson<any>(
        'https://opentdb.com/api.php?amount=1&type=multiple',
      );
      const q = d.results[0];
      const decode = (s: string) =>
        s
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&eacute;/g, 'é')
          .replace(/&rsquo;/g, "'");
      const options = [...q.incorrect_answers, q.correct_answer]
        .map(decode)
        .sort(() => Math.random() - 0.5);
      const letters = ['A', 'B', 'C', 'D'];
      const list = options
        .map((o, i) => `${letters[i]}. ${o}`)
        .join('\n');

      await reply(
        sock,
        msg,
        `🧠 *Trivia* (${decode(q.category)})\n\n${decode(q.question)}\n\n${list}\n\n_Answer in 15s..._`,
      );
      await sleep(15_000);
      await reply(
        sock,
        msg,
        `✅ Correct answer: *${decode(q.correct_answer)}*`,
      );
    } catch {
      await reply(sock, msg, '⚠️ Could not fetch trivia right now.');
    }
  },
};

export default trivia;
