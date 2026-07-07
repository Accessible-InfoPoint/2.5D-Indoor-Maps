export function getRequiredMapValue<K, V>(map: Map<K, V>, key: K, context = "Map"): V {
  const value = map.get(key);

  if (value === undefined) {
    throw new Error(`${context} is missing required key "${String(key)}".`);
  }

  return value;
}

export function getRequiredArrayValue<T>(values: T[], index: number, context = "Array"): T {
  const value = values.at(index);

  if (value === undefined) {
    throw new Error(`${context} is missing required index "${index}".`);
  }

  return value;
}

export function getRequiredMatch<T>(value: T | undefined, context = "Value"): T {
  if (value === undefined) {
    throw new Error(`${context} was not found.`);
  }

  return value;
}
