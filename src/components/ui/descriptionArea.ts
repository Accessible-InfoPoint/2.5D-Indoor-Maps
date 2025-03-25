function update(message: string, elementId = "description"): void {
  const popUpArea = document.getElementById(elementId);
  popUpArea.innerText = message;
  document.getElementById("descriptionArea").focus();
}

export default {
  update,
};
