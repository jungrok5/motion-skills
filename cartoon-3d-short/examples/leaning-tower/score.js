// The Tower That a War Saved — the music + SFX bed (lib/score.js spec), timed to the same words as the shots.
// Render: node ../../scripts/score.mjs score.js --dur 61.94 --voice voice/voice.mp3 --words voice/words.json → out/mix.wav
import WORDS from "./voice/words.json" with { type: "json" };

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const at = (word, n = 1, edge = "s") => {
  let k = 0;
  for (const w of WORDS) if (norm(w.w) === norm(word) && ++k === n) return w[edge];
  throw new Error(`no word ${word} #${n}`);
};

export const SCORE = {
  bpm: 116, key: "F", music: 1.4, sfxGain: 1.1,
  sections: [
    { at: 0, mood: "bouncy" },                       // hook + 1173: cheeky and light
    { at: at("The", 5), mood: "tense", gain: 0.9 },  // "the whole thing is tipping over"
    { at: at("Then"), mood: "march" },               // war: the soldiers march off
    { at: at("For"), mood: "wonder", gain: 0.85 },   // a hundred years pass (golden)
    { at: at("The", 8), mood: "bouncy" },            // the neighbors laugh, the builders cheat
    { at: at("But"), mood: "sneaky", gain: 0.9 },    // "but wait…"
    { at: at("You"), mood: "explain" },              // the sponge
    { at: at("If"), mood: "tense" },                 // what if they kept building
    { at: at("In"), mood: "march", gain: 0.9 },      // 1990 engineers
    { at: at("because"), mood: "payoff" },           // the punchline, ends on a button
  ],
  stops: [at("toppled") + 0.15],                     // dead air right on the crash
  sfx: [
    { at: at("It's") - 0.02, kind: "whoosh" },       // the white flash into 1173
    { at: at("something"), kind: "gasp-sting" },
    { at: at("tipping"), kind: "creak", dur: 1.2 },
    { at: at("over"), kind: "thud", gain: 1.1 },
    { at: at("clay"), kind: "splash", gain: 0.7 },
    { at: at("Then") + 0.3, kind: "footsteps", dur: 3.5, gain: 0.8 },
    { at: at("drops"), kind: "clack", gain: 1.0 },
    { at: at("drops") + 0.12, kind: "clack", gain: 0.8, pitch: 1.2 },
    { at: at("For") + 0.2, kind: "bell", gain: 0.7 },
    { at: at("hilarious") - 0.1, kind: "laugh" },
    { at: at("every"), kind: "pop" }, { at: at("floor", 2), kind: "pop", pitch: 1.12 }, { at: at("taller"), kind: "pop", pitch: 1.25 },
    { at: at("banana"), kind: "boing" },
    { at: at("wait"), kind: "squeak" },
    { at: at("fast") + 0.05, kind: "splash" },
    { at: at("squishes"), kind: "squeak", pitch: 0.8 },
    { at: at("firm"), kind: "glint" },
    { at: at("toppled") + 0.15, kind: "riser", dur: 0.6 },
    { at: at("toppled") + 0.15, kind: "crash", gain: 1.2 },
    { at: at("toppled") + 0.2, kind: "rumble", dur: 1.2 },
    { at: at("pulled"), kind: "zip" },
    { at: at("straightened"), kind: "creak", dur: 1.0, pitch: 0.8 },
    { at: at("stopped"), kind: "ding" },
    { at: at("because") + 0.1, kind: "cheer", gain: 0.6 },
  ],
};
