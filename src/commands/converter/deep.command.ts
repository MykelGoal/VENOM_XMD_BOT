import { makeAudioFx } from "../_shared/audiofx";

export default makeAudioFx({
  name: "deep",
  aliases: ["robot"],
  filter: "asetrate=44100*0.8,aresample=44100",
});
