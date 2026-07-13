import type { SearchSuggestion } from "../../services/buildingService";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";
import { getCategoryIcon } from "../../services/featureService";
import OverlayExclusivityService from "../../services/overlayExclusivityService";

const suggestionsList = getRequiredElement<HTMLUListElement>("searchSuggestionsList");
const searchAnnouncement = getRequiredElement<HTMLDivElement>("searchAnnouncement");
const ANNOUNCEMENT_DELAY_MS = 250;

OverlayExclusivityService.registerOverlay("searchSuggestionsList", hide);

let currentSuggestions: SearchSuggestion[] = [];
let activeIndex = -1;
let isPopupOpen = false;
let inputElement: HTMLInputElement | undefined;
let announcementTimer: ReturnType<typeof setTimeout> | undefined;

function render(input: HTMLInputElement, onSelect: (suggestion: SearchSuggestion) => void): void {
  inputElement = input;
  syncInputState();

  suggestionsList.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  suggestionsList.addEventListener("click", (e) => {
    const option = (e.target as HTMLElement).closest<HTMLElement>("li[data-suggestion-index]");
    if (!option) return;

    const index = parseInt(option.dataset.suggestionIndex ?? "-1", 10);
    const suggestion = currentSuggestions[index];
    if (suggestion) {
      onSelect(suggestion);
      clear();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (handleKeyDown(e, onSelect)) {
      e.stopImmediatePropagation();
    }
  });
}

function buildSubtitle(suggestion: SearchSuggestion): string {
  const levelText = suggestion.levels.map((l) => lang.searchSuggestionLevel + l).join(", ");
  return suggestion.type ? `${levelText} · ${suggestion.type}` : levelText;
}

function handleKeyDown(
  e: KeyboardEvent,
  onSelect: (suggestion: SearchSuggestion) => void,
): boolean {
  if (currentSuggestions.length === 0) {
    return false;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!isPopupOpen) {
      open();
      setActiveIndex(0);
      return true;
    }

    setActiveIndex(
      activeIndex === -1 || activeIndex >= currentSuggestions.length - 1 ? 0 : activeIndex + 1,
    );
    return true;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!isPopupOpen) {
      open();
      setActiveIndex(0);
      return true;
    }

    setActiveIndex(
      activeIndex === -1 ? 0 : activeIndex > 0 ? activeIndex - 1 : currentSuggestions.length - 1,
    );
    return true;
  }

  if (e.key === "Home" && isPopupOpen && activeIndex !== -1) {
    e.preventDefault();
    setActiveIndex(0);
    return true;
  }

  if (e.key === "End" && isPopupOpen && activeIndex !== -1) {
    e.preventDefault();
    setActiveIndex(currentSuggestions.length - 1);
    return true;
  }

  if (e.key === "Enter" && isPopupOpen && activeIndex !== -1) {
    e.preventDefault();
    const suggestion = currentSuggestions[activeIndex];
    if (suggestion) {
      onSelect(suggestion);
      clear();
    }
    return true;
  }

  if (e.key === "Escape" && isPopupOpen) {
    e.preventDefault();
    hide();
    return true;
  }

  return false;
}

function update(suggestions: SearchSuggestion[]): void {
  currentSuggestions = suggestions;
  activeIndex = -1;
  isPopupOpen = suggestions.length > 0;
  suggestionsList.innerHTML = "";
  syncInputState();

  if (suggestions.length === 0) {
    suggestionsList.classList.remove("visible");
    announceSuggestionCount(0);
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const subtitle = buildSubtitle(suggestion);

    const option = document.createElement("li");
    option.id = `search-suggestion-${index}`;
    option.setAttribute("role", "option");
    option.className = "search-suggestion-card";
    option.tabIndex = -1;
    option.setAttribute("data-suggestion-index", index.toString());
    option.setAttribute("aria-selected", "false");
    option.setAttribute("aria-label", `${suggestion.displayName}, ${subtitle}`);

    const textWrapper = document.createElement("span");
    textWrapper.className = "suggestion-text";

    const nameSpan = document.createElement("span");
    nameSpan.className = "suggestion-name";
    nameSpan.textContent = suggestion.displayName;

    const levelsSpan = document.createElement("span");
    levelsSpan.className = "suggestion-levels";
    levelsSpan.textContent = subtitle;

    textWrapper.appendChild(nameSpan);
    textWrapper.appendChild(levelsSpan);
    option.appendChild(textWrapper);

    const categoryIcon = getCategoryIcon(suggestion.feature);
    if (categoryIcon) {
      const icon = document.createElement("img");
      icon.className = "suggestion-icon";
      icon.src = categoryIcon;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      option.appendChild(icon);
    }

    suggestionsList.appendChild(option);
  });

  suggestionsList.classList.add("visible");
  OverlayExclusivityService.notifyOpened("searchSuggestionsList");
  syncInputState();
  announceSuggestionCount(suggestions.length);
}

function clear(): void {
  currentSuggestions = [];
  activeIndex = -1;
  isPopupOpen = false;
  suggestionsList.innerHTML = "";
  suggestionsList.classList.remove("visible");
  clearAnnouncement();
  syncInputState();
}

function open(): void {
  if (currentSuggestions.length === 0) return;

  isPopupOpen = true;
  suggestionsList.classList.add("visible");
  OverlayExclusivityService.notifyOpened("searchSuggestionsList");
  syncInputState();
}

function hide(): void {
  isPopupOpen = false;
  suggestionsList.classList.remove("visible");
  setActiveIndex(-1);
  clearAnnouncement();
}

function setActiveIndex(index: number): void {
  activeIndex = index;
  Array.from(suggestionsList.querySelectorAll<HTMLElement>("[role='option']")).forEach(
    (option, optionIndex) => {
      const isActive = optionIndex === activeIndex;
      option.setAttribute("aria-selected", isActive.toString());
      option.classList.toggle("active", isActive);
      if (isActive && typeof option.scrollIntoView === "function") {
        option.scrollIntoView({ block: "nearest" });
      }
    },
  );
  syncInputState();
}

function syncInputState(): void {
  if (!inputElement) return;

  inputElement.setAttribute("aria-expanded", isPopupOpen.toString());
  inputElement.setAttribute(
    "aria-activedescendant",
    isPopupOpen && activeIndex >= 0 ? `search-suggestion-${activeIndex}` : "",
  );
}

function announceSuggestionCount(count: number): void {
  if (announcementTimer) {
    clearTimeout(announcementTimer);
  }
  announcementTimer = setTimeout(() => {
    searchAnnouncement.textContent =
      count === 0
        ? lang.searchSuggestionsNone
        : lang.searchSuggestionsAvailable.replace("{count}", count.toString());
  }, ANNOUNCEMENT_DELAY_MS);
}

function clearAnnouncement(): void {
  if (announcementTimer) {
    clearTimeout(announcementTimer);
    announcementTimer = undefined;
  }
  searchAnnouncement.textContent = "";
}

export default { render, update, clear, hide };
