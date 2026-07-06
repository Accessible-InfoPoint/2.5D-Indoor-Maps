import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";

function setup(geoMap: GeoMap): void {
  const button = getRequiredElement<HTMLButtonElement>("centeringButton");
  button.ariaLabel = lang.centeringButton;
  button.title = lang.centeringButton;
  button.onclick = () => geoMap.centerMapToBuilding();
}

export default {
  setup,
};
