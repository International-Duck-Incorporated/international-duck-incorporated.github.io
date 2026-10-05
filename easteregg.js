/* The duck easter egg, and the rotating homepage background.
 *
 * Background: the pick itself happens in index.html's head (BACKDROPS +
 * window.IDI_BACKDROP), before the first style calculation, so the hero copy -
 * whose position follows the backdrop - never moves. This script mounts what was
 * picked; it only rolls for itself on a page that has no head pick, and it keeps
 * its payload table (source, label, holdAt) index-aligned with that head list.
 * Capable devices pick one of four media at random - the two short clips
 * streamed from the idi-assets bundle or one of two local stills.
 * Low-power devices use only the smaller community backdrop.
 * The pick is remembered, so nobody gets the same media twice in a row, and
 * prefers-reduced-motion turns the rotation into images only. Low-power
 * devices use the smaller local still and never auto-download a clip.
 *
 * A rotation clip plays out in full, then holds its last frame as a still:
 * the background settles instead of looping forever, and there is no further
 * network cost. Set holdAt on a clip to end on a chosen moment of it (for
 * example the brand lockup it builds to) rather than on the final frame.
 *
 * Easter egg: a 1/1000 homepage visit, or /easteregg at any time, plays the
 * hidden 74 MB clip - deliberately not part of the normal rotation, because
 * of its size. Low-power devices require an explicit button click first.
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
    // videos: the clip ends on the wordmark, so the copy sits top-left and the
    // <h1> hides - the backdrop is already saying the name
    {
      name: "easteregg-video-2.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 47%",
      // holdAt: 3.0, // end on the red IDI / GITLAB.ORG lockup instead
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video-2.webm`,
    },
    {
      name: "easteregg-video-3.webm",
      kind: "video",
      wordmark: true,
      focus: "100% 42%", // its lockup hugs the right edge of the frame
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video-3.webm`,
    },
    {
      name: "video3.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%", // crest + IDI, centred on black
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video3.webm`,
    },
    {
      name: "video4.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%", // cube burst, then a faint IDI on near-black
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video4.webm`,
    },
    // stills: copy sits bottom-right; only the collage has no name in it, so it
    // is the one state that shows the <h1>
    {
      name: "homepage-community-background-v4.webp",
      kind: "image",
      wordmark: true,
      focus: "50% 42%",
      label: "community backdrop",
      src: "/assets/homepage-community-background-v4.webp",
    },
    {
      name: "idi-member-collage.webp",
      kind: "image",
      wordmark: false,
      focus: "46% 54%",
      label: "member collage",
      src: "/assets/idi-member-collage.webp",
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
  const lowEnd = Boolean(window.IDI_LOW_END);
  const lucky = isHome && !lowEnd && !reducedMotion && Math.floor(Math.random() * ROLL_ODDS) === 0;
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
    soundButton.setAttribute("aria-label", "Background sound");
    soundButton.textContent = "\u{1F507}";

    soundButton.addEventListener("click", () => {
      video.muted = !video.muted;
      if (!video.muted) video.play().catch(() => {});
      soundButton.setAttribute("aria-pressed", String(!video.muted));
      soundButton.textContent = video.muted ? "\u{1F507}" : "\u{1F50A}";
    });

    return soundButton;
  };

  // ------------------------------------------------------------- scheduling
  // The rotation's local stills are ~50 KB; the remote clips are megabytes. A
  // clip is therefore requested only after the document has finished loading and
  // the browser has nothing better to do, so it never competes with the hero's
  // first paint. The stylesheet background (and the hero copy above it) stays
  // visible in the meantime, which is the same state a slow clip already left on
  // screen. Returns immediately if the page is already idle.
  const whenIdle = (run) => {
    const schedule = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2500 });
      else window.setTimeout(run, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
  };

  // ---------------------------------------------------------------- videos
  const mountVideo = (sources, { name, playOut, holdAt, log, onGiveUp }) => {
    const video = document.createElement("video");
    video.className = "egg-video";
    video.preload = "metadata";
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

  // On constrained devices, keep the dedicated egg route useful without
  // silently starting its 74 MB download. The button is an explicit opt-in.
  if (isEggRoute && lowEnd) {
    const still = BACKGROUNDS.find((item) => item.name === "homepage-community-background-v4.webp");
    document.documentElement.dataset.frame = "image";
    document.documentElement.dataset.wordmark = still.wordmark ? "yes" : "no";
    document.documentElement.style.setProperty("--focus", still.focus);
    mountImage(still);

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "button button-glass egg-play-original";
    playButton.textContent = "Play the original 74 MB clip";
    playButton.addEventListener("click", () => {
      playButton.remove();
      mountVideo(EGG_SOURCES, {
        name: "easteregg-video.webm",
        log: () => "🦆 /easteregg - the original clip was requested.",
        onGiveUp: () => giveUp("easter egg clip"),
      });
    }, { once: true });
    body.append(playButton);
    return;
  }

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
  // Normally the backdrop was already chosen by the head script (index.html),
  // before the first layout - this script mounts that pick, so nothing moves once
  // the page is visible. Reduced motion gets stills; low-power devices use the
  // smallest local still only. The roll below is the fallback for a page that
  // has no head pick: random per visit, never the same media twice in a row.
  const applyFrameState = (item) => {
    // The frame state lives on <html> so the head pick and this fallback agree.
    const root = document.documentElement;
    root.dataset.frame = item.kind; // video | image
    root.dataset.wordmark = item.wordmark ? "yes" : "no";
    root.style.setProperty("--focus", item.focus || "50% 50%");
  };

  const headPick = Number(window.IDI_BACKDROP);
  let pick;
  if (Number.isInteger(headPick) && BACKGROUNDS[headPick]) {
    pick = BACKGROUNDS[headPick];
    applyFrameState(pick);
  } else {
    const pool = lowEnd
      ? [BACKGROUNDS.find((item) => item.name === "homepage-community-background-v4.webp")]
      : reducedMotion
        ? BACKGROUNDS.filter((item) => item.kind === "image")
        : BACKGROUNDS;

    let index = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && pool[index].name === readLast()) {
      index = (index + 1) % pool.length;
    }
    pick = pool[index];

    // The hero adapts to what is behind it: videos park the copy top-left, stills
    // bottom-right, and the <h1> only shows for a backdrop with no name in it.
    applyFrameState(pick);
  }

  if (pick.kind === "image") {
    mountImage(pick);
  } else {
    // A clip that will not load (cold URL, network blip) is replaced by one of
    // the local stills rather than a blank page.
    const stills = BACKGROUNDS.filter((item) => item.kind === "image");
    // data-frame is already applied above, so the hero copy is in its final
    // place; only the clip itself waits for the browser to go idle.
    whenIdle(() =>
      mountVideo([pick.src], {
        name: pick.name,
        playOut: true,
        holdAt: pick.holdAt,
        log: () => `\u{1F95A} background: ${pick.label} (this visit's pick)`,
        onGiveUp: () => {
          // A clip that never arrives is replaced by a still - and the layout
          // follows that still, not the clip that failed.
          const still = stills[Math.floor(Math.random() * stills.length)];
          applyFrameState(still);
          mountImage(still);
        },
      })
    );
  }
})();
