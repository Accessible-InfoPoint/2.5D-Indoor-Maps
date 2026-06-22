import { geoMap } from "../../main";
import { getRequiredElement } from "../../utils/domHelpers";

function setup(): void {
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
