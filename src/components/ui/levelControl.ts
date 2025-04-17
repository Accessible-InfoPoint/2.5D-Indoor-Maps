import { INDOOR_LEVEL, VISIBLE_LEVEL_CONTROLS, START_LEVEL_CONTROL_POSITION } from "../../../public/strings/settings.json";
import LevelService from "../../services/levelService";
import { geoMap } from "../../main";
import { lang } from "../../services/languageService";

let offset = 1;
const minOffset = 0;
let maxOffset = 0;
let numLevels = 0;
let allLevelNames: string[] = [];

function handleLoad(): void {
  //reCreate

  remove();
  create();
}

function create(): void {
  const levelNames = LevelService.getLevelNames();
  render(levelNames);
}

function remove(): void {
  document.getElementById("levelControl").innerHTML = "";
}

function render(allLevelNamesParam: string[]): void {
  const levelControl = document.getElementById("levelControl");
  allLevelNames = allLevelNamesParam;
  numLevels = allLevelNames.length;

  allLevelNames.forEach((level: string) => {
    const changeToLevel = lang.changeLevel + level;
    const levelLi = document.createElement("li");
    const levelBtn = document.createElement("button")
    levelBtn.className = "square";
    levelBtn.innerHTML = level
    levelBtn.setAttribute("title", changeToLevel);
    levelBtn.setAttribute("aria-label", changeToLevel);
    levelBtn.setAttribute("tabindex", "0");

    if (level == INDOOR_LEVEL.toString()) { // TODO: Check for level ref, name might not be simply numerical
      levelBtn.classList.add("active");
    }

    levelBtn.addEventListener("click", () => {
      geoMap.handleLevelChange(parseFloat(level));

      for (const element of levelControl.children) {
        element.children[0].classList.remove("active");
      }
      levelBtn.classList.add("active");
    });

    levelLi.appendChild(levelBtn);
    levelControl.appendChild(levelLi);
  });

  setWindow();

  const index = allLevelNames.findIndex((level) => level == INDOOR_LEVEL.toString());
  offset = index - START_LEVEL_CONTROL_POSITION; // current should be second to last in visible
  maxOffset = numLevels - VISIBLE_LEVEL_CONTROLS;
  offset = Math.max(minOffset, Math.min(maxOffset, offset));
  disableLevelShifters();
  setMargin();
}

function moveUp(): void {
  offset -= 1;
  offset = Math.max(minOffset, Math.min(maxOffset, offset));
  disableLevelShifters();
  setMargin();
}
function moveDown(): void {
  offset += 1;
  offset = Math.max(minOffset, Math.min(maxOffset, offset));
  disableLevelShifters();
  setMargin();
}

function setWindow(): void {
  const levelControl = document.getElementById("levelControl");
  const shownLevels = Math.min(VISIBLE_LEVEL_CONTROLS, numLevels);
  if (numLevels <= VISIBLE_LEVEL_CONTROLS) {
    document.getElementById("levelShiftUp").style.display = "none";
    document.getElementById("levelShiftDown").style.display = "none";
  } else {
    document.getElementById("levelShiftUp").style.display = "inline-block";
    document.getElementById("levelShiftDown").style.display = "inline-block";
  }

  const size = parseInt(getComputedStyle(levelControl).getPropertyValue("--button-size"));
  const gap = parseInt(getComputedStyle(levelControl).getPropertyValue("--level-control-gap"));

  if (document.getElementById("uiWrapper").classList.contains("wheelchairMode")) {
    document.getElementById("levelControlWindow").style.width = (shownLevels * size + (shownLevels - 1) * gap) + "px";
    document.getElementById("levelControlWindow").style.height = "auto";
  } else {
    document.getElementById("levelControlWindow").style.height = (shownLevels * size + (shownLevels - 1) * gap) + "px";
    document.getElementById("levelControlWindow").style.width = "auto";
  }
}

function setMargin(): void {
  if (document.getElementById("uiWrapper").classList.contains("wheelchairMode")) {
    const levelControl = document.getElementById("levelControl");
    const size = parseInt(getComputedStyle(levelControl).getPropertyValue("--button-size"));
    const gap = parseInt(getComputedStyle(levelControl).getPropertyValue("--level-control-gap"));
    levelControl.style.marginLeft = (-1 * (size + gap) * offset) + "px";
    levelControl.style.marginTop = "0px";
  } else {
    const levelControl = document.getElementById("levelControl");
    const size = parseInt(getComputedStyle(levelControl).getPropertyValue("--button-size"));
    const gap = parseInt(getComputedStyle(levelControl).getPropertyValue("--level-control-gap"));
    levelControl.style.marginTop = (-1 * (size + gap) * offset) + "px";
    levelControl.style.marginLeft = "0px";
  }
}

function disableLevelShifters(): void {
  if (offset == minOffset) {
    document.getElementById("levelShiftUp").setAttribute("disabled", "disabled");
  } else {
    document.getElementById("levelShiftUp").removeAttribute("disabled");
  }
  if (offset == maxOffset) {
    document.getElementById("levelShiftDown").setAttribute("disabled", "disabled");
  } else {
    document.getElementById("levelShiftDown").removeAttribute("disabled");
  }
}

function focusOnLevel(selectedLevel: number): void {
  const levelControl = document.getElementById("levelControl");
  const list = levelControl.children;
  for (const item of list) {
    if (item.firstChild.textContent === selectedLevel.toString()) {
      item.children[0].classList.add("active");
    } else item.children[0].classList.remove("active");
  }

  const index = allLevelNames.findIndex((level) => level == selectedLevel.toString());
  if (index < offset) {
    // level is above in height what is currently visible
    // we need to shift offset down
    offset = Math.max(index, minOffset);
  }
  if (index > offset + VISIBLE_LEVEL_CONTROLS - 1) {
    // level is above in height what is currently visible
    // we need to shift offset down
    offset = Math.min(index - VISIBLE_LEVEL_CONTROLS - 1, maxOffset);
  }

  disableLevelShifters();
  setMargin();
}

function setupControlShifter(): void {
  const up = document.getElementById("levelShiftUp");
  up.addEventListener("click", () => {
    moveUp();
  })
  const down = document.getElementById("levelShiftDown");
  down.addEventListener("click", () => {
    moveDown();
  })
}

export default {
  handleChange: handleLoad,
  focusOnLevel,
  setupControlShifter,
  setMargin,
  setWindow,
};
