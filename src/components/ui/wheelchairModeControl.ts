import { UserGroupEnum } from "../../models/userGroupEnum";
import userService from "../../services/userService";
import LevelControl from "./levelControl";

const wheelchairModeKey = "wheelchairMode";

function setup(): void {
  document.getElementById("switchWheelchairMode").onclick = () => {
    document.getElementById("levelControl").classList.remove("transition");
    
    document.getElementById("uiWrapper").classList.toggle("wheelchairMode");
    localStorage.setItem(wheelchairModeKey, document.getElementById("uiWrapper").classList.contains("wheelchairMode").toString());
    if (document.getElementById("uiWrapper").classList.contains("wheelchairMode")) {
      if (userService.getCurrentProfile() != UserGroupEnum.wheelchairUsers) {
        userService.setProfile(UserGroupEnum.wheelchairUsers);
      }
    }
    replaceIcons();

    LevelControl.setWindow();
    LevelControl.setMargin();
    setTimeout(() => {
      document.getElementById("levelControl").classList.add("transition");
    }, 200)

    if (document.getElementById("uiWrapper").classList.contains("wheelchairMode")) {
      document.getElementById("indoorSearchWrapper").style.left = (document.getElementById('levelControlWrapper').offsetLeft + document.getElementById('levelControlWrapper').offsetWidth + 15 + 12) + "px";
      document.getElementById("indoorSearchWrapper").style.right = (document.body.clientWidth - document.getElementById('quickSettingsWrapper').offsetLeft + 15 + 50) + "px";
    } else {
      document.getElementById("indoorSearchWrapper").style.removeProperty("left");
      document.getElementById("indoorSearchWrapper").style.removeProperty("right");
    }

  };

  if (localStorage.getItem(wheelchairModeKey) == "true") {
    document.getElementById("uiWrapper").className = "wheelchairMode";
    setTimeout(() => {
      document.getElementById("indoorSearchWrapper").style.left = (document.getElementById('levelControlWrapper').offsetLeft + document.getElementById('levelControlWrapper').offsetWidth + 15 + 12) + "px";
      document.getElementById("indoorSearchWrapper").style.right = (document.body.clientWidth - document.getElementById('quickSettingsWrapper').offsetLeft + 15 + 50) + "px";
    }, 200)
  }

  replaceIcons();
}

function replaceIcons(): void {
  if (document.getElementById("uiWrapper").classList.contains("wheelchairMode")) {
    (document.getElementById("switchWheelchairModeIcon") as HTMLImageElement).src = "\\images\\screen_all.svg";
    document.getElementById("levelShiftUpLabel").innerHTML = "chevron_left";
    document.getElementById("levelShiftDownLabel").innerHTML = "navigate_next";
  } else {
    (document.getElementById("switchWheelchairModeIcon") as HTMLImageElement).src = "\\images\\screen_bottom.svg";
    document.getElementById("levelShiftUpLabel").innerHTML = "expand_less";
    document.getElementById("levelShiftDownLabel").innerHTML = "expand_more";
  }
}

export default {
  setup,
};
