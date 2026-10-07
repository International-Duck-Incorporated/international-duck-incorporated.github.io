/* Node vm harness for block-field.js (texture-pack edition).
 * Run: node tools/test-blockfield.js   (expects repo root as cwd or absolute paths below) */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "block-field.js"), "utf8");
const body = src.replace(/^\s*\/\*[\s\S]*?\*\/\s*\(\(\) => \{/, "").replace(/\}\)\(\);\s*$/, "");

function ctx2d() {
  const calls = { drawImage: [] };
  return {
    fillStyle: "", strokeStyle: "", imageSmoothingEnabled: true,
    fillRect() {}, clearRect() {}, strokeRect() {},
    drawImage(...a) { calls.drawImage.push(a); },
    _calls: calls,
  };
}
function canvasEl() {
  const el = { width: 0, height: 0, _ctx: null };
  el.getContext = () => (el._ctx || (el._ctx = ctx2d()));
  return el;
}
const sandbox = {
  console,
  Math, performance: { now: () => 0 },
  document: {
    createElement: (t) => (t === "canvas" ? canvasEl() : {}),
    addEventListener() {}, removeEventListener() {},
    hidden: false,
  },
  window: { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 600 },
  Image: function () { /* never loads in harness */ },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame() {},
  module: { exports: {} },
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(body + `
;module.exports = { PAINT_ROSTER, TILE_ROSTER, buildAtlas, makeField, simulate, mount,
  setRoster: (r) => { roster = r; }, lookAt,
  MIN_DIST, ATLAS_URL, ATLAS_TILE };`, sandbox, { filename: "block-field.js" });
const M = sandbox.module.exports;

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fail++; };

/* tile coords inside the 16x32 pack sheet */
ok(M.TILE_ROSTER.length >= 30, "tile roster has " + M.TILE_ROSTER.length + " block types");
let inBounds = true, ints = true;
for (const def of M.TILE_ROSTER) for (const f of def.faces) {
  if (!Number.isInteger(f[0]) || !Number.isInteger(f[1])) ints = false;
  if (f[0] < 0 || f[0] > 15 || f[1] < 0 || f[1] > 31) inBounds = false;
}
ok(ints && inBounds, "all tile coords integer and within 16x32 sheet");
const FRONTEX = new Set(["furnace", "crafting_table", "chest"]); // Minecraft-authentic exceptions
ok(M.TILE_ROSTER.filter((d) => !FRONTEX.has(d.id))
  .every((d) => d.faces.every((f) => f[0] === d.faces[0][0] && f[1] === d.faces[0][1])),
  "every block type except the furnace shows the same tile on all four face slots");
const byId = (id) => M.TILE_ROSTER.find((d) => d.id === id);
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const fur = byId("furnace");
ok(fur && same(fur.faces[0], [13, 2]) && same(fur.faces[1], [13, 3])
  && same(fur.faces[2], [13, 2]) && same(fur.faces[3], [13, 2]),
  "furnace keeps a lit front face on plain grey sides/top/bottom");
const cra = byId("crafting_table");
ok(cra && same(cra.faces[0], [11, 3]) && same(cra.faces[1], [11, 3])
  && same(cra.faces[2], [11, 2]) && same(cra.faces[3], [7, 5]),
  "crafting table keeps tool sides, grid top and plank bottom");
const che = byId("chest");
ok(che && same(che.faces[0], [8, 5]) && same(che.faces[1], [9, 5])
  && same(che.faces[2], [15, 5]) && same(che.faces[3], [8, 5]),
  "chest keeps lid-seam sides, latched front and plain top");
ok(M.PAINT_ROSTER.every((d) => d.faces.every((f) => typeof f === "function")), "paint roster faces are painters (fallback intact)");
ok(typeof M.ATLAS_URL === "string" && M.ATLAS_URL.startsWith("/assets/"), "atlas url is a local asset: " + M.ATLAS_URL);
ok(fs.existsSync(path.join(ROOT, M.ATLAS_URL.split("?")[0])), "atlas file exists in repo (query string stripped)");

/* procedural atlas (fallback path) */
const cA = M.buildAtlas(M.PAINT_ROSTER, null);
ok(cA.width === 64 && cA.height === 16 * M.PAINT_ROSTER.length, "procedural atlas 64x" + cA.height);

/* tile atlas: drawImage source rects must land inside 256x512 */
const fakeImg = { naturalWidth: 256, naturalHeight: 512 };
const cB = M.buildAtlas(M.TILE_ROSTER, fakeImg);
ok(cB.width === 64 && cB.height === 16 * M.TILE_ROSTER.length, "tile atlas 64x" + cB.height);
const calls = cB.getContext("2d")._calls.drawImage;
ok(calls.length === 4 * M.TILE_ROSTER.length, "drawImage called 4x per type (" + calls.length + ")");
ok(calls.every((a) => a.length === 9 && a[1] >= 0 && a[1] + a[3] <= 256 && a[2] >= 0 && a[2] + a[4] <= 512),
  "every source rect inside the pack sheet");
ok(calls.every((a) => a[3] === 16 && a[4] === 16 && a[7] === 16 && a[8] === 16), "16px tiles copied 1:1");

/* field sim invariants with the tile roster active */
M.setRoster(M.TILE_ROSTER);
const field = M.makeField(16 / 9);
ok(field.length === M.TILE_ROSTER.length, "field spawns one block per type");
M.simulate(field, 20, 0.016);
let min2 = Infinity;
for (let i = 0; i < field.length; i++) for (let j = i + 1; j < field.length; j++) {
  const a = field[i].pos, b = field[j].pos;
  const d2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2;
  if (d2 < min2) min2 = d2;
}
/* one relaxation pass per frame; target margin may leave <0.1% residual but
 * cubes (diagonal 1.3*sqrt(3)) must stay clear of each other */
ok(Math.sqrt(min2) >= 1.3 * Math.sqrt(3) + 0.04,
  "no intersection after one relaxation pass: " + Math.sqrt(min2).toFixed(4) + " (cube diagonal 2.2517, target " + M.MIN_DIST.toFixed(4) + ")");
ok(field.every((e) => e.def && e.def.faces.length === 4), "every field block carries 4 face defs");
ok(field.every((e) => e.rot[0] === 0 && e.rot[2] === 0), "blocks spin upright (yaw only), so face tiles stay on their own axes");

/* camera must not be rolled: view up-axis points up, right-axis right */
const V = new Float32Array(16);
M.lookAt(V, [0, 0.9, 15.5], [0, 0.45, 0]);
ok(V[5] > 0.9, "view up-axis points up (no 180-degree camera roll): " + V[5].toFixed(3));
ok(V[0] > 0, "view right-axis points +x for a -z view direction: " + V[0].toFixed(3));

/* no WebGL -> false, caller falls back to a still */
const stub = { getContext: () => null, addEventListener() {}, clientWidth: 800, clientHeight: 600 };
ok(M.mount(stub, {}, () => {}) === false, "mount returns false without WebGL");

console.log(fail ? fail + " FAILURES" : "ALL PASS");
process.exit(fail ? 1 : 0);
