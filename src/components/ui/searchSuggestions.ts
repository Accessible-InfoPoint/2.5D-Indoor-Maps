import type { SearchSuggestion } from "../../services/buildingService";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";

const suggestionsList = getRequiredElement<HTMLUListElement>("searchSuggestionsList");

let currentSuggestions: SearchSuggestion[] = [];

function render(onSelect: (suggestion: SearchSuggestion) => void): void {
  suggestionsList.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>("li[data-suggestion-index]");
    if (!li) return;

    const index = parseInt(li.dataset.suggestionIndex ?? "-1", 10);
    const suggestion = currentSuggestions[index];
    if (suggestion) {
      onSelect(suggestion);
      clear();
    }
  });
}

function update(suggestions: SearchSuggestion[]): void {
  currentSuggestions = suggestions;
  suggestionsList.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionsList.classList.remove("visible");
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const li = document.createElement("li");
    li.className = "search-suggestion-card";
    li.setAttribute("data-suggestion-index", index.toString());
    li.setAttribute("role", "option");

    const nameSpan = document.createElement("span");
    nameSpan.className = "suggestion-name";
    nameSpan.textContent = suggestion.displayName;

    const levelsSpan = document.createElement("span");
    levelsSpan.className = "suggestion-levels";
    levelsSpan.textContent = suggestion.levels
      .map((l) => lang.searchSuggestionLevel + l)
      .join(", ");

    li.appendChild(nameSpan);
    li.appendChild(levelsSpan);
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
