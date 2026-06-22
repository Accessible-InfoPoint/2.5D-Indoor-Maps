export function getRequiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Required DOM element "#${id}" was not found.`);
  }

  return element as T;
}
