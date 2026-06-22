import { geoMap } from "../../main";

function setup(): void {
  document.getElementById("zoomControlIn").onclick = () => {
    geoMap.camera.zoomBy(0.33);
  };
  document.getElementById("zoomControlOut").onclick = () => {
    geoMap.camera.zoomBy(-0.33);
  };
}

export default {
  setup,
};
