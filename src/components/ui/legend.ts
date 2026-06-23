import ColorService from "../../services/colorService";
import { lang } from "../../services/languageService";
import { UserGroupEnum } from "../../models/userGroupEnum";
import UserService from "../../services/userService";
import { getRequiredElement } from "../../utils/domHelpers";

function create(): void {
  const legendList = getRequiredElement("legendList");
  legendList.innerHTML = "";

  const label = document.createElement("li");
  label.innerHTML = lang.legendLabel;
  label.ariaHidden = "true";
  label.className = "label";
  legendList.appendChild(label);
  legendList.ariaLabel = lang.legendLabel;
  const colors = ColorService.getCurrentColors();

  addLegendRecord(legendList, colors.roomColor, lang.legendRoom);
  addLegendRecord(legendList, colors.toiletColor, lang.legendToilet);
  addLegendRecord(legendList, colors.stairsColor, lang.legendStairs);
  addLegendRecord(legendList, colors.roomColorS, lang.legendSelected);

  // add wheelchair accessible to legend
  if (UserService.getCurrentProfile() == UserGroupEnum.wheelchairUsers) {
    const li = document.createElement("li");
    li.style.alignItems = "center";

    const square = document.createElement("div");
    square.className = "colorBox";
    square.style.backgroundColor = "initial";
    square.style.backgroundImage = "url(images/pattern_fill/blank.png)";
    square.style.border = "1px solid black";
    li.appendChild(square);

    const span = document.createElement("span");
    span.innerHTML = lang.legendAccessible;
    li.appendChild(span);

    legendList.appendChild(li);
  }
}

function addLegendRecord(ref: HTMLElement, color: string, text: string): void {
  const li = document.createElement("li");

  const square = document.createElement("div");
  square.className = "colorBox";
  square.style.backgroundColor = color;
  li.appendChild(square);

  const span = document.createElement("span");
  span.innerHTML = text;
  li.appendChild(span);

  ref.appendChild(li);
}

export default {
  create,
};
