import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';
import { fetchJson } from '../../services/media.service';

const FALLBACK = [
  'Why did the scarecrow win an award? He was outstanding in his field.',
  "I told my computer I needed a break, and it said: 'No problem, I'll go to sleep.'",
  'Why don\'t scientists trust atoms? Because they make up everything.',
  'What do you call fake spaghetti? An impasta.',
  'I would tell you a chemistry joke, but I know I wouldn\'t get a reaction.',
  'Why did the bicycle fall over? It was two-tired.',
  'Parallel lines have so much in common. It\'s a shame they\'ll never meet.',
  'What do you call a bear with no teeth? A gummy bear.',
];

const joke: Command = {
  name: 'joke',
  category: 'fun',
  description: 'Get a random joke.',
  usage: 'joke',
  async run({ sock, msg }) {
    let text = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    try {
      const data = await fetchJson<{
        type: string;
        joke?: string;
        setup?: string;
        delivery?: string;
      }>('https://v2.jokeapi.dev/joke/Any?safe-mode');

      if (data?.type === 'single' && data.joke) text = data.joke;
      else if (data?.type === 'twopart' && data.setup)
        text = `${data.setup}\n\n...${data.delivery}`;
    } catch {
      /* keep the built-in fallback */
    }
    await reply(sock, msg, `😂 ${text}`);
  },
};

export default joke;
