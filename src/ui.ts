import UserProfileModal from "./components/ui/userProfileModal/userProfileModal";
import SearchForm from "./components/ui/searchForm";
import ZoomControl from "./components/ui/zoomControl";
import WheelchairModeControl from "./components/ui/wheelchairModeControl";
import Switch2DControl from "./components/ui/switch2DControl";

document.addEventListener("DOMContentLoaded", function () {
  SearchForm.render();
  UserProfileModal.render();
  ZoomControl.setup();
  WheelchairModeControl.setup();
  Switch2DControl.setup();
});
