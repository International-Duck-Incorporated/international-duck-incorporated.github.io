/*
 * matrix-rain.js — falling "digital rain" characters background for the
 * 0xFFshell member page. Katakana + terminal glyphs in venom green over the
 * site background, kept subtle so content stays readable.
 */
(() => {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas) return;
  if (window.IDI_LOW_END) {
    canvas.hidden = true;
    return;
  }

  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const glyphs =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF01<>/\\{}[]$#*+=".split("");
  const fontSize = 15;
  const frameMs = 66;

  const FADE = "7, 9, 13";
  const BODY = (alpha) => `rgba(124, 226, 120, ${alpha})`; // site-tinted green rain
  const HEAD = "#eaffea";

  let w, h, drops;

  function reset() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const columns = Math.ceil(w / fontSize);
    // spread drops across the whole viewport so rain is present immediately
    drops = Array.from({ length: columns }, () =>
      Math.floor(((Math.random() * 3 - 1) * h) / fontSize)
    );
    ctx.fillStyle = `rgb(${FADE})`;
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${fontSize}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textBaseline = "top";
  }

  function drawStatic() {
    // One settled frame for reduced-motion users.
    reset();
    const rows = Math.ceil(h / fontSize);
    for (let i = 0; i < drops.length; i++) {
      for (
        let j = Math.floor(Math.random() * rows * 0.4);
        j < rows;
        j += 2 + Math.floor(Math.random() * 5)
      ) {
        ctx.fillStyle = BODY(0.16 + Math.random() * 0.2);
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * fontSize, j * fontSize);
      }
    }
  }

  let last = 0;
  let alive = true;

  function step(time) {
    if (!alive) return;
    window.requestAnimationFrame(step);
    if (time - last < frameMs) return;
    last = time;

    ctx.fillStyle = `rgba(${FADE}, 0.05)`;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < drops.length; i++) {
      const char = glyphs[(Math.random() * glyphs.length) | 0];
      const y = drops[i] * fontSize;

      if (y >= 0 && y <= h) {
        ctx.fillStyle = Math.random() < 0.08 ? HEAD : BODY(0.85);
        ctx.fillText(char, i * fontSize, y);
      }

      if (y > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  window.addEventListener("resize", () => {
    if (reduceMotion) drawStatic();
    else reset();
  });

  if (reduceMotion) drawStatic();
  else {
    reset();
    window.requestAnimationFrame(step);
  }
})();
