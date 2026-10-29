(() => {
  const canvas = document.querySelector("[data-bagley-network]");
  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = [];
  let width = 0;
  let height = 0;
  let scale = 1;
  let frame = 0;
  let lastTime = 0;

  const palette = [
    [73, 177, 255],
    [126, 92, 255],
    [26, 238, 211],
    [255, 75, 184],
    [255, 184, 71],
  ];

  const nodeCount = () => Math.min(72, Math.max(28, Math.round((width * height) / 23000)));

  function seed() {
    nodes.length = 0;
    for (let i = 0; i < nodeCount(); i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 13;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 0.8 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        color: Math.floor(Math.random() * palette.length),
      });
    }
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    seed();
    draw(performance.now(), 0);
  }

  function rgba(color, alpha) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  }

  function draw(time, delta) {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";

    const maxDistance = Math.min(180, Math.max(125, width * 0.12));
    const maxDistanceSquared = maxDistance * maxDistance;

    for (const node of nodes) {
      if (!reduceMotion.matches) {
        node.x += node.vx * delta;
        node.y += node.vy * delta;
        if (node.x < -10) node.x = width + 10;
        if (node.x > width + 10) node.x = -10;
        if (node.y < -10) node.y = height + 10;
        if (node.y > height + 10) node.y = -10;
      }
    }

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > maxDistanceSquared) continue;

        const strength = 1 - Math.sqrt(distanceSquared) / maxDistance;
        const pulse = reduceMotion.matches
          ? 0.6
          : 0.5 + 0.5 * Math.sin(time * 0.0014 + a.phase + b.phase);
        const gradient = context.createLinearGradient(a.x, a.y, b.x, b.y);
        gradient.addColorStop(0, rgba(palette[a.color], strength * (0.08 + pulse * 0.2)));
        gradient.addColorStop(1, rgba(palette[b.color], strength * (0.08 + (1 - pulse) * 0.2)));
        context.strokeStyle = gradient;
        context.lineWidth = 0.45 + strength * 1.1;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }

    for (const node of nodes) {
      const pulse = reduceMotion.matches ? 0.75 : 0.62 + Math.sin(time * 0.002 + node.phase) * 0.38;
      const color = palette[node.color];
      const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 7);
      glow.addColorStop(0, rgba(color, 0.85 * pulse));
      glow.addColorStop(0.22, rgba(color, 0.38 * pulse));
      glow.addColorStop(1, rgba(color, 0));
      context.fillStyle = glow;
      context.beginPath();
      context.arc(node.x, node.y, node.radius * 7, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate(time) {
    const delta = Math.min((time - lastTime) / 1000 || 0, 0.04);
    lastTime = time;
    draw(time, delta);
    frame = requestAnimationFrame(animate);
  }

  function updateMotion() {
    cancelAnimationFrame(frame);
    lastTime = performance.now();
    if (reduceMotion.matches) draw(lastTime, 0);
    else frame = requestAnimationFrame(animate);
  }

  addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else updateMotion();
  });
  reduceMotion.addEventListener?.("change", updateMotion);
  resize();
  updateMotion();
})();
