/*
 * csharp-rain.js - drifting C# code behind the Jojo-8002 member page.
 *
 * Jojo codes in C#, so his profile gets a slow veil of C# syntax falling over a
 * near-black violet field. Deliberately low contrast: it is a backdrop, not the
 * subject. A 2D canvas, so it costs far less than the site's WebGL effects and
 * needs no shaders or textures.
 *
 * Usage: put the canvas first in <body>, add the csharp-page class to <body>
 * (that class clears the opaque body background so a negative z-index canvas is
 * visible) and load this file with defer.
 *
 *   <canvas id="csharp-rain" class="effect-background" aria-hidden="true"></canvas>
 *   <script src="/csharp-rain.js?v=<hash>" defer></script>
 *
 * Skipped on low-end devices (window.IDI_LOW_END); reduced-motion users get a
 * single still frame instead of the animation.
 */
(() => {
  const canvas = document.getElementById("csharp-rain");
  if (!canvas) return;
  if (window.IDI_LOW_END) {
    canvas.hidden = true;
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Short C# fragments. Anything wider than the column is dropped at start-up,
  // once the font can be measured.
  const CODE = [
    "class",
    "public",
    "private",
    "static",
    "void",
    "var",
    "string",
    "int[]",
    "bool",
    "async Task",
    "await",
    "record",
    "init;",
    "get; set;",
    "=>",
    "??=",
    "?.",
    "using System;",
    "namespace",
    "Main()",
    "foreach",
    "yield return",
    "try",
    "catch",
    "List<int>",
    "Dictionary",
    "IEnumerable",
    "LINQ",
    "override",
    "sealed",
    "readonly",
    "const",
    "null!",
    "nameof(x)",
    "throw new",
    "#region",
    "Console.WriteLine",
    "{ }",
    ";",
    "partial",
    "switch",
    "case",
  ];

  // A few comment fragments carry the Visual Studio green, so the rain has a
  // second voice instead of one flat colour.
  const COMMENTS = ["// TODO", "// heh", "/// <summary>"];

  const LINE = 26; // row height: one token per row
  const COLUMN = 132; // horizontal pitch between streams
  const COLUMN_ROOM = COLUMN - 16; // widest token allowed in a column
  const STEP_MS = 95; // one animation step
  const FADE = "7, 9, 13"; // --bg
  const VIOLET = "148, 132, 255"; // .NET purple
  const GREEN = "122, 220, 158"; // Visual Studio comment green

  // Age 0 is the head of a stream; the rest fade out along the trail.
  const headAlpha = 0.62;
  const trailAlpha = (age, length) => 0.24 * (1 - age / length) ** 1.5 + 0.03;

  let w = 0;
  let h = 0;
  let rows = 0;
  let streams = [];
  let tokens = CODE;
  let comments = COMMENTS;

  const pick = (list) => list[(Math.random() * list.length) | 0];

  function makeStream(index) {
    return {
      x: index * COLUMN + COLUMN / 2 - COLUMN_ROOM / 2,
      // Not every column runs, so the field never looks like a grid.
      active: Math.random() < 0.8,
      head: -Math.random() * rows,
      length: 5 + ((Math.random() * 9) | 0),
      stride: Math.random() < 0.4 ? 2 : 1,
      tick: 0,
      speed: 1 + ((Math.random() * 2) | 0),
      cells: [],
    };
  }

  function reset() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    rows = Math.ceil(h / LINE) + 1;

    ctx.fillStyle = `rgb(${FADE})`;
    ctx.fillRect(0, 0, w, h);
    ctx.font = `14px ui-monospace, "Cascadia Code", Consolas, Menlo, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const fits = (token) => ctx.measureText(token).width <= COLUMN_ROOM;
    tokens = CODE.filter(fits);
    comments = COMMENTS.filter(fits);

    const count = Math.max(1, Math.floor(w / COLUMN));
    streams = Array.from({ length: count }, (_, index) => makeStream(index));
  }

  function pushCell(stream) {
    const isComment = Math.random() < 0.08 && comments.length > 0;
    stream.cells.push({
      row: Math.round(stream.head),
      token: isComment ? pick(comments) : pick(tokens),
      comment: isComment,
      age: 0,
    });
  }

  function paint() {
    // Redraw from scratch each step: cheap at this cell count, and it keeps the
    // age-based alphas exact instead of letting repeated paint build up.
    ctx.fillStyle = `rgb(${FADE})`;
    ctx.fillRect(0, 0, w, h);

    for (const stream of streams) {
      for (const cell of stream.cells) {
        const y = cell.row * LINE;
        if (y < -LINE || y > h + LINE) continue;
        const rgb = cell.comment ? GREEN : VIOLET;
        const alpha = cell.age === 0 ? headAlpha : trailAlpha(cell.age, stream.length);
        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.fillText(cell.token, stream.x, y);
      }
    }
  }

  function step(time) {
    window.requestAnimationFrame(step);
    if (time - last < STEP_MS) return;
    last = time;

    for (const stream of streams) {
      if (!stream.active) continue;

      stream.tick += 1;
      if (stream.tick < stream.stride) continue;
      stream.tick = 0;

      // Age everything that is already on screen, then drop what is too old.
      for (const cell of stream.cells) cell.age += 1;
      stream.cells = stream.cells.filter((cell) => cell.age <= stream.length);

      stream.head += stream.speed;
      if (stream.head > rows + stream.length) {
        Object.assign(stream, makeStream(stream.x / COLUMN), { active: stream.active });
        continue;
      }
      pushCell(stream);
    }

    paint();
  }

  function drawStatic() {
    // A single settled frame for reduced-motion users.
    reset();
    for (const stream of streams) {
      if (!stream.active) continue;
      for (let row = 0; row < rows; row += 4 + ((Math.random() * 5) | 0)) {
        stream.cells.push({
          row,
          token: Math.random() < 0.1 ? pick(comments) : pick(tokens),
          comment: Math.random() < 0.1,
          age: 1 + ((Math.random() * stream.length) | 0),
        });
      }
    }
    paint();
  }

  window.addEventListener("resize", () => {
    if (reduceMotion) drawStatic();
    else reset();
  });

  let last = 0;

  if (reduceMotion) drawStatic();
  else {
    reset();
    window.requestAnimationFrame(step);
  }
})();
