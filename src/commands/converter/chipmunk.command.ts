import { makeAudioFx } from "../_shared/audiofx";

export default makeAudioFx({
  name: "chipmunk",
  filter: "asetrate=44100*1.4,aresample=44100",
});
