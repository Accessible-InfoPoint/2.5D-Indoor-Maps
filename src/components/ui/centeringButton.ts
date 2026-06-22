import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";

function create(geoMap: GeoMap): void {
  const button = document.createElement("button");
  button.className = "square";
  button.id = "centeringButton";
  button.onclick = () => geoMap.centerMapToBuilding();
  button.innerHTML = '<span aria-label="' + lang.centeringButton + '" title="' + lang.centeringButton + '"><i class="material-icons">center_focus_weak</i></span>';

  const indoorSearch = getRequiredElement("indoorSearchWrapper");
  indoorSearch.insertBefore(button, indoorSearch.firstChild);
}

export default {
  create,
};
