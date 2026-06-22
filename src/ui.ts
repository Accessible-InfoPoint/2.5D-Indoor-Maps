import type { GeoMap } from "./components/geoMap";
import UserProfileModal from "./components/ui/userProfileModal/userProfileModal";
import SearchForm from "./components/ui/searchForm";
import ZoomControl from "./components/ui/zoomControl";
import WheelchairModeControl from "./components/ui/wheelchairModeControl";
import Switch2DControl from "./components/ui/switch2DControl";

export function setupUi(geoMap: GeoMap): void {
  SearchForm.render(geoMap);
  UserProfileModal.render();
  ZoomControl.setup(geoMap);
  WheelchairModeControl.setup();
  Switch2DControl.setup(geoMap);
}
