import { getRequiredElement } from "../../utils/domHelpers";

function update(message: string, elementId = "description"): void {
  const popUpArea = getRequiredElement(elementId);
  popUpArea.innerText = message;
}

export default {
  update,
};
