/* The duck easter egg, and the rotating homepage background.
 *
 * Background: every homepage visit picks one of four media at random - the
 * two short easter-egg clips streamed from the idi-assets bundle, or one of
 * the two site backgrounds (the community backdrop and the member collage).
 * The pick is remembered, so nobody gets the same media twice in a row, and
 * prefers-reduced-motion turns the rotation into images only.
 *
 * A rotation clip plays out in full, then holds its last frame as a still:
 * the background settles instead of looping forever, and there is no further
 * network cost. Set holdAt on a clip to end on a chosen moment of it (for
 * example the brand lockup it builds to) rather than on the final frame.
 *
 * Easter egg: a 1/1000 homepage visit, or /easteregg at any time, plays the
 * hidden 74 MB clip - deliberately not part of the normal rotation, because
 * of its size - fallback included for how the bundle may look later.
 *
 * Videos start muted so autoplay is allowed everywhere; a small toggle in
 * the corner enables sound while one is on screen. If nothing can be shown,
 * the script backs out and leaves the stylesheet background in place.
 */
(() => {
  const ASSET_REPO =
    "https://gitlab.com/international-duck-incorporated/idi-assets";
  const ASSET_REF = "main"; // pin to a commit sha or tag for an immutable URL
  const ASSET_DIR = "/assets/website/"; // bundle layout since October 2026

  // Homepage background pool. Clips stream from the bundle, images are served
  // by this repository. The 74 MB original is intentionally absent: it is the
  // easter egg's payload, not rotation material.
  const BACKGROUNDS = [
    {
      name: "easteregg-video-2.webm",
      kind: "video",
      label: "clip, plays out in full",
      // holdAt: 3.0, // end on the red IDI / GITLAB.ORG lockup instead
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video-2.webm`,
    },
    {
      name: "easteregg-video-3.webm",
      kind: "video",
      label: "clip, plays out in full",
      // holdAt: 4.6, // end on the blue IDI / INTERNATIONAL DUCK lockup instead
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video-3.webm`,
    },
    {
      name: "homepage-community-background-v4.jpg",
      kind: "image",
      label: "community backdrop",
      src: "/assets/homepage-community-background-v4.jpg",
    },
    {
      name: "idi-member-collage.png",
      kind: "image",
      label: "member collage",
      src: "/assets/idi-member-collage.png",
    },
  ];

  // The egg's sources, in order: the bundle's current layout, then the same
  // file pinned to the commit it was audited in, which resolves no matter how
  // the bundle is reorganised later.
  const EGG_SOURCES = [
    `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video.webm`,
    "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/e8e147d6aed5f32291ea05dc4cd64541fa1b973a/gitlab/home/assets/easteregg-video.webm",
  ];

  const ROLL_ODDS = 1000;
  const LAST_KEY = "idi-bg-last";

  const path = (location.pathname || "/")
    .replace(/\/+$/, "")
    .replace(/\.html$/, "") || "/";

  const isEggRoute = path.endsWith("/easteregg");
  const isHome = document.body.dataset.page === "organization" && !isEggRoute;

  if (!isEggRoute && !isHome) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lucky = isHome && !reducedMotion && Math.floor(Math.random() * ROLL_ODDS) === 0;
  const egg = isEggRoute || lucky;

  const readLast = () => {
    try {
      return localStorage.getItem(LAST_KEY);
    } catch {
      return null; // private mode / storage disabled
    }
  };

  const writeLast = (name) => {
    try {
      localStorage.setItem(LAST_KEY, name);
    } catch {}
  };

  const body = document.body;
  const giveUp = (what) =>
    console.log(`\u{1F95A} nothing to show (${what}) - the stylesheet background stays.`);

  // Reveal only once the media can actually paint: the stylesheet background
  // layers stay visible until then, so a slow clip never flashes a blank page.
  const reveal = (element, onReady) => {
    body.classList.add("egg-bg", "egg-ready");
    if (onReady) onReady();
  };

  const makeSoundButton = (video) => {
    const soundButton = document.createElement("button");
    soundButton.type = "button";
    soundButton.className = "egg-sound";
    soundButton.setAttribute("aria-pressed", "false");
    soundButton.setAttribute("aria-label", "Toggle background sound");
    soundButton.textContent = "\u{1F507}";

    soundButton.addEventListener("click", () => {
      video.muted = !video.muted;
      if (!video.muted) video.play().catch(() => {});
      soundButton.setAttribute("aria-pressed", String(!video.muted));
      soundButton.textContent = video.muted ? "\u{1F507}" : "\u{1F50A}";
    });

    return soundButton;
  };

  // ---------------------------------------------------------------- videos
  const mountVideo = (sources, { name, playOut, holdAt, log, onGiveUp }) => {
    const video = document.createElement("video");
    video.className = "egg-video";
    video.preload = "auto";
    video.autoplay = true;
    video.loop = !playOut; // rotation clips run once and settle
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("aria-hidden", "true");
    body.append(video);

    let attempt = 0;
    const load = () => {
      const src = sources[attempt++];
      if (src === undefined) {
        video.remove();
        onGiveUp();
        return;
      }
      video.src = src;
      video.load();
      video.play().catch(() => {});
    };

    const soundButton = makeSoundButton(video);

    video.addEventListener(
      "canplay",
      () => {
        writeLast(name);
        reveal(video, () => {
          body.append(soundButton);
          console.log(log ? log() : `\u{1F95A} background: ${name}`);
        });
      },
      { once: true }
    );

    if (playOut) {
      video.addEventListener("ended", () => {
        if (holdAt) {
          // End on a chosen moment of the clip instead of its last frame.
          video.currentTime = holdAt;
          video.pause();
        }
        soundButton.remove(); // a still has nothing to unmute
        console.log(
          `\u{1F95A} background: played out in full - holding the ` +
            (holdAt ? `frame at ${holdAt}s` : "last frame") +
            " as a still."
        );
      });
    }

    video.addEventListener("error", load);
    load();
  };

  // ---------------------------------------------------------------- images
  const mountImage = ({ name, src, label }) => {
    const photo = document.createElement("img");
    photo.className = "egg-photo";
    photo.alt = "";
    photo.setAttribute("aria-hidden", "true");
    photo.setAttribute("decoding", "async");

    photo.addEventListener(
      "load",
      () => {
        writeLast(name);
        reveal(photo, () =>
          console.log(`\u{1F95A} background: ${label || name} (this visit's pick)`)
        );
      },
      { once: true }
    );

    photo.addEventListener(
      "error",
      () => {
        photo.remove();
        giveUp(name);
      },
      { once: true }
    );

    photo.src = src;
    body.append(photo);
  };

  // ------------------------------------------------------------------ egg
  if (egg) {
    mountVideo(EGG_SOURCES, {
      name: "easteregg-video.webm",
      log: () =>
        `\u{1F95A} ${
          isEggRoute
            ? "/easteregg - it was always going to play."
            : `1/${ROLL_ODDS} - the ducks favor you today. Visit /easteregg anytime.`
        } Clip: the hidden one.`,
      onGiveUp: () => giveUp("easter egg clip"),
    });
    return;
  }

  // --------------------------------------------------- background rotation
  // Random per visit, never the same media twice in a row. Reduced motion
  // gets the still images only - no autoplaying video.
  const pool = reducedMotion
    ? BACKGROUNDS.filter((item) => item.kind === "image")
    : BACKGROUNDS;

  let index = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && pool[index].name === readLast()) {
    index = (index + 1) % pool.length;
  }
  const pick = pool[index];

  if (pick.kind === "image") {
    mountImage(pick);
  } else {
    // A clip that will not load (cold URL, network blip) is replaced by one of
    // the local stills rather than a blank page.
    const stills = BACKGROUNDS.filter((item) => item.kind === "image");
    mountVideo([pick.src], {
      name: pick.name,
      playOut: true,
      holdAt: pick.holdAt,
      log: () => `\u{1F95A} background: ${pick.label} (this visit's pick)`,
      onGiveUp: () => mountImage(stills[Math.floor(Math.random() * stills.length)]),
    });
  }
})();
