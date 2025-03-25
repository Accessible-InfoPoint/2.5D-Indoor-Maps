import Toast from "./toast";

const loadingIndicator = document.getElementById("loadingIndicator");

function start(): void {
  loadingIndicator.classList.remove("text-danger");
  loadingIndicator.classList.add("text-primary");
  loadingIndicator.classList.remove("d-none");
}

function end(): void {
  loadingIndicator.classList.add("d-none");
}

function error(message: string): void {
  loadingIndicator.classList.remove("text-primary");
  loadingIndicator.classList.add("text-danger");
  setTimeout(end, 2000);

  Toast.render(message);
}

export default {
  start,
  end,
  error,
};
