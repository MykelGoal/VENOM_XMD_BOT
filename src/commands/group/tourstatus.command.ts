import type { Command } from '../../types/command.type';
import { tournamentRepo } from '../../database/repositories/tournament.repo';
import {
  tournamentErrorMessage,
  tournamentStatusText,
} from '../../services/tournament.service';
import { reply } from '../../services/message.service';

const tourstatus: Command = {
  name: 'tourstatus',
  aliases: ['tstatus'],
  category: 'group',
  description: 'Show tournament registration, check-in and round status.',
  usage: 'tourstatus <code>',
  async run({ sock, msg, args, prefix }) {
    try {
      if (!args[0]) {
        await reply(sock, msg, `ℹ️ Usage: *${prefix}tourstatus VENOM40*`);
        return;
      }
      const tournament = tournamentRepo.get(args[0]);
      if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND');
      await reply(sock, msg, tournamentStatusText(tournament));
    } catch (err) {
      await reply(sock, msg, `❌ ${tournamentErrorMessage(err)}`);
    }
  },
};

export default tourstatus;
