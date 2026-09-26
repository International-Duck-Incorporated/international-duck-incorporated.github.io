/* The duck easter egg.
 *
 * - Every homepage visit rolls a 1/1000 chance: hit it and the photo
 *   collage background is swapped for the hidden video.
 * - /easteregg (or /easteregg.html on a local server) always plays it.
 *
 * The video starts muted so autoplay is allowed everywhere; a small
 * toggle in the corner enables sound. Random rolls respect
 * prefers-reduced-motion - the explicit route does not.
 */
(() => {
  const VIDEO_SRC = "assets/easteregg-video.webm";
  const ROLL_ODDS = 1000;

  const path = (location.pathname || "/")
    .replace(/\/+$/, "")
    .replace(/\.html$/, "") || "/";

  const isEggRoute = path.endsWith("/easteregg");
  const isHome = document.body.dataset.page === "organization" && !isEggRoute;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lucky = isHome && !reducedMotion && Math.floor(Math.random() * ROLL_ODDS) === 0;

  if (!isEggRoute && !lucky) return;

  const video = document.createElement("video");
  video.className = "egg-video";
  video.src = VIDEO_SRC;
  video.preload = "auto";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("disablepictureinpicture", "");
  video.setAttribute("aria-hidden", "true");

  video.addEventListener(
    "canplay",
    () => {
      document.body.classList.add("egg-ready");
    },
    { once: true }
  );

  const soundButton = document.createElement("button");
  soundButton.type = "button";
  soundButton.className = "egg-sound";
  soundButton.setAttribute("aria-pressed", "false");
  soundButton.setAttribute("aria-label", "Toggle easter egg sound");
  soundButton.textContent = "\u{1F507}";

  soundButton.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted) video.play().catch(() => {});
    soundButton.setAttribute("aria-pressed", String(!video.muted));
    soundButton.textContent = video.muted ? "\u{1F507}" : "\u{1F50A}";
  });

  document.body.classList.add("egg-bg");
  document.body.append(video, soundButton);
  video.play().catch(() => {});

  console.log(
    isEggRoute
      ? "\u{1F95A} /easteregg - it was always going to play."
      : `\u{1F95A} 1/${ROLL_ODDS} - the ducks favor you today. Visit /easteregg anytime.`
  );
})();
