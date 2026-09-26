import { getRequiredElement } from "../../utils/domHelpers";
import OverlayExclusivityService from "../../services/overlayExclusivityService";
import PopoverClampControl from "./popoverClampControl";

export interface PopoverOptions {
  triggerId: string | string[];
  panelId: string;
  // Defaults to true. Set false for a popover whose open/closed state should
  // persist through interactions elsewhere on the page (e.g. the mobile
  // description card, which stays open across room/level selection instead
  // of being dismissed by outside clicks). This also exempts the popover
  // from the shared overlay-exclusivity mechanism: only its own trigger's
  // click controls its state.
  closeOnOutsideClick?: boolean;
}

export interface PopoverController {
  panelId: string;
  isOpen(): boolean;
  open(): void;
  close(): void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function setupPopover(options: PopoverOptions): PopoverController {
  const triggerIds = Array.isArray(options.triggerId) ? options.triggerId : [options.triggerId];
  const triggers = triggerIds.map((id) => getRequiredElement(id));
  const panel = getRequiredElement(options.panelId);
  const closeOnOutsideClick = options.closeOnOutsideClick ?? true;

  triggers.forEach((trigger) => {
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-controls", options.panelId);
    trigger.setAttribute("aria-expanded", "false");
  });

  if (!panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }

  let open = false;

  const controller: PopoverController = {
    panelId: options.panelId,
    isOpen: () => open,
    open: () => setOpen(true),
    close: () => setOpen(false),
  };

  if (closeOnOutsideClick) {
    OverlayExclusivityService.registerOverlay(options.panelId, () => setOpen(false));
  }

  function setOpen(nextOpen: boolean, flags: { returnFocus?: boolean } = {}): void {
    if (nextOpen === open) return;

    if (nextOpen && closeOnOutsideClick) {
      OverlayExclusivityService.notifyOpened(options.panelId);
    }

    open = nextOpen;
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", open.toString()));
    panel.classList.toggle("open", open);

    if (open) {
      PopoverClampControl.applyPositionFallback(options.panelId);
      focusFirstFocusable(panel);
    } else {
      panel.classList.remove("centered");
      if (flags.returnFocus) {
        const visibleTrigger = triggers.find(isVisible) ?? triggers[0];
        visibleTrigger.focus();
      }
    }
  }

  triggers.forEach((trigger) => trigger.addEventListener("click", () => setOpen(!open)));

  document.addEventListener("click", (event) => {
    if (!open || !closeOnOutsideClick) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (triggers.some((trigger) => trigger.contains(target)) || panel.contains(target)) return;
    setOpen(false);
  });

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false, { returnFocus: true });
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event, panel);
    }
  });

  return controller;
}

export function closeAllPopovers(): void {
  OverlayExclusivityService.closeAll();
}

// `offsetParent !== null` is the usual way to detect `display: none`, but jsdom's
// offsetParent getter unconditionally returns null for every element, so it can't be
// exercised by this project's Jest unit tests. getComputedStyle's display resolution
// is implemented in jsdom (at least for inline styles), so use that instead: it's
// correct in a real browser and actually testable here.
function isVisible(element: HTMLElement): boolean {
  return getComputedStyle(element).display !== "none";
}

function focusFirstFocusable(panel: HTMLElement): void {
  // Some panel children (e.g. the level-shift buttons when there's nowhere further
  // to shift) are `display: none`. Calling .focus() on those is a silent no-op, so
  // skip past them to the first child that's actually rendered and focusable.
  const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(
    isVisible,
  );
  (focusable ?? panel).focus();
}

function trapFocus(event: KeyboardEvent, panel: HTMLElement): void {
  const focusableElements = Array.from(
    panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(isVisible);

  if (focusableElements.length === 0) return;

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
