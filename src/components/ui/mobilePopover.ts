import { getRequiredElement } from "../../utils/domHelpers";

export interface PopoverOptions {
  triggerId: string;
  panelId: string;
}

export interface PopoverController {
  panelId: string;
  isOpen(): boolean;
  open(): void;
  close(): void;
}

const registry: PopoverController[] = [];
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function setupPopover(options: PopoverOptions): PopoverController {
  const trigger = getRequiredElement(options.triggerId);
  const panel = getRequiredElement(options.panelId);

  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-controls", options.panelId);
  trigger.setAttribute("aria-expanded", "false");

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

  function setOpen(nextOpen: boolean, flags: { returnFocus?: boolean } = {}): void {
    if (nextOpen === open) return;

    if (nextOpen) {
      registry.forEach((other) => {
        if (other !== controller) other.close();
      });
    }

    open = nextOpen;
    trigger.setAttribute("aria-expanded", open.toString());
    panel.classList.toggle("open", open);

    if (open) {
      focusFirstFocusable(panel);
    } else if (flags.returnFocus) {
      trigger.focus();
    }
  }

  trigger.addEventListener("click", () => setOpen(!open));

  document.addEventListener("click", (event) => {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (trigger.contains(target) || panel.contains(target)) return;
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

  registry.push(controller);

  return controller;
}

export function closeAllPopovers(): void {
  registry.forEach((controller) => controller.close());
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
