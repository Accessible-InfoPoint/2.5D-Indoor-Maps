import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";

function create(geoMap: GeoMap): void {
  const button = document.createElement("button");
  button.className = "square";
  button.id = "centeringButton";
  button.ariaLabel = lang.centeringButton;
  button.title = lang.centeringButton;
  button.onclick = () => geoMap.centerMapToBuilding();

  const icon = document.createElement("span");
  icon.className = "material-icons";
  icon.ariaHidden = "true";
  icon.innerText = "center_focus_weak";
  button.appendChild(icon);

  const indoorSearch = getRequiredElement("indoorSearchWrapper");
  indoorSearch.insertBefore(button, indoorSearch.firstChild);
}

export default {
  create,
};
