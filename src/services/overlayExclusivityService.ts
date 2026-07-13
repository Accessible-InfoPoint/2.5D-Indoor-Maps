interface OverlayRegistration {
  id: string;
  close: () => void;
}

const registrations: OverlayRegistration[] = [];

function registerOverlay(id: string, close: () => void): () => void {
  const registration: OverlayRegistration = { id, close };
  registrations.push(registration);

  return () => {
    const index = registrations.indexOf(registration);
    if (index !== -1) registrations.splice(index, 1);
  };
}

function notifyOpened(id: string): void {
  registrations.forEach((registration) => {
    if (registration.id !== id) registration.close();
  });
}

function closeAll(): void {
  registrations.forEach((registration) => registration.close());
}

export default {
  registerOverlay,
  notifyOpened,
  closeAll,
};
