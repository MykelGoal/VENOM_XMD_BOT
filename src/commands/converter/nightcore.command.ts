import { makeAudioFx } from "../_shared/audiofx";

export default makeAudioFx({
  name: "nightcore",
  filter: "asetrate=44100*1.25,aresample=44100,atempo=1.06",
});
