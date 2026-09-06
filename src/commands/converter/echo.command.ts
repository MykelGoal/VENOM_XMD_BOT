import { makeAudioFx } from "../_shared/audiofx";

export default makeAudioFx({
  name: "echo",
  filter: "aecho=0.8:0.9:1000:0.3",
});
