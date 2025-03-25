import { geoMap } from "../../main";

function setup(): void {
  document.getElementById("zoomControlIn").onclick = () => {
    geoMap.mapInstance.setZoom(geoMap.mapInstance.getZoom() + 0.33);
  };
  document.getElementById("zoomControlOut").onclick = () => {
    geoMap.mapInstance.setZoom(geoMap.mapInstance.getZoom() - 0.33);
  };
}

export default {
  setup,
};
