import { colors } from "../services/colorService";

let path: HTMLElement = null; //currentlySelectedFeaturePath
let fill = ""; //currentlySelectedFeatureOriginalFillColor

export function highlightSelectedPath(currentPath: HTMLElement): void {
  //change
  if (path !== null) {
    path.setAttribute("fill", fill);
  }

  path = currentPath;

  //no fill available
  if (path.getAttribute("fill") === "none") {
    path = null;
    return;
  }

  //store
  fill = path.getAttribute("fill");

  //change
  path.setAttribute("fill", colors.roomColorS);
}
