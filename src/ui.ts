import type { GeoMap } from "./components/geoMap";
import UserProfileModal from "./components/ui/userProfileModal/userProfileModal";
import SearchForm from "./components/ui/searchForm";
import ZoomControl from "./components/ui/zoomControl";
import WheelchairModeControl from "./components/ui/wheelchairModeControl";
import Switch2DControl from "./components/ui/switch2DControl";
import Legend from "./components/ui/legend";
import MobileLayoutControl from "./components/ui/mobileLayoutControl";
import { translate } from "./utils/translate";

export function applyStoredUiLayout(): void {
  WheelchairModeControl.applyStoredLayout();
  MobileLayoutControl.applyStoredLayout();
}

export function setupUi(geoMap: GeoMap): void {
  const refreshSettings = () => {
    geoMap.refreshSettings();
    Legend.create();
    SearchForm.updateLabels();
    UserProfileModal.render(refreshSettings);
    translate();
    geoMap.refreshMapViewportConstraints(true);
    MobileLayoutControl.refresh(geoMap);
  };

  SearchForm.render(geoMap);
  UserProfileModal.render(refreshSettings);
  ZoomControl.setup(geoMap);
  WheelchairModeControl.setup(refreshSettings, () => geoMap.refreshMapViewportConstraints(true));
  Switch2DControl.setup(geoMap);
  MobileLayoutControl.setup(geoMap);
  geoMap.refreshMapViewportConstraints(true);
}
