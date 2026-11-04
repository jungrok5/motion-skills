// 「Handle With Care」 · cast — the template's people as person() options, shared by film.html and cast.html (the
// cast sheet). Replace them per topic: the hero, then one nuisance or helped person per gag.
export const CAST = {
  rosa: { build: "round", skin: "#e0a77f", top: { kind: "tee", color: "#f6f3ec" }, bottom: { color: "#2a2a30", pattern: "plaid", b: "#f2efe8" }, shoes: { kind: "slipper", color: "#1d1d20" }, hair: { style: "bun", color: "#5a3a26" }, hat: { kind: "chef", color: "#f7f5f0" }, face: { nose: "bulb", cheeks: "#e9907a", shape: "pear" }, extras: ["apron", "contraption"], apron: "#f2efe8", brass: "#b87333", seed: 21 },
  thief: { build: "teen", skin: "#f0c8a6", top: { kind: "sweater", color: "#2b2b30", pattern: "stripe", b: "#e9e6df" }, bottom: { color: "#2f3a52" }, shoes: { kind: "sneaker", color: "#2b2b30", sole: "#f2f0ea" }, hat: { kind: "beanie", color: "#2b2b30" }, face: { nose: "long" }, extras: ["shades"], seed: 22 },
  courier: { build: "stocky", skin: "#a8714c", top: { kind: "shirt", color: "#7a5a3a" }, bottom: { kind: "shorts", color: "#5a4632" }, shoes: { kind: "boot", color: "#3a2a1c" }, socks: { color: "#f0ede6" }, hat: { kind: "cap", color: "#7a5a3a", brim: "#5a4632" }, beard: { kind: "goatee", color: "#2a1d14" }, seed: 23 }
};
/** the gadget: a red knitted oven glove on a cream quilted hose (its hose socket is wired to the hero in the film: from / fromDir) */
export const GLOVE = { style: "oven", color: "#c8322b", size: 1.1, hose: { color: "#e8e2d4", r: 0.085 }, thread: "#f2efe8" };
