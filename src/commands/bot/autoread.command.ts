import { makeBotToggle } from "../_shared/bottoggle";

export default makeBotToggle({
  name: "autoread",
  aliases: ["autoseen"],
  key: "autoread",
  label: "Auto-read messages",
  description: "Toggle auto-read messages.",
});
