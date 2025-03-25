function removeShadowPane(): void {
  // const leafletShadows = document.getElementsByClassName("leaflet-shadow-pane");

  // [].forEach.call(leafletShadows, (shadow: Element) => {
  //   shadow.setAttribute("aria-hidden", "true");
  // });
}

function silenceZoomControls(): void {
  // const controls = document.getElementsByClassName("leaflet-control-zoom");
  // [].forEach.call(controls, (contol: Element) => {
  //   contol.setAttribute("role", "presentation");
  //   contol.setAttribute("aria-hidden", "true"); // dont read them out
  // });
}

function silenceCenteringButton(): void {
  // document
  //   .getElementById("centeringButton")
  //   .setAttribute("aria-hidden", "true");
}

function silenceTileImages(): void {
  // const mapTiles = document.getElementsByClassName("leaflet-tile");

  // [].forEach.call(mapTiles, (tile: Element) => {
  //   tile.setAttribute("role", "presentation");
  //   tile.setAttribute("aria-hidden", "true"); // dont read them out
  // });
}

function silenceMapMarkers(): void {
  // const leafletMarkers = document.getElementsByClassName("leaflet-clickable");

  // [].forEach.call(leafletMarkers, (marker: Element) => {
  //   marker.setAttribute("role", "button");
  // });
}

function silenceLeafletAttribution(): void {
  // document
  //   .getElementsByClassName("leaflet-control-attribution")[0]
  //   .setAttribute("aria-hidden", "true");
}

function silenceMapPane(): void {
  // document
  //   .getElementsByClassName("leaflet-pane leaflet-map-pane")[0]
  //   .setAttribute("aria-hidden", "true");
}

export default {
  removeShadowPane,
  silenceLeafletAttribution,
  silenceZoomControls,
  silenceMapMarkers,
  silenceTileImages,
  silenceMapPane,
  silenceCenteringButton,
};
