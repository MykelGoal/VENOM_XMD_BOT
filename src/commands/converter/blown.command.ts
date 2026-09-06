import { makeAudioFx } from "../_shared/audiofx";

export default makeAudioFx({
  name: "blown",
  aliases: ["fat"],
  filter: "acrusher=.1:1:64:0:log",
});
