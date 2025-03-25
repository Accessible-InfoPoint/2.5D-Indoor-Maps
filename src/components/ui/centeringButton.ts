import { geoMap } from "../../main";
import { lang } from "../../services/languageService";

function create(): void {
  const button = document.createElement("button");
  button.className = "square";
  button.id = "centeringButton";
  button.onclick = () => geoMap.centerMapToBuilding();
  button.innerHTML = '<span aria-label="' + lang.centeringButton + '" title="' + lang.centeringButton + '"><i class="material-icons">center_focus_weak</i></span>';

  const indoorSearch = document.getElementById("indoorSearchWrapper");
  indoorSearch.insertBefore(button, indoorSearch.firstChild);
}

export default {
  create,
};
