import { makeBotToggle } from "../_shared/bottoggle";

export default makeBotToggle({
  name: "rejectcall",
  aliases: ["anticall"],
  key: "rejectcall",
  label: "Auto-reject calls",
  description: "Toggle auto-reject calls.",
});
