/* The duck easter egg, and the rotating homepage background.
 *
 * Background: index.html chooses the visit's frame before styles are applied,
 * so the hero copy never moves. Keep this payload table index-aligned with that
 * head list. The existing rotation choices remain intact; video5 through
 * video16 are appended from idi-assets, and the original egg clip is a
 * normal cycle entry too. The epic IDI logo stays separate and rare.
 * Reduced-motion visitors get stills only; low-power visitors
 * keep the smallest local still and never auto-download a clip. Ordinary
 * backgrounds never repeat on consecutive visits.
 *
 * The epic IDI logo is a separate 1/1000 static surprise, not an everyday pick.
 * The original egg clip used to be the matching 1/1000 video surprise; it is
 * an ordinary rotation pick now. /easteregg shows the actual egg instead: the
 * epic logo collage. Normal rotation clips play once and hold their frame.
 *
 * Videos start muted so autoplay is allowed everywhere; a small toggle in the
 * corner enables sound while one is on screen. If nothing can be shown,
 * the script backs out and leaves the stylesheet background in place.
 */
(() => {
  const ASSET_REPO = "https://gitlab.com/international-duck-incorporated/idi-assets";
  const ASSET_REF = "main"; // pin to a commit sha or tag for an immutable URL
  const ASSET_DIR = "/assets/website/"; // bundle layout since October 2026
  const EGG_PINNED_FALLBACK =
    "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/e8e147d6aed5f32291ea05dc4cd64541fa1b973a/gitlab/home/assets/easteregg-video.webm";

  // Homepage background pool. Videos and the rare logo stream from the canonical
  // asset bundle; the two ordinary stills are local. The original egg clip is an
  // ordinary rotation pick too, with a pinned-URL fallback.
  const BACKGROUNDS = [
    // videos: the clip ends on the wordmark, so the copy sits top-left and the
    // <h1> hides - the backdrop is already saying the name
    {
      name: "easteregg-video-2.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 47%",
      holdAt: 4.0, // red IDI / GITLAB.ORG end card
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video-2.webm`,
    },
    {
      name: "easteregg-video-3.webm",
      kind: "video",
      wordmark: true,
      focus: "100% 42%", // its lockup hugs the right edge of the frame
      holdAt: 4.0, // PS3-style wave; holds the bright blue IDI + org-name peak
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video-3.webm`,
    },
    {
      name: "video3.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%", // crest + IDI, centred on white
      holdAt: 4.0, // seal end card
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video3.webm`,
    },
    {
      name: "video4.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%", // cube burst, then a faint IDI on near-black
      holdAt: 2.0, // burst + bright org name; the tail fades out
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
      src: "/assets/homepage-community-background-v4.webp?v=5bf5c6cf",
    },
    {
      name: "idi-member-collage.webp",
      kind: "image",
      wordmark: false,
      focus: "46% 54%",
      label: "member collage",
      src: "/assets/idi-member-collage.webp?v=05e81b3e",
    },
    // Newly uploaded video backgrounds, appended without disturbing older picks.
    {
      name: "video5.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 4.0, // bright blue wordmark peak
      label: "IDI wordmark clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video5.webm`,
    },
    {
      name: "video6.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 4.0, // full IDI + lamp; the end card loses an I
      label: "IDI lamp clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video6.webm`,
    },
    // The live 3D block field, ported from the team's React + three.js demo to
    // a dependency-free WebGL module (block-field.js). Nothing to download:
    // every texture is painted at boot. No wordmark in it, so the <h1> shows.
    {
      name: "block-field",
      kind: "blocks",
      wordmark: false,
      focus: "50% 50%",
      label: "3D block field, rendered live",
    },
    // video7: Fox homage; holds the wide 20s lockup + tagline (the very tail
    // fades out).
    {
      name: "video7.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 20.0,
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video7.webm`,
    },
    // The original egg clip, promoted to a standard rotation pick.
    {
      name: "easteregg-video.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 22.0, // pulled-back IDI on earth + tagline; the very tail fades to black
      label: "the original clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}easteregg-video.webm`,
      fallbackSrc: EGG_PINNED_FALLBACK,
    },
    // video8: SEGA-style white IDI card for the first half, then black; holds
    // the card instead of the tail.
    {
      name: "video8.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 2.0,
      label: "sega-style IDI card, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video8.webm`,
    },
    // video9: Paramount-style mountain intro; holds the full 18s lockup (the
    // clip fades to black).
    {
      name: "video9.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 42%",
      holdAt: 18.0,
      label: "paramount-style mountain intro, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video9.webm`,
    },
    // video10: static resolves into the GITLAB ORGANISATION card; holds the
    // card.
    {
      name: "video10.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 4.0,
      label: "gitlab organisation card, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video10.webm`,
    },
    // video11: glowing org seal; holds the late crisp seal (legible, no blowout).
    {
      name: "video11.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 9.0,
      label: "the glowing seal clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video11.webm`,
    },
    // video12: Warner Bros-style cloud intro and shield; holds the centered
    // shield lockup.
    {
      name: "video12.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 12.0,
      label: "warner bros-style shield intro, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video12.webm`,
    },
    // video13: shimmering gold particle field with org seal and title; holds
    // the resolved seal and wordmark.
    {
      name: "video13.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 10.0,
      label: "golden particle seal clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video13.webm`,
    },
    {
      name: "video14.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 11.0,
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video14.webm`,
    },
    {
      name: "video15.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 5.2, // full red/grey IDI lockup; 4.5s is only the red I
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video15.webm`,
    },
    {
      name: "video16.webm",
      kind: "video",
      wordmark: true,
      focus: "50% 50%",
      holdAt: 5.5,
      label: "clip, plays out in full",
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}video16.webm`,
    },
    // Not part of the regular pool; fetched from the canonical idi-assets repo
    // only when index.html selects the 1/1000 surprise.
    {
      name: "epic_idi_logo.png",
      kind: "image",
      wordmark: true,
      focus: "50% 50%",
      label: "epic IDI logo",
      rare: true,
      src: `${ASSET_REPO}/-/raw/${ASSET_REF}${ASSET_DIR}epic_idi_logo.png`,
    },
  ];

  const LAST_KEY = "idi-bg-last";

  const path = (location.pathname || "/").replace(/\/+$/, "").replace(/\.html$/, "") || "/";

  const isEggRoute = path.endsWith("/easteregg");
  const isHome = document.body.dataset.page === "organization" && !isEggRoute;

  if (!isEggRoute && !isHome) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowEnd = Boolean(window.IDI_LOW_END);
  const hasHeadRareEvent = Object.prototype.hasOwnProperty.call(window, "IDI_RARE_EVENT");
  const rareEvent = isHome && hasHeadRareEvent ? window.IDI_RARE_EVENT : "";
  const egg = isEggRoute;

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
  // Still images are local, optimized WebP files; video clips range from a few
  // megabytes to much larger remote media. Request video only after the document
  // has finished loading and the browser has nothing better to do, so it never
  // competes with the hero's first paint. The stylesheet background (and hero
  // copy) stays visible until the selected media can paint.
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
    video.loop = !playOut; // rotation clips settle; the on-demand egg-route play loops
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
  const mountImage = ({ name, src, fallbackSrc, label }) => {
    const photo = document.createElement("img");
    photo.className = "egg-photo";
    photo.alt = "";
    photo.setAttribute("aria-hidden", "true");
    photo.setAttribute("decoding", "async");

    const sources = [src, fallbackSrc].filter(Boolean);
    let sourceIndex = 0;

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

    photo.addEventListener("error", () => {
      sourceIndex += 1;
      if (sources[sourceIndex]) {
        photo.src = sources[sourceIndex];
        return;
      }
      photo.remove();
      giveUp(name);
    });

    photo.src = sources[0];
    body.append(photo);
  };

  // ------------------------------------------------------------ blocks
  // The live WebGL block field. It paints procedurally, so there is nothing
  // to wait for: the first rendered frame reveals it. No WebGL (or a lost
  // context at boot) falls back to a local still, like a clip that never
  // arrives.
  const mountBlocks = (pick) => {
    const canvas = document.createElement("canvas");
    canvas.className = "egg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    body.append(canvas);
    const handle =
      window.IDIBlockField &&
      window.IDIBlockField.mount(canvas, { reducedMotion: reducedMotion }, () => {
        writeLast(pick.name);
        reveal(canvas, () =>
          console.log(`\u{1F95A} background: ${pick.label} (this visit's pick)`)
        );
      });
    if (!handle) {
      canvas.remove();
      const stills = BACKGROUNDS.filter((item) => item.kind === "image" && !item.rare);
      const still = stills[Math.floor(Math.random() * stills.length)];
      applyFrameState(still);
      mountImage(still);
      return;
    }
    if (reducedMotion) handle.dispose(); // one painted frame, no loop
  };

  // ------------------------------------------------------------------ egg
  // The dedicated route shows the actual egg: the epic logo collage. The
  // original clip is an ordinary rotation pick now, so it no longer counts.
  if (egg) {
    const epic = BACKGROUNDS.find((item) => item.rare);
    document.documentElement.dataset.frame = epic.kind;
    document.documentElement.dataset.wordmark = epic.wordmark ? "yes" : "no";
    document.documentElement.style.setProperty("--focus", epic.focus || "50% 50%");
    mountImage({ ...epic, label: "the actual egg" });
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
  if (isHome && rareEvent === "epic-logo") {
    pick = BACKGROUNDS.find((item) => item.rare);
    applyFrameState(pick);
  } else if (Number.isInteger(headPick) && BACKGROUNDS[headPick]) {
    pick = BACKGROUNDS[headPick];
    applyFrameState(pick);
  } else {
    const ordinary = BACKGROUNDS.filter((item) => !item.rare);
    const pool = lowEnd
      ? [ordinary.find((item) => item.name === "homepage-community-background-v4.webp")]
      : reducedMotion
        ? ordinary.filter((item) => item.kind === "image")
        : ordinary;

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
  } else if (pick.kind === "blocks") {
    mountBlocks(pick);
  } else {
    // A clip that will not load (cold URL, network blip) is replaced by one of
    // the local stills rather than a blank page.
    const stills = BACKGROUNDS.filter((item) => item.kind === "image" && !item.rare);
    // data-frame is already applied above, so the hero copy is in its final
    // place; only the clip itself waits for the browser to go idle.
    whenIdle(() =>
      mountVideo([pick.src, pick.fallbackSrc].filter(Boolean), {
        name: pick.name,
        playOut: pick.playOut !== false,
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
