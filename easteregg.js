/* The duck easter egg.
 *
 * - Every homepage visit rolls a 1/1000 chance: hit it and the photo
 *   collage background is swapped for one of the hidden videos.
 * - /easteregg (or /easteregg.html on a local server) always plays one.
 *
 * The clips are not stored in this repository (the original 74 MB file
 * predates the Cloudflare Pages per-file limit) - they stream from the public
 * asset bundle, idi-assets, under assets/website/. One clip is picked at
 * random per visit and never the same one twice in a row; if a clip is
 * missing or unreachable the next candidate is tried, ending on the original
 * clip pinned to its snapshot commit, which exists no matter how the bundle
 * is reorganised. Pin ASSET_REF to a commit sha or tag once a bundle revision
 * is final, so the egg stops tracking main.
 *
 * The video starts muted so autoplay is allowed everywhere; a small
 * toggle in the corner enables sound. Random rolls respect
 * prefers-reduced-motion - the explicit route does not.
 */
(() => {
  const ASSET_REPO =
    "https://gitlab.com/international-duck-incorporated/idi-assets";
  const ASSET_REF = "main"; // pin to a commit sha or tag for an immutable URL
  const ASSET_DIR = "/assets/website/"; // bundle layout since October 2026
  const VIDEOS = [
    "easteregg-video-2.webm", //   5.4 s,  1.2 MB
    "easteregg-video-3.webm", //  14.0 s, 18.7 MB
    "easteregg-video.webm", //    24.4 s, 74.2 MB - the original
  ];
  // The original clip at the commit it was audited in: the one URL that is
  // guaranteed to resolve however the bundle is laid out later.
  const LEGACY_SRC =
    "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/e8e147d6aed5f32291ea05dc4cd64541fa1b973a/gitlab/home/assets/easteregg-video.webm";
  const ROLL_ODDS = 1000;
  const LAST_KEY = "idi-egg-last";

  const path = (location.pathname || "/")
    .replace(/\/+$/, "")
    .replace(/\.html$/, "") || "/";

  const isEggRoute = path.endsWith("/easteregg");
  const isHome = document.body.dataset.page === "organization" && !isEggRoute;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lucky = isHome && !reducedMotion && Math.floor(Math.random() * ROLL_ODDS) === 0;

  if (!isEggRoute && !lucky) return;

  const readLast = () => {
    try {
      return localStorage.getItem(LAST_KEY);
    } catch {
      return null; // private mode / storage disabled
    }
  };

  // Random start so a clip that fails to load falls through to the next one;
  // the rotation ends on the pinned original.
  const remember = readLast();
  let start = Math.floor(Math.random() * VIDEOS.length);
  if (VIDEOS.length > 1 && VIDEOS[start] === remember) {
    start = (start + 1) % VIDEOS.length;
  }
  const playlist = VIDEOS.slice(start).concat(VIDEOS.slice(0, start), [null]);

  const video = document.createElement("video");
  video.className = "egg-video";
  video.preload = "auto";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("disablepictureinpicture", "");
  video.setAttribute("aria-hidden", "true");
  document.body.append(video);

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

  let attempt = 0;
  const playNext = () => {
    const clip = playlist[attempt++];
    if (clip === undefined) {
      // Nothing reachable, not even the pinned original: back out quietly and
      // leave the collage in place.
      video.remove();
      console.log("\u{1F95A} the egg cracked before it hatched - no clip reachable.");
      return;
    }
    const name = clip || "easteregg-video.webm";
    video.dataset.clip = name;
    video.src = clip
      ? `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}${clip}`
      : LEGACY_SRC;
    video.load();
    video.play().catch(() => {});
  };

  video.addEventListener(
    "canplay",
    () => {
      const name = video.dataset.clip || "easteregg-video.webm";
      try {
        localStorage.setItem(LAST_KEY, name);
      } catch {}
      document.body.classList.add("egg-bg", "egg-ready");
      document.body.append(soundButton);
      console.log(
        `\u{1F95A} ${
          isEggRoute
            ? "/easteregg - it was always going to play."
            : `1/${ROLL_ODDS} - the ducks favor you today. Visit /easteregg anytime.`
        } Clip: ${name}`
      );
    },
    { once: true }
  );

  video.addEventListener("error", playNext);

  playNext();
})();
