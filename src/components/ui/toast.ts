import { Toast } from "bootstrap";

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
    '<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>\n' +
    "</div>";

  document.getElementById("toastWrapper").appendChild(toastDiv);

  new Toast(toastDiv, { animation: false }).show();
}
export default {
  render,
};
