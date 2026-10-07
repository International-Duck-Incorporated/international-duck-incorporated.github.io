/* The 3D Minecraft block field, as a homepage backdrop.
 *
 * Ported from the team's React + three.js demo (Scene.tsx, field.ts and
 * mc/blocks.ts) into this site's dependency-free style: one hand-rolled
 * WebGL context, procedural 16x16 pixel textures painted at boot, no
 * downloads, no CDN, no framework. The look is kept: a seeded field of
 * tumbling blocks wandering between fixed depth slots with pairwise
 * separation so they never intersect, dust motes drifting up, a star
 * shell, fog into the dark green void, emissive glowstone, real alpha
 * glass. Shadows, bloom and image-based lighting from the demo are
 * approximated with per-face shading and a three-light lambert, which
 * is what a background can afford.
 *
 * Guards match the rest of the site: the head script never picks this
 * backdrop for low-end or reduced-motion visitors (easteregg.js renders
 * a single still frame if reduced motion ever reaches it), the device
 * pixel ratio is capped, and the loop pauses while the tab is hidden.
 * If WebGL is unavailable the mount returns false and the caller falls
 * back to one of the local stills.
 */
(() => {
  "use strict";

  /* ------------------------------------------------------------ rng */
  function mulberry(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedOf(id) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------------------------------------------- 16x16 pixel painters */
  function tile() {
    const c = document.createElement("canvas");
    c.width = 16; c.height = 16;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  function rect(x, px, py, w, h, fill) { x.fillStyle = fill; x.fillRect(px, py, w, h); }
  function valueNoise(r, scale) {
    const n = Math.ceil(16 / scale) + 2;
    const g = [];
    for (let i = 0; i < n; i++) { const row = []; for (let j = 0; j < n; j++) row.push(r()); g.push(row); }
    return (x, y) => {
      const gx = x / scale, gy = y / scale;
      const x0 = Math.min(Math.floor(gx), n - 2), y0 = Math.min(Math.floor(gy), n - 2);
      const fx = gx - x0, fy = gy - y0;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = g[y0][x0], b = g[y0][x0 + 1], c = g[y0 + 1][x0], d = g[y0 + 1][x0 + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  function shade(x, r, pal, scale) {
    const f = valueNoise(r, scale || 4);
    for (let y = 0; y < 16; y++) for (let px = 0; px < 16; px++) {
      x.fillStyle = pal[Math.min(pal.length - 1, Math.floor(f(px, y) * pal.length))];
      x.fillRect(px, y, 1, 1);
    }
  }
  const noise = (pal, scale) => (x, r) => shade(x, r, pal, scale);
  function blobs(x, r, colors, count, size) {
    for (let i = 0; i < count; i++) {
      const px = Math.floor(r() * 16), py = Math.floor(r() * 16);
      x.fillStyle = colors[Math.floor(r() * colors.length)];
      x.fillRect(px, py, size, size);
      if (r() < 0.6) x.fillRect((px + 1) % 16, py, size - 1 > 0 ? size - 1 : 1, size);
    }
  }
  const STONE_PAL = ["#7d7d7d", "#8b8b8b", "#6f6f6f", "#969696"];
  const ore = (a, b, count) => (x, r) => {
    shade(x, r, STONE_PAL, 4);
    blobs(x, r, [a, b], count || 5, 2);
  };
  const DIRT_PAL = ["#8a5f3d", "#79553a", "#96684a", "#6d4c33"];
  const paintDirt = noise(DIRT_PAL, 3);
  const paintGrassTop = noise(["#7fb241", "#6da339", "#8cc04b", "#5f9433"], 3);
  const paintGrassSide = (x, r) => {
    paintDirt(x, r);
    for (let px = 0; px < 16; px++) {
      const depth = 2 + Math.floor(r() * 2);
      for (let y = 0; y < depth; y++) {
        x.fillStyle = ["#7fb241", "#6da339", "#8cc04b"][Math.floor(r() * 3)];
        x.fillRect(px, y, 1, 1);
      }
    }
  };
  const paintPlanks = (x, r) => {
    shade(x, r, ["#9c7f4e", "#8f7446", "#a8895a", "#84693e"], 5);
    for (const y of [3, 7, 11, 15]) rect(x, 0, y, 16, 1, "#6d5637");
    for (let i = 0; i < 4; i++) rect(x, Math.floor(r() * 14), i * 4 + 1, 2, 1, "#77603c");
  };
  const paintLogSide = (x, r) => {
    shade(x, r, ["#6b5636", "#5d4a2d", "#7a6340", "#54422a"], 6);
    for (const px of [2, 6, 10, 13]) rect(x, px, 0, 1, 16, r() < 0.5 ? "#4a3a24" : "#836b45");
  };
  const paintLogTop = (x, r) => {
    shade(x, r, ["#9c7f4e", "#8f7446", "#a8895a"], 5);
    for (let d = 0; d < 4; d++) {
      x.strokeStyle = d % 2 ? "#6d5637" : "#84693e";
      x.strokeRect(d + 0.5, d + 0.5, 16 - 2 * d - 1, 16 - 2 * d - 1);
    }
  };
  const paintBookshelf = (x, r) => {
    paintPlanks(x, r);
    const cols = ["#7a3b2e", "#3b5a7a", "#4a7a3b", "#7a6a2e", "#5a3b7a", "#8a8a8a"];
    for (const band of [4, 11]) {
      rect(x, 0, band, 16, 4, "#3d2f1d");
      let px = 0;
      while (px < 15) {
        const w = 1 + Math.floor(r() * 2);
        rect(x, px, band, w, 4, cols[Math.floor(r() * cols.length)]);
        px += w + (r() < 0.2 ? 1 : 0);
      }
    }
  };
  const paintCraftingTop = (x, r) => {
    paintPlanks(x, r);
    rect(x, 0, 0, 16, 2, "#6d5637"); rect(x, 0, 0, 2, 16, "#6d5637");
    rect(x, 7, 2, 2, 14, "#57432a"); rect(x, 2, 7, 14, 2, "#57432a");
  };
  const paintCraftingSide = (x, r) => {
    paintPlanks(x, r);
    rect(x, 0, 0, 16, 3, "#6d5637");
    rect(x, 2, 3, 5, 5, "#57432a"); rect(x, 9, 3, 5, 5, "#57432a");
  };
  const paintFurnaceSide = noise(["#6e6e6e", "#7a7a7a", "#616161", "#848484"], 3);
  const paintFurnaceFront = (x, r) => {
    paintFurnaceSide(x, r);
    rect(x, 4, 9, 8, 5, "#2b2b2b");
    rect(x, 5, 12, 6, 2, "#d06a1f");
    rect(x, 6, 11, 2, 1, "#f2a13c");
  };
  const paintGlass = (x, r) => {
    x.clearRect(0, 0, 16, 16);
    x.fillStyle = "rgba(210,235,245,0.16)"; x.fillRect(0, 0, 16, 16);
    x.fillStyle = "rgba(222,242,250,0.9)";
    x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
    for (let i = 0; i < 5; i++) {
      const p = 3 + Math.floor(r() * 9);
      x.fillStyle = "rgba(255,255,255,0.35)"; x.fillRect(p, 12 - p + 3, 1, 1);
    }
  };
  const paintBricks = (x, r) => {
    shade(x, r, ["#9c5a4a", "#8d4f40", "#a86555"], 5);
    for (let row = 0; row < 4; row++) {
      const y = row * 4 + 3;
      rect(x, 0, y, 16, 1, "#b8b0a6");
      const off = row % 2 ? 4 : 0;
      for (let px = off; px < 16; px += 8) rect(x, px, row * 4, 1, 3, "#b8b0a6");
    }
  };
  const paintStoneBricks = (x, r) => {
    shade(x, r, ["#7a7a7a", "#868686", "#6e6e6e"], 5);
    for (let row = 0; row < 4; row++) {
      rect(x, 0, row * 4 + 3, 16, 1, "#565656");
      const off = row % 2 ? 8 : 0;
      for (let px = off; px < 16; px += 8) rect(x, px, row * 4, 1, 3, "#565656");
    }
  };
  const paintTntSide = (x, r) => {
    shade(x, r, ["#c0392b", "#a93226", "#d0433a"], 5);
    rect(x, 0, 5, 16, 6, "#e8e2d8");
    const letters = [1, 4, 7, 10, 13];
    for (const px of letters) rect(x, px, 6, 2, 4, "#2b2b2b");
  };
  const paintTntTop = (x, r) => {
    shade(x, r, ["#c0392b", "#a93226"], 5);
    rect(x, 6, 6, 4, 4, "#e8e2d8"); rect(x, 7, 7, 2, 2, "#2b2b2b");
  };
  const paintPumpkinSide = (x, r) => {
    shade(x, r, ["#d07818", "#c06d12", "#db8420"], 6);
    for (const px of [1, 5, 9, 13]) rect(x, px, 0, 1, 16, "#a85e0e");
  };
  const paintPumpkinFront = (x, r) => {
    paintPumpkinSide(x, r);
    rect(x, 3, 5, 3, 3, "#1d130a"); rect(x, 10, 5, 3, 3, "#1d130a");
    rect(x, 2, 10, 12, 2, "#1d130a");
    for (let px = 3; px < 14; px += 3) rect(x, px, 9, 1, 1, "#1d130a");
  };
  const paintPumpkinTop = (x, r) => {
    paintPumpkinSide(x, r);
    rect(x, 7, 6, 2, 4, "#4a7a3b");
  };
  const paintMelonSide = (x, r) => {
    shade(x, r, ["#7fb241", "#6da339", "#8cc04b"], 6);
    for (const px of [0, 4, 8, 12]) rect(x, px, 0, 2, 16, "#4f7d2c");
    blobs(x, r, ["#3f6623"], 6, 1);
  };
  const paintMelonTop = (x, r) => {
    shade(x, r, ["#7fb241", "#6da339"], 5);
    x.strokeStyle = "#4f7d2c";
    for (let d = 0; d < 3; d++) x.strokeRect(d * 2 + 0.5, d * 2 + 0.5, 16 - 4 * d - 1, 16 - 4 * d - 1);
  };
  const metal = (pal) => (x, r) => {
    shade(x, r, pal, 3);
    for (let i = 0; i < 6; i++) rect(x, Math.floor(r() * 15), Math.floor(r() * 15), 2, 1, pal[pal.length - 1]);
    rect(x, 1, 1, 14, 1, pal[0]); rect(x, 1, 14, 14, 1, pal[0]);
  };
  const SOUL_PAL = ["#5c4a3a", "#4e3e30", "#6a5644"];
  const paintSoulSand = (x, r) => {
    shade(x, r, SOUL_PAL, 3);
    for (let i = 0; i < 3; i++) {
      const px = 1 + Math.floor(r() * 12), py = 1 + Math.floor(r() * 12);
      rect(x, px, py, 3, 2, "#33261c"); rect(x, px + 1, py + 2, 1, 1, "#33261c");
    }
  };

  /* roster: id, painters (side, top, bottom, front), flags */
  const R = (id, side, top, bottom, front, flags) =>
    Object.assign({ id, side, top: top || side, bottom: bottom || top || side, front: front || side }, flags || {});
  const ROSTER = [
    R("grass", paintGrassSide, paintGrassTop, paintDirt),
    R("dirt", paintDirt),
    R("stone", noise(STONE_PAL, 4)),
    R("cobblestone", (x, r) => { shade(x, r, ["#7d7d7d", "#616161", "#8b8b8b", "#4f4f4f"], 2); }),
    R("mossy_cobblestone", (x, r) => { shade(x, r, ["#7d7d7d", "#616161", "#6d8a5c", "#4f6b41"], 2); }),
    R("planks", paintPlanks),
    R("log", paintLogSide, paintLogTop),
    R("bookshelf", paintBookshelf, paintPlanks),
    R("crafting_table", paintCraftingSide, paintCraftingTop),
    R("furnace", paintFurnaceSide, paintFurnaceSide, paintFurnaceSide, paintFurnaceFront),
    R("sand", noise(["#dbd3a0", "#d6cc99", "#e2dcae", "#cfc48d"], 3)),
    R("glass", paintGlass, paintGlass, paintGlass, paintGlass, { alpha: true }),
    R("bricks", paintBricks),
    R("stone_bricks", paintStoneBricks),
    R("netherrack", noise(["#6b2828", "#5d2222", "#7a3030", "#4f1d1d"], 3)),
    R("soul_sand", paintSoulSand),
    R("gravel", noise(["#8a8380", "#7a7370", "#9a9390", "#6a6360"], 2)),
    R("snow", noise(["#f4fbfd", "#e8f4f8", "#ffffff", "#dceef4"], 4)),
    R("ice", (x, r) => { shade(x, r, ["#9db8e8", "#8fadde", "#aec6f0"], 5); for (let i = 0; i < 4; i++) rect(x, Math.floor(r() * 12), Math.floor(r() * 16), 3, 1, "#c4d6f6"); }),
    R("melon", paintMelonSide, paintMelonTop),
    R("pumpkin", paintPumpkinSide, paintPumpkinTop, paintPumpkinTop, paintPumpkinFront),
    R("tnt", paintTntSide, paintTntTop),
    R("coal_ore", ore("#262626", "#414141")),
    R("iron_ore", ore("#d8af93", "#e8c9ae")),
    R("lapis_ore", ore("#2b49c9", "#4d6fe0")),
    R("redstone_ore", ore("#ff3b2f", "#ff6b5e", 6)),
    R("emerald_ore", ore("#2fd46b", "#7df0a5")),
    R("diamond_ore", ore("#4aedd9", "#8ff7ea")),
    R("gold_block", metal(["#f9d549", "#e8c23a", "#fbe27a", "#d4af2e"])),
    R("iron_block", metal(["#d8d8d8", "#c4c4c4", "#ececec", "#b0b0b0"])),
    R("diamond_block", metal(["#6bf0e0", "#57dccd", "#8ff7ea", "#45c9ba"])),
    R("emerald_block", metal(["#41d97c", "#35c46d", "#63e694", "#2bad5f"])),
    R("glowstone", noise(["#ffbc4c", "#f2a83c", "#ffd479", "#e0912c"], 2), null, null, null, { emissive: true }),
    R("obsidian", noise(["#1a1221", "#241a2e", "#120c18", "#2e2238"], 3)),
    R("bedrock", noise(["#565656", "#3d3d3d", "#6b6b6b", "#2b2b2b"], 2)),
  ];

  /* ---------------------------------------------------- atlas + field */
  const BG = [10 / 255, 16 / 255, 11 / 255]; // #0a100b
  const CUBE = 1.3;
  const CAM_POS = [0, 0.9, 15.5];
  const CAM_TARGET = [0, 0.45, 0];
  const FOV = 48;
  const NEAR_Z = 9, FAR_Z = -17;

  function buildAtlas() {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 16 * ROSTER.length;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    ROSTER.forEach((def, row) => {
      const r = mulberry(seedOf(def.id));
      const faces = [def.side, def.front, def.top, def.bottom];
      faces.forEach((paint, slot) => {
        const [tc, tx] = tile();
        paint(tx, r);
        x.drawImage(tc, slot * 16, row * 16);
      });
    });
    return c;
  }

  function makeField(aspect) {
    const r = mulberry(0xb10c5);
    const order = ROSTER.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const n = order.length;
    const slotH = (NEAR_Z - FAR_Z) / n;
    const halfTan = Math.tan((FOV * Math.PI / 180) / 2);
    return order.map((bi, slot) => {
      const def = ROSTER[bi];
      const z = NEAR_Z - (slot + 0.5) * slotH + (r() - 0.5) * slotH * 0.8;
      const dist = CAM_POS[2] - z;
      const halfH = halfTan * dist;
      const halfW = halfH * aspect;
      const spanX = halfW * 0.55, spanY = halfH * 0.52;
      const TAU = Math.PI * 2;
      return {
        def,
        base: [(r() - 0.5) * 2 * spanX, (r() - 0.5) * 2 * spanY + 0.45, z],
        amp: [spanX * (0.3 + r() * 0.45), spanY * (0.3 + r() * 0.45), 0.4 + r() * 1.0],
        freq: [0.05 + r() * 0.13, 0.05 + r() * 0.13, 0.05 + r() * 0.13],
        phase: [r() * TAU, r() * TAU, r() * TAU],
        rot: [(r() - 0.5) * 0.45, (r() - 0.5) * 0.45, (r() - 0.5) * 0.45],
        angle: [0, 0, 0],
        pos: [0, 0, 0],
      };
    });
  }

  const MIN_DIST = CUBE * Math.sqrt(3) + 0.05;
  const MIN2 = MIN_DIST * MIN_DIST;
  function simulate(entries, t, dt) {
    const n = entries.length;
    for (let i = 0; i < n; i++) {
      const m = entries[i];
      m.pos[0] = m.base[0] + Math.sin(t * m.freq[0] + m.phase[0]) * m.amp[0];
      m.pos[1] = m.base[1] + Math.sin(t * m.freq[1] + m.phase[1]) * m.amp[1];
      m.pos[2] = m.base[2] + Math.sin(t * m.freq[2] + m.phase[2]) * m.amp[2];
    }
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < n; i++) {
        const a = entries[i].pos;
        for (let j = i + 1; j < n; j++) {
          const b = entries[j].pos;
          const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= MIN2) continue;
          let d = Math.sqrt(d2), ux, uy, uz;
          if (d < 1e-5) { ux = 1; uy = 0.3; uz = 0; d = 1; }
          else { ux = dx / d; uy = dy / d; uz = dz / d; }
          const push = (MIN_DIST - d) * 0.5;
          a[0] -= ux * push; a[1] -= uy * push; a[2] -= uz * push;
          b[0] += ux * push; b[1] += uy * push; b[2] += uz * push;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const m = entries[i];
      m.angle[0] += m.rot[0] * dt;
      m.angle[1] += m.rot[1] * dt;
      m.angle[2] += m.rot[2] * dt;
    }
  }

  /* ------------------------------------------------------- matrix math */
  function perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
  }
  function lookAt(out, eye, target) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let l = 1 / Math.hypot(zx, zy, zz); zx *= l; zy *= l; zz *= l;
    let xx = -zy, xy = 0, xz = zx; // up = (0,1,0) cross z
    l = 1 / (Math.hypot(xx, xy, xz) || 1); xx *= l; xy *= l; xz *= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
  }
  /* column-major model = translate * Rz * Ry * Rx */
  function model(out, p, a) {
    const cx = Math.cos(a[0]), sx = Math.sin(a[0]);
    const cy = Math.cos(a[1]), sy = Math.sin(a[1]);
    const cz = Math.cos(a[2]), sz = Math.sin(a[2]);
    // R = Rz*Ry*Rx
    const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx;
    const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx;
    const r20 = -sy, r21 = cy * sx, r22 = cy * cx;
    out[0] = r00; out[1] = r10; out[2] = r20; out[3] = 0;
    out[4] = r01; out[5] = r11; out[6] = r21; out[7] = 0;
    out[8] = r02; out[9] = r12; out[10] = r22; out[11] = 0;
    out[12] = p[0]; out[13] = p[1]; out[14] = p[2]; out[15] = 1;
    return out;
  }

  /* ----------------------------------------------------------- shaders */
  const CUBE_VS = `
    attribute vec3 aPos; attribute vec2 aUV; attribute float aSlot; attribute vec3 aNormal;
    uniform mat4 uProj, uView, uModel; uniform mat3 uNormal; uniform vec3 uCam;
    varying vec2 vUV; varying float vSlot; varying vec3 vNormal; varying float vDist;
    void main() {
      vec4 world = uModel * vec4(aPos, 1.0);
      gl_Position = uProj * uView * world;
      vNormal = uNormal * aNormal;
      vUV = aUV; vSlot = aSlot;
      vDist = length(world.xyz - uCam);
    }`;
  const CUBE_FS = `
    precision mediump float;
    varying vec2 vUV; varying float vSlot; varying vec3 vNormal; varying float vDist;
    uniform sampler2D uAtlas; uniform float uRow, uRows, uEmissive;
    uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
    void main() {
      vec2 cell = vec2((vSlot + (0.5 + vUV.x * 15.0) / 16.0) / 4.0,
                       1.0 - (uRow + (0.5 + vUV.y * 15.0) / 16.0) / uRows);
      vec4 tex = texture2D(uAtlas, cell);
      if (tex.a < 0.06) discard;
      vec3 n = normalize(vNormal);
      vec3 lit;
      if (uEmissive > 0.5) {
        lit = tex.rgb * 1.55;
      } else {
        float face = vSlot > 2.5 ? 0.55 : vSlot > 1.5 ? 1.0 : vSlot > 0.5 ? 0.85 : 0.8;
        vec3 key = normalize(vec3(6.0, 9.0, 4.0));
        vec3 fill = normalize(vec3(-7.0, 3.0, -6.0));
        vec3 under = normalize(vec3(2.0, -6.0, 8.0));
        float dk = max(dot(n, key), 0.0) * 1.15;
        float df = max(dot(n, fill), 0.0) * 0.30;
        float du = max(dot(n, under), 0.0) * 0.12;
        vec3 amb = mix(vec3(0.10, 0.12, 0.10), vec3(0.30, 0.34, 0.36), 0.5 + 0.5 * n.y);
        lit = tex.rgb * (amb + vec3(1.0, 0.98, 0.92) * dk + vec3(0.66, 0.81, 0.78) * df + vec3(0.91, 0.83, 0.60) * du) * face * 1.35;
      }
      float f = smoothstep(uFogNear, uFogFar, vDist);
      gl_FragColor = vec4(mix(lit, uFogColor, f), tex.a);
    }`;
  const POINT_VS = `
    attribute vec3 aPos; attribute float aSeed;
    uniform mat4 uProj, uView; uniform float uTime, uDpr, uSize;
    varying float vTw;
    void main() {
      vec4 view = uView * vec4(aPos, 1.0);
      gl_Position = uProj * view;
      float dist = max(-view.z, 0.1);
      gl_PointSize = clamp(uSize * uDpr * (14.0 / dist), 1.0, 7.0 * uDpr);
      vTw = 0.55 + 0.45 * sin(uTime * 0.8 + aSeed * 6.2831);
    }`;
  const POINT_FS = `
    precision mediump float;
    varying float vTw;
    uniform vec3 uColor; uniform float uAlpha;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      float a = smoothstep(0.5, 0.18, d) * uAlpha * vTw;
      gl_FragColor = vec4(uColor * a, a);
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.log("🦆 block-field shader: " + gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    const a = compile(gl, gl.VERTEX_SHADER, vs), b = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.log("🦆 block-field link: " + gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  /* ------------------------------------------------------- cube geometry */
  function cubeBuffers(gl) {
    // face order: +x, -x, +y, -y, +z, -z ; slots: side 0, front 1, top 2, bottom 3
    const faces = [
      { n: [1, 0, 0], slot: 0, v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
      { n: [-1, 0, 0], slot: 0, v: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
      { n: [0, 1, 0], slot: 2, v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
      { n: [0, -1, 0], slot: 3, v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
      { n: [0, 0, 1], slot: 1, v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
      { n: [0, 0, -1], slot: 0, v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    ];
    const uvq = [[0, 1], [0, 0], [1, 0], [1, 1]]; // matches winding below
    const pos = [], uv = [], slot = [], nor = [], idx = [];
    faces.forEach((f, fi) => {
      const base = fi * 4;
      f.v.forEach((p, vi) => {
        pos.push(p[0] * CUBE / 2, p[1] * CUBE / 2, p[2] * CUBE / 2);
        uv.push(uvq[vi][0], uvq[vi][1]);
        slot.push(f.slot);
        nor.push(f.n[0], f.n[1], f.n[2]);
      });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    const buf = (data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      return b;
    };
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    return { pos: buf(pos), uv: buf(uv), slot: buf(slot), nor: buf(nor), indices: ib, count: idx.length };
  }

  /* ------------------------------------------------------------- mount */
  function mount(canvas, opts, onFirstFrame) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" })
      || canvas.getContext("experimental-webgl");
    if (!gl) return false;

    const cubeProg = program(gl, CUBE_VS, CUBE_FS);
    const pointProg = program(gl, POINT_VS, POINT_FS);
    if (!cubeProg || !pointProg) return false;

    const atlasCanvas = buildAtlas();
    const atlas = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const geo = cubeBuffers(gl);

    /* stars + dust */
    const STARS = 700, DUST = 220;
    const starPos = new Float32Array(STARS * 3), starSeed = new Float32Array(STARS);
    const rs = mulberry(0x51a5);
    for (let i = 0; i < STARS; i++) {
      const th = rs() * Math.PI * 2, ph = Math.acos(2 * rs() - 1), rad = 55 + rs() * 35;
      starPos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = rad * Math.cos(ph) * 0.6;
      starPos[i * 3 + 2] = -20 + rad * Math.sin(ph) * Math.sin(th) * 0.4;
      starSeed[i] = rs();
    }
    const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 30;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      dustPos[i * 3 + 2] = -19 + Math.random() * 32;
      dustSeed[i] = Math.random();
    }
    const fbuf = (data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      return b;
    };
    const starBuf = fbuf(starPos), starSeedBuf = fbuf(starSeed);
    const dustBuf = fbuf(dustPos), dustSeedBuf = fbuf(dustSeed);

    /* uniform locations */
    const cu = (n) => gl.getUniformLocation(cubeProg, n);
    const cU = {
      proj: cu("uProj"), view: cu("uView"), model: cu("uModel"), normal: cu("uNormal"),
      cam: cu("uCam"), atlas: cu("uAtlas"), row: cu("uRow"), rows: cu("uRows"),
      emissive: cu("uEmissive"), fogColor: cu("uFogColor"), fogNear: cu("uFogNear"), fogFar: cu("uFogFar"),
    };
    const cA = {
      pos: gl.getAttribLocation(cubeProg, "aPos"), uv: gl.getAttribLocation(cubeProg, "aUV"),
      slot: gl.getAttribLocation(cubeProg, "aSlot"), normal: gl.getAttribLocation(cubeProg, "aNormal"),
    };
    const pu = (n) => gl.getUniformLocation(pointProg, n);
    const pU = { proj: pu("uProj"), view: pu("uView"), time: pu("uTime"), dpr: pu("uDpr"), size: pu("uSize"), color: pu("uColor"), alpha: pu("uAlpha") };
    const pA = { pos: gl.getAttribLocation(pointProg, "aPos"), seed: gl.getAttribLocation(pointProg, "aSeed") };

    const proj = new Float32Array(16), view = new Float32Array(16);
    const mdl = new Float32Array(16), nrm = new Float32Array(9);
    lookAt(view, CAM_POS, CAM_TARGET);

    let entries = [];
    let width = 1, height = 1, dpr = 1;
    let running = false, rafId = 0, first = true, disposed = false;
    const reduced = Boolean(opts && opts.reducedMotion);

    function resize() {
      width = Math.max(1, canvas.clientWidth || window.innerWidth);
      height = Math.max(1, canvas.clientHeight || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      perspective(proj, FOV * Math.PI / 180, width / Math.max(1, height), 0.1, 120);
      entries = makeField(width / Math.max(1, height));
    }

    function drawPoints(buf, seedBuf, count, color, alpha, size, time) {
      gl.useProgram(pointProg);
      gl.uniformMatrix4fv(pU.proj, false, proj);
      gl.uniformMatrix4fv(pU.view, false, view);
      gl.uniform1f(pU.time, time);
      gl.uniform1f(pU.dpr, dpr);
      gl.uniform1f(pU.size, size);
      gl.uniform3fv(pU.color, color);
      gl.uniform1f(pU.alpha, alpha);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(pA.pos);
      gl.vertexAttribPointer(pA.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
      gl.enableVertexAttribArray(pA.seed);
      gl.vertexAttribPointer(pA.seed, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    function frame(time, dt) {
      simulate(entries, time, dt);
      gl.clearColor(BG[0], BG[1], BG[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.depthMask(true);

      /* cubes: opaque first, then alpha glass */
      gl.useProgram(cubeProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(cU.atlas, 0);
      gl.uniformMatrix4fv(cU.proj, false, proj);
      gl.uniformMatrix4fv(cU.view, false, view);
      gl.uniform3fv(cU.cam, CAM_POS);
      gl.uniform1f(cU.rows, ROSTER.length);
      gl.uniform3fv(cU.fogColor, BG);
      gl.uniform1f(cU.fogNear, 18);
      gl.uniform1f(cU.fogFar, 48);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geo.indices);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.pos);
      gl.enableVertexAttribArray(cA.pos);
      gl.vertexAttribPointer(cA.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.uv);
      gl.enableVertexAttribArray(cA.uv);
      gl.vertexAttribPointer(cA.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.slot);
      gl.enableVertexAttribArray(cA.slot);
      gl.vertexAttribPointer(cA.slot, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.nor);
      gl.enableVertexAttribArray(cA.normal);
      gl.vertexAttribPointer(cA.normal, 3, gl.FLOAT, false, 0, 0);

      const drawCube = (e) => {
        model(mdl, e.pos, e.angle);
        // normal matrix: rotation part (columns 0,1,2 rows 0,1,2)
        nrm[0] = mdl[0]; nrm[1] = mdl[1]; nrm[2] = mdl[2];
        nrm[3] = mdl[4]; nrm[4] = mdl[5]; nrm[5] = mdl[6];
        nrm[6] = mdl[8]; nrm[7] = mdl[9]; nrm[8] = mdl[10];
        gl.uniformMatrix4fv(cU.model, false, mdl);
        gl.uniformMatrix3fv(cU.normal, false, nrm);
        gl.uniform1f(cU.row, ROSTER.indexOf(e.def));
        gl.uniform1f(cU.emissive, e.def.emissive ? 1 : 0);
        gl.drawElements(gl.TRIANGLES, geo.count, gl.UNSIGNED_SHORT, 0);
      };
      for (const e of entries) if (!e.def.alpha) drawCube(e);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const e of entries) if (e.def.alpha) drawCube(e);

      /* stars, then drifting dust, both additive */
      gl.blendFunc(gl.ONE, gl.ONE);
      drawPoints(starBuf, starSeedBuf, STARS, [0.82, 0.88, 0.79], 0.5, 0.9, time);
      for (let i = 0; i < DUST; i++) {
        dustPos[i * 3 + 1] += dt * 0.15;
        if (dustPos[i * 3 + 1] > 8) dustPos[i * 3 + 1] = -8;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dustPos);
      drawPoints(dustBuf, dustSeedBuf, DUST, [0.82, 0.89, 0.79], 0.26, 0.55, time * 3.1);
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      if (first) {
        first = false;
        if (onFirstFrame) onFirstFrame();
      }
    }

    let last = performance.now();
    function loop(now) {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frame(now / 1000, dt);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (reduced || running || disposed) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const onResize = () => {
      resize();
      if (reduced) frame(20, 0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("webglcontextlost", (ev) => {
      ev.preventDefault();
      stop();
      console.log("🦆 block-field: context lost, stylesheet background stays.");
    });

    resize();
    frame(reduced ? 20 : 0, 0);
    if (!reduced) start();
    return {
      dispose() {
        disposed = true;
        stop();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("resize", onResize);
      },
    };
  }

  window.IDIBlockField = { mount };
})();
