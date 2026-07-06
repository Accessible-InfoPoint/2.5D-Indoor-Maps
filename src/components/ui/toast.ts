import { Toast } from "bootstrap";

import { getRequiredElement } from "../../utils/domHelpers";
import { lang } from "../../services/languageService";

function render(message: string): void {
  const toastDiv = document.createElement("div");
  toastDiv.classList.add("toast", "align-items-center");
  toastDiv.setAttribute("role", "alert");
  toastDiv.setAttribute("aria-live", "assertive");
  toastDiv.setAttribute("aria-atomic", "true");
  toastDiv.innerHTML =
    '  <div class="d-flex">' +
    '<div class="toast-body">\n' +
    message +
    "</div>" +
    '<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>\n' +
    "</div>";

  const closeButton = toastDiv.querySelector(".btn-close");
  if (closeButton instanceof HTMLElement) {
    closeButton.ariaLabel = lang.closeButton;
    closeButton.title = lang.closeButton;
  }

  getRequiredElement("toastWrapper").appendChild(toastDiv);

  new Toast(toastDiv, { animation: false }).show();
}
export default {
  render,
};
