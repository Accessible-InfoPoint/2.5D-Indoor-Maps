import { UserGroupEnum } from "../../models/userGroupEnum";
import UserService from "../../services/userService";
import LevelControl from "./levelControl";
import { getRequiredElement } from "../../utils/domHelpers";

const wheelchairModeKey = "wheelchairMode";

function setup(onSettingsChanged: () => void, onLayoutChanged: () => void): void {
  const uiWrapper = getRequiredElement("uiWrapper");
  const levelControl = getRequiredElement("levelControl");
  const indoorSearchWrapper = getRequiredElement("indoorSearchWrapper");

  getRequiredElement("switchWheelchairMode").onclick = () => {
    levelControl.classList.remove("transition");
    
    uiWrapper.classList.toggle("wheelchairMode");
    localStorage.setItem(wheelchairModeKey, uiWrapper.classList.contains("wheelchairMode").toString());
    if (uiWrapper.classList.contains("wheelchairMode")) {
      if (UserService.getCurrentProfile() != UserGroupEnum.wheelchairUsers) {
        UserService.setProfile(UserGroupEnum.wheelchairUsers);
        onSettingsChanged();
      }
    }
    replaceIcons();

    LevelControl.setWindow();
    LevelControl.setMargin();
    setTimeout(() => {
      levelControl.classList.add("transition");
    }, 200)

    if (uiWrapper.classList.contains("wheelchairMode")) {
      setIndoorSearchWheelchairLayout();
    } else {
      indoorSearchWrapper.style.removeProperty("left");
      indoorSearchWrapper.style.removeProperty("right");
    }

    onLayoutChanged();
  };

  if (localStorage.getItem(wheelchairModeKey) == "true") {
    uiWrapper.className = "wheelchairMode";
    setTimeout(() => {
      setIndoorSearchWheelchairLayout();
      onLayoutChanged();
    }, 200)
  }

  replaceIcons();
}

function replaceIcons(): void {
  const switchWheelchairModeIcon = getRequiredElement<HTMLImageElement>("switchWheelchairModeIcon");
  const levelShiftUpLabel = getRequiredElement("levelShiftUpLabel");
  const levelShiftDownLabel = getRequiredElement("levelShiftDownLabel");

  if (getRequiredElement("uiWrapper").classList.contains("wheelchairMode")) {
    switchWheelchairModeIcon.src = "\\images\\screen_all.svg";
    levelShiftUpLabel.innerHTML = "chevron_left";
    levelShiftDownLabel.innerHTML = "navigate_next";
  } else {
    switchWheelchairModeIcon.src = "\\images\\screen_bottom.svg";
    levelShiftUpLabel.innerHTML = "expand_less";
    levelShiftDownLabel.innerHTML = "expand_more";
  }
}

function setIndoorSearchWheelchairLayout(): void {
  const indoorSearchWrapper = getRequiredElement("indoorSearchWrapper");
  const levelControlWrapper = getRequiredElement("levelControlWrapper");
  const quickSettingsWrapper = getRequiredElement("quickSettingsWrapper");

  indoorSearchWrapper.style.left = (levelControlWrapper.offsetLeft + levelControlWrapper.offsetWidth + 15 + 12) + "px";
  indoorSearchWrapper.style.right = (document.body.clientWidth - quickSettingsWrapper.offsetLeft + 15 + 50) + "px";
}

export default {
  setup,
};
