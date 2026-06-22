import { getRequiredElement } from "../../utils/domHelpers";

function update(message: string, elementId = "description"): void {
  const popUpArea = getRequiredElement(elementId);
  popUpArea.innerText = message;
  getRequiredElement("descriptionArea").focus();
}

export default {
  update,
};
