/**
 * @file overlays.js
 * Initializes top-layer `<dialog>` and `[popover]` progressive enhancement,
 * discrete display exit animations, light-dismiss fallbacks, and Docs modal sub-tabs.
 */

let supportsDisplayTransition;

function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay();
}

async function closeTopLayer(element) {
  if (!supportsTopLayerExit()) {
    element.setAttribute("data-closing", "");
    const animations = element.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map(a => a.finished)),
        new Promise(r => setTimeout(r, 2000)),
      ]);
    }
    if (!element.hasAttribute("data-closing")) return;
    element.removeAttribute("data-closing");
  }
  if (typeof element.close === "function" && element.open) {
    element.close();
  } else if (typeof element.hidePopover === "function") {
    element.hidePopover();
  }
}

/**
 * Sets up conditional polyfills for Invoker Commands / Popover API,
 * `<dialog closedby="any">` light-dismiss fallback, and Docs sub-tab switching.
 */
export function initOverlays() {
  if (!("commandForElement" in HTMLButtonElement.prototype)) {
    import("https://esm.run/invokers-polyfill").catch(() => {});
  }
  if (!("popover" in HTMLElement.prototype)) {
    import("https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js").catch(() => {});
  }

  const docsDialog = document.getElementById("docs-modal");
  if (docsDialog) {
    docsDialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeTopLayer(docsDialog);
    });

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const outside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      docsDialog.addEventListener("pointerdown", e => {
        pressedOutside = outside(e, docsDialog);
      });
      docsDialog.addEventListener("pointerup", e => {
        if (pressedOutside && outside(e, docsDialog)) {
          closeTopLayer(docsDialog);
        }
      });
    }
  }

  document.querySelectorAll(".docs-subtabs button[data-docsec]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetSec = btn.dataset.docsec;
      document.querySelectorAll(".docs-subtabs button[data-docsec]").forEach(b => {
        b.classList.toggle("on", b === btn);
      });
      document.querySelectorAll(".docs-section").forEach(sec => {
        sec.classList.toggle("hidden", sec.id !== `docsec-${targetSec}`);
      });
    });
  });
}
