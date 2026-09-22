/* In-app video. The point is not convenience, it is containment: a lesson that
 * hands you off to youtube.com has lost you to the sidebar, and the reader who
 * left to watch a five-minute clip does not come back.
 *
 * Three things do the containing:
 *   1. A <dialog>, so the page behind is inert and Escape works without us.
 *   2. youtube-nocookie.com, and nothing is requested from Google until someone
 *      actually presses play - opening a lesson costs zero third-party calls.
 *   3. The IFrame Player API, purely so we can catch ENDED and stop the video
 *      before its end screen offers three more. That end screen is the whole
 *      rabbit hole; a plain <iframe> cannot intercept it.
 */

import { el, mark } from "./util.js";
import { markStep } from "./steps.js";

const API = "https://www.youtube.com/iframe_api";
let apiState = null;   // null | Promise<YT>

/* Load the IFrame API once, lazily. Resolves to null if it never arrives - a
   blocked script must degrade to a plain embed, not to a dead dialog. */
function loadAPI() {
  if (apiState) return apiState;
  apiState = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const timer = setTimeout(() => resolve(null), 6000);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = API;
    s.async = true;
    s.onerror = () => { clearTimeout(timer); resolve(null); };
    document.head.appendChild(s);
  });
  return apiState;
}

const VARS = {
  autoplay: 1,
  rel: 0,                 // related videos restricted to the same channel
  modestbranding: 1,
  playsinline: 1,
  iv_load_policy: 3,      // no annotation overlays
  color: "white",
};
const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join("&");

let open = null;   // { dlg, player, restoreFocus }

export function closePlayer() {
  if (!open) return;
  const { dlg, player, restoreFocus } = open;
  open = null;
  try { player?.destroy?.(); } catch { /* already gone */ }
  dlg.close();
  dlg.remove();
  document.documentElement.style.overflow = "";
  restoreFocus?.focus?.();
}

/**
 * @param {{id:string,title:string,channel:string,duration:string,note?:string}} video
 * @param {Array} list  the lesson's full video list, for "next" on the end card
 * @param {string} lessonId  whose "watch a clip" step this clip satisfies, on ENDED
 */
export function openPlayer(video, list = [], lessonId = null) {
  closePlayer();
  const restoreFocus = document.activeElement;

  const dlg = el("dialog", "vp");
  dlg.setAttribute("aria-label", `Video: ${video.title}`);
  dlg.innerHTML =
    `<div class="vp__bar">` +
      `<span class="vp__ch">${video.channel}</span>` +
      `<span class="vp__dur">${video.duration}</span>` +
      `<button class="vp__x" type="button" aria-label="Close video">` +
        `<span>Close</span>` +
        `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11"/></svg>` +
      `</button>` +
    `</div>` +
    `<div class="vp__stage"><div class="vp__mount" id="vp-mount"></div></div>` +
    `<div class="vp__cap"><b>${video.title}</b>${video.note ? `<span>${video.note}</span>` : ""}</div>`;

  document.body.appendChild(dlg);
  document.documentElement.style.overflow = "hidden";
  dlg.showModal();
  dlg.querySelector(".vp__x").focus();

  dlg.querySelector(".vp__x").onclick = closePlayer;
  // Clicking the surround closes; clicking the plate itself must not.
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closePlayer(); });
  dlg.addEventListener("close", () => { if (open) closePlayer(); });   // Escape

  const stage = dlg.querySelector(".vp__stage");
  const mount = dlg.querySelector(".vp__mount");
  open = { dlg, player: null, restoreFocus };

  /* The end card. Reached by finishing the video, which is exactly the moment
     YouTube would otherwise hand over three thumbnails and a countdown. */
  const idx = list.findIndex((v) => v.id === video.id);
  const next = idx >= 0 ? list[idx + 1] : null;
  function showEnd() {
    stage.innerHTML = "";
    const end = el("div", "vp__end");
    end.innerHTML =
      `<p class="t-label">End of clip</p>` +
      `<div class="vp__acts">` +
        `<button type="button" data-a="back">${mark("left")}<span>Back to the lesson</span></button>` +
        (next ? `<button type="button" data-a="next"><span>${next.title}</span>${mark()}</button>` : "") +
      `</div>`;
    stage.appendChild(end);
    end.querySelector('[data-a="back"]').onclick = closePlayer;
    end.querySelector('[data-a="next"]')?.addEventListener("click", () => openPlayer(next, list, lessonId));
    end.querySelector("button").focus();
  }

  loadAPI().then((YT) => {
    if (!open || open.dlg !== dlg) return;          // closed while loading
    if (!YT?.Player) {                              // degraded: plain embed
      /* A plain iframe cannot report ENDED, so the step is credited on open.
         Better to be generous than to leave a reader whose network blocks the
         API with a chapter they can never finish. */
      if (lessonId) markStep(lessonId, "video");
      mount.outerHTML =
        `<iframe class="vp__frame" src="https://www.youtube-nocookie.com/embed/${video.id}?${qs(VARS)}"` +
        ` title="${video.title}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture"` +
        ` referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      return;
    }
    open.player = new YT.Player(mount, {
      videoId: video.id,
      host: "https://www.youtube-nocookie.com",
      playerVars: VARS,
      events: {
        onReady: (e) => { e.target.getIframe()?.classList.add("vp__frame"); e.target.playVideo(); },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) {
            try { e.target.stopVideo(); } catch {}
            /* ENDED, not "opened" - the chapter asks you to watch one, and this
               is the only honest signal of that we get. Any one clip in the
               chapter satisfies it; the strict rule is stated on the list. */
            if (lessonId) markStep(lessonId, "video");
            showEnd();
          }
        },
        onError: showEnd,
      },
    });
  });
}
