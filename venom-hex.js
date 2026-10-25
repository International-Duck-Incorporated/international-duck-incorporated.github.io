/*
 * venom-hex.js - neon hexagon-forming particle background for the Venomous
 * page. Adapted from the supplied venom_index.html (green hex lattice
 * walkers, hue 120), retuned so the fade matches the site background and
 * reduced-motion users get a settled static lattice instead of animation.
 */
(() => {
  const canvas = document.getElementById("venom-hex");
  if (!canvas) return;
  if (window.IDI_LOW_END) {
    canvas.hidden = true;
    return;
  }

  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  const opts = {
    len: 20,
    count: 250,
    baseTime: 10,
    addedTime: 10,
    dieChance: 0.05,
    spawnChance: 1,
    sparkChance: 0.1,
    sparkDist: 10,
    sparkSize: 2,
    baseLight: 50,
    addedLight: 10,
    shadowToTimePropMult: 6,
    baseLightInputMultiplier: 0.01,
    addedLightInputMultiplier: 0.02,
    repaintAlpha: 0.04,
  };

  const offScreenMult = 4; // how far past the edge lines travel before resetting
  let dieX = (w / 2 / opts.len) * offScreenMult;
  let dieY = (h / 2 / opts.len) * offScreenMult;

  const baseRad = (Math.PI * 2) / 6;
  const lines = [];

  const FADE = "7, 9, 13";
  ctx.fillStyle = `rgb(${FADE})`;
  ctx.fillRect(0, 0, w, h);

  function Line() {
    this.reset();
  }
  Line.prototype.reset = function () {
    this.x = 0;
    this.y = 0;
    this.addedX = 0;
    this.addedY = 0;

    this.rad = 0;

    // pick one of the 4 screen corners as this line's origin
    const corners = [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ];
    const corner = corners[(Math.random() * 4) | 0];
    this.cx = corner[0];
    this.cy = corner[1];

    this.lightInputMultiplier =
      opts.baseLightInputMultiplier + opts.addedLightInputMultiplier * Math.random();

    this.color = "hsl(120, 100%, light%)"; // 120 = venom green
    this.cumulativeTime = 0;

    this.beginPhase();
  };
  Line.prototype.beginPhase = function () {
    this.x += this.addedX;
    this.y += this.addedY;

    this.time = 0;
    this.targetTime = (opts.baseTime + opts.addedTime * Math.random()) | 0;

    this.rad += baseRad * (Math.random() < 0.5 ? 1 : -1);
    this.addedX = Math.cos(this.rad);
    this.addedY = Math.sin(this.rad);

    if (
      Math.random() < opts.dieChance ||
      this.x > dieX ||
      this.x < -dieX ||
      this.y > dieY ||
      this.y < -dieY
    )
      this.reset();
  };
  Line.prototype.step = function () {
    ++this.time;
    ++this.cumulativeTime;

    if (this.time >= this.targetTime) this.beginPhase();

    const prop = this.time / this.targetTime;
    const wave = Math.sin((prop * Math.PI) / 2);
    const x = this.addedX * wave;
    const y = this.addedY * wave;
    const px = this.cx + (this.x + x) * opts.len;
    const py = this.cy + (this.y + y) * opts.len;

    ctx.shadowBlur = prop * opts.shadowToTimePropMult;
    ctx.fillStyle = ctx.shadowColor = this.color.replace(
      "light",
      opts.baseLight + opts.addedLight * Math.sin(this.cumulativeTime * this.lightInputMultiplier)
    );
    ctx.fillRect(px, py, 2, 2);

    if (Math.random() < opts.sparkChance)
      ctx.fillRect(
        px + Math.random() * opts.sparkDist * (Math.random() < 0.5 ? 1 : -1) - opts.sparkSize / 2,
        py + Math.random() * opts.sparkDist * (Math.random() < 0.5 ? 1 : -1) - opts.sparkSize / 2,
        opts.sparkSize,
        opts.sparkSize
      );
  };

  function tick() {
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${FADE}, ${opts.repaintAlpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    if (lines.length < opts.count && Math.random() < opts.spawnChance) lines.push(new Line());

    for (const line of lines) line.step();
  }

  function loop() {
    tick();
    window.requestAnimationFrame(loop);
  }

  // Pre-run the simulation a little so the lattice is already visible on
  // first paint, without blocking load for long on slow machines. The live
  // loop keeps growing it from here.
  const warmupTicks = Math.min(160, Math.max(80, Math.round(window.innerWidth / 9)));
  for (let i = 0; i < warmupTicks; i++) tick();

  if (!reduceMotion) loop();

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    ctx.fillStyle = `rgb(${FADE})`;
    ctx.fillRect(0, 0, w, h);

    dieX = (w / 2 / opts.len) * offScreenMult;
    dieY = (h / 2 / opts.len) * offScreenMult;

    // Respawn walkers so corner origins track the new viewport.
    lines.length = 0;
  });
})();
