import type { GeoMap } from "../geoMap";
import { getRequiredElement } from "../../utils/domHelpers";

function setup(geoMap: GeoMap): void {
  getRequiredElement("zoomControlIn").onclick = () => {
    geoMap.camera.zoomBy(0.33);
  };
  getRequiredElement("zoomControlOut").onclick = () => {
    geoMap.camera.zoomBy(-0.33);
  };
}

export default {
  setup,
};
