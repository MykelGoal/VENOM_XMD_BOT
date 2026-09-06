import type { Command } from '../../types/command.type';
import { reply } from '../../services/message.service';

const command: Command = {
  name: 'bmi',
  aliases: ["bodymass"],
  category: 'tools',
  description: "Calculate BMI from weight(kg) and height(cm).",
  usage: 'bmi <kg> <cm>',
  async run({ sock, msg, text, args }) {
    const w = parseFloat(args[0]); const h = parseFloat(args[1]) / 100;
    if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) { await reply(sock, msg, 'ℹ️ Usage: *bmi <weightKg> <heightCm>*'); return; }
    const bmi = w / (h * h);
    const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    await reply(sock, msg, `⚖️ BMI = *${bmi.toFixed(1)}* (${cat})`);
  },
};

export default command;
