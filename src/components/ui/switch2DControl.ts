import type { GeoMap } from "../geoMap";
import { LEVEL_HEIGHT, OPACITY_TRANSLUCENT_LAYER } from "../../../public/strings/settings.json"
import BackendService from "../../services/backendService";
import { MapCamera, MapCenter } from "../map/mapCamera";
import { getRequiredElement } from "../../utils/domHelpers";
import { getRequiredArrayValue, getRequiredMapValue } from "../../utils/requiredHelpers";
import LoadingIndicator from "./loadingIndicator";
import { lang } from "../../services/languageService";
import { getMotionDuration } from "../../utils/motionPreferences";

function setup(geoMap: GeoMap): void {
  const switch2DButton = getRequiredElement("switch2D") as HTMLButtonElement;
  const switch2DLabel = getRequiredElement("switch2DLabel");
  updateSwitch2DPressedState(switch2DButton, geoMap.flatMode);
  let switchInProgress = false;

  switch2DButton.onclick = async () => {
    if (switchInProgress) {
      return;
    }

    const nextFlatMode = !geoMap.flatMode;

    if (!nextFlatMode) {
      switchInProgress = true;
      switch2DButton.disabled = true;
      switch2DButton.setAttribute("aria-busy", "true");

      try {
        await geoMap.preload3DView();
      } catch (error: unknown) {
        console.error(error);
        LoadingIndicator.error("Could not load the 3D map view.");
        switch2DButton.disabled = false;
        switch2DButton.removeAttribute("aria-busy");
        switchInProgress = false;
        return;
      }

      switch2DButton.disabled = false;
      switch2DButton.removeAttribute("aria-busy");
      switchInProgress = false;
    }

    geoMap.flatMode = nextFlatMode;
    updateSwitch2DPressedState(switch2DButton, geoMap.flatMode);
    const animationDuration = getMotionDuration(0.5);

    if (geoMap.flatMode) {
      switch2DLabel.innerHTML = "3d_rotation";
      geoMap.camera.setInteractionOptions({
        dragRotate: false,
        dragPan: true,
        switchDragButton: false,
        zoomInCenter: false,
      });
      geoMap.refreshMapViewportConstraints();
      let offset = 0;
      // if we are on the highest level, don't show anything above
      // TODO: move to own function, like "isTopLevel" and "isBottomLevel"
      if (BackendService.getAllLevels().indexOf(geoMap.getCurrentLevel()) == BackendService.getAllLevels().length - 1) {
        getCurrentIndoorLevel(geoMap).animateAltitude(0, 0, 1, 1, animationDuration);
        offset = 1;
      } else {
        getCurrentIndoorLevel(geoMap).animateAltitude(LEVEL_HEIGHT, 0, 1, 1, animationDuration);
        getAdjacentIndoorLevel(geoMap, 1).animateAltitude(0, 0, OPACITY_TRANSLUCENT_LAYER, 0, animationDuration)
        .then(() => {
          getAdjacentIndoorLevel(geoMap, 1).hideAll();
        });
      }

      // if we are on the lowest level, don't show anything below
      if (BackendService.getAllLevels().indexOf(geoMap.getCurrentLevel()) >= 1) {
        getAdjacentIndoorLevel(geoMap, -1).animateAltitude((2-offset)*LEVEL_HEIGHT, (3-offset)*LEVEL_HEIGHT, OPACITY_TRANSLUCENT_LAYER, 0, animationDuration)
        .then(() => {
          getAdjacentIndoorLevel(geoMap, -1).hideAll();
        });
      }

      getCurrentIndoorLevel(geoMap).show2DView();

      const currentCameraPosition = geoMap.camera.getPosition();
      
      animate(geoMap.camera, {
        centerStart: currentCameraPosition.center,
        centerEnd: currentCameraPosition.center,
        bearingStart: currentCameraPosition.bearing,
        bearingEnd: geoMap.standardBearing,
        pitchStart: currentCameraPosition.pitch,
        pitchEnd: 0,
        zoomStart: currentCameraPosition.zoom,
        // zoomEnd: wheelchair mode ? geoMap.standardZoomWheelchairMode : geoMap.standardZoom
        zoomEnd: geoMap.standardZoom
      }, animationDuration)
    } else {
      switch2DLabel.innerHTML = "map";
      geoMap.camera.setInteractionOptions({
        dragRotate: true,
        // dragPitch: true, // temp
        // dragRotatePitch: true // temp
        dragPan: false,
        switchDragButton: true,
        zoomInCenter: true,
      })

      const visibleLayers = [geoMap.getCurrentLevel()];

      getCurrentIndoorLevel(geoMap).show3DView();

      let offset = 0;
      // if we are on the highest level, don't show anything above
      if (BackendService.getAllLevels().indexOf(geoMap.getCurrentLevel()) == BackendService.getAllLevels().length - 1) {
        getCurrentIndoorLevel(geoMap).animateAltitude(0, 0, 1, 1, animationDuration);
        offset = 1;
      } else {
        getCurrentIndoorLevel(geoMap).animateAltitude(0, LEVEL_HEIGHT, 1, 1, animationDuration);
        getAdjacentIndoorLevel(geoMap, 1).show3DView();
        visibleLayers.push(getAdjacentLevel(geoMap, 1))
        getAdjacentIndoorLevel(geoMap, 1).animateAltitude(0, 0, 0, OPACITY_TRANSLUCENT_LAYER, animationDuration);
      }

      // if we are on the lowest level, don't show anything below
      if (BackendService.getAllLevels().indexOf(geoMap.getCurrentLevel()) >= 1) {
        getAdjacentIndoorLevel(geoMap, -1).show3DView();
        visibleLayers.push(getAdjacentLevel(geoMap, -1))
        getAdjacentIndoorLevel(geoMap, -1).animateAltitude((3-offset)*LEVEL_HEIGHT, (2-offset)*LEVEL_HEIGHT, 0, OPACITY_TRANSLUCENT_LAYER, animationDuration);
      }
      BackendService.getAllLevels().filter(item => !visibleLayers.includes(item)).forEach(item => {
        getIndoorLevel(geoMap, item).hideAll();
      })

      const currentCameraPosition = geoMap.camera.getPosition();

      animate(geoMap.camera, {
        centerStart: currentCameraPosition.center,
        centerEnd: {
          x: geoMap.standardCenter[0],
          y: geoMap.standardCenter[1],
        },
        bearingStart: currentCameraPosition.bearing,
        bearingEnd: geoMap.standardBearing3DMode,
        pitchStart: currentCameraPosition.pitch,
        pitchEnd: geoMap.standardPitch3DMode,
        zoomStart: currentCameraPosition.zoom,
        zoomEnd: geoMap.standardZoom3DMode
      }, animationDuration).then(() => {
        geoMap.lockMapCenterToStandardCenter();
      })
    }
  };
}

interface AnimationOptions {
  centerStart: MapCenter,
  centerEnd: MapCenter,
  bearingStart: number,
  bearingEnd: number,
  pitchStart: number,
  pitchEnd: number,
  zoomStart: number,
  zoomEnd: number
}

function getCurrentIndoorLevel(geoMap: GeoMap) {
  return getIndoorLevel(geoMap, geoMap.getCurrentLevel());
}

function getAdjacentIndoorLevel(geoMap: GeoMap, offset: number) {
  return getIndoorLevel(geoMap, getAdjacentLevel(geoMap, offset));
}

function getIndoorLevel(geoMap: GeoMap, level: number) {
  return getRequiredMapValue(geoMap.indoorLayers, level, "Indoor layers");
}

function getAdjacentLevel(geoMap: GeoMap, offset: number): number {
  const levels = BackendService.getAllLevels();
  const currentIndex = levels.indexOf(geoMap.getCurrentLevel());

  return getRequiredArrayValue(
    levels,
    currentIndex + offset,
    "Building levels"
  );
}

function animate(camera: MapCamera, options: AnimationOptions, duration = 0.5): Promise<void> {
  if (duration <= 0) {
    camera.setBearing(options.bearingEnd);
    camera.setPitch(options.pitchEnd);
    camera.setCenterAndZoom(options.centerEnd, options.zoomEnd);
    return Promise.resolve();
  }

  let startTime: number | null = null;
  const dir = ((options.bearingStart + 360) % 360) - ((options.bearingEnd + 360) % 360); // neg = clockwise, pos = counter-clockwise
  let bearingEnd = options.bearingEnd;
  if (dir < 0 && options.bearingStart > 0 && options.bearingEnd < 0) {
      bearingEnd = options.bearingEnd + 360;
  }
  if (dir > 0 && options.bearingStart < 0 && options.bearingEnd > 0) {
      bearingEnd = options.bearingEnd - 360;
  }

  function easeInOutCubic(x: number): number {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  return new Promise((resolve) => {
    function animateStep(time: number) {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000; // convert to seconds
      const progress = Math.min(elapsed / duration, 1);

      const bearing = options.bearingStart + easeInOutCubic(progress) * (bearingEnd - options.bearingStart);
      const pitch = options.pitchStart + easeInOutCubic(progress) * (options.pitchEnd - options.pitchStart);
      const centerX = options.centerStart.x + easeInOutCubic(progress) * (options.centerEnd.x - options.centerStart.x);
      const centerY = options.centerStart.y + easeInOutCubic(progress) * (options.centerEnd.y - options.centerStart.y);
      const zoom = options.zoomStart + easeInOutCubic(progress) * (options.zoomEnd - options.zoomStart);

      camera.setBearing(bearing);
      camera.setPitch(pitch);
      camera.setCenterAndZoom({ x: centerX, y: centerY }, zoom);

      if (progress < 1) {
          requestAnimationFrame(animateStep);
      } else {
          // Ensure the final state is set
          camera.setBearing(options.bearingEnd);
          camera.setPitch(options.pitchEnd);
          camera.setCenterAndZoom(options.centerEnd, options.zoomEnd);
          resolve();
      }
    }

    requestAnimationFrame(animateStep);
  });
}

function updateSwitch2DPressedState(button: HTMLElement, flatMode: boolean): void {
  button.setAttribute("aria-pressed", (!flatMode).toString());
  const label = flatMode ? lang.switch2DButton : lang.switchFlatButton;
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}


export default {
  setup,
};
