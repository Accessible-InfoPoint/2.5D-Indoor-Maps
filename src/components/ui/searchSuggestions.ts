import type { SearchSuggestion } from "../../services/buildingService";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";
import { getCategoryIcon } from "../../services/featureService";

const suggestionsList = getRequiredElement<HTMLUListElement>("searchSuggestionsList");

let currentSuggestions: SearchSuggestion[] = [];

function render(onSelect: (suggestion: SearchSuggestion) => void): void {
  suggestionsList.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-suggestion-index]");
    if (!button) return;

    const index = parseInt(button.dataset.suggestionIndex ?? "-1", 10);
    const suggestion = currentSuggestions[index];
    if (suggestion) {
      onSelect(suggestion);
      clear();
    }
  });
}

function buildSubtitle(suggestion: SearchSuggestion): string {
  const levelText = suggestion.levels.map((l) => lang.searchSuggestionLevel + l).join(", ");
  return suggestion.type ? `${levelText} · ${suggestion.type}` : levelText;
}

function update(suggestions: SearchSuggestion[]): void {
  currentSuggestions = suggestions;
  suggestionsList.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionsList.classList.remove("visible");
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const subtitle = buildSubtitle(suggestion);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-suggestion-card";
    button.setAttribute("data-suggestion-index", index.toString());
    button.setAttribute("aria-label", `${suggestion.displayName}, ${subtitle}`);

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
    button.appendChild(textWrapper);

    const categoryIcon = getCategoryIcon(suggestion.feature);
    if (categoryIcon) {
      const icon = document.createElement("img");
      icon.className = "suggestion-icon";
      icon.src = categoryIcon;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
    }

    const li = document.createElement("li");
    li.appendChild(button);
    suggestionsList.appendChild(li);
  });

  suggestionsList.classList.add("visible");
}

function clear(): void {
  currentSuggestions = [];
  suggestionsList.innerHTML = "";
  suggestionsList.classList.remove("visible");
}

export default { render, update, clear };
