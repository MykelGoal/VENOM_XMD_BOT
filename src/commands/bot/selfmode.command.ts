import { makeBotToggle } from '../_shared/bottoggle';

export default makeBotToggle({
  name: 'selfmode',
  aliases: ['self', 'selfbot'],
  key: 'selfmode',
  label: 'Self mode (run commands from your own number)',
  description:
    'Let the bot respond to commands you send from your OWN linked number — no second phone needed.',
});
