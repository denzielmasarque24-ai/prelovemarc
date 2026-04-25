"use client";

export type AuthModalTab = "login" | "register";

const AUTH_MODAL_EVENT = "auth-modal-request";
const AUTH_MODAL_STORAGE_KEY = "prelove-auth-modal";

export function requestAuthModal(tab: AuthModalTab) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUTH_MODAL_STORAGE_KEY, tab);
  window.dispatchEvent(
    new CustomEvent<AuthModalTab>(AUTH_MODAL_EVENT, {
      detail: tab,
    }),
  );
}

export function queueAuthModal(tab: AuthModalTab) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUTH_MODAL_STORAGE_KEY, tab);
}

export function consumeQueuedAuthModal() {
  if (typeof window === "undefined") {
    return null;
  }

  const tab = window.sessionStorage.getItem(AUTH_MODAL_STORAGE_KEY) as AuthModalTab | null;

  if (tab) {
    window.sessionStorage.removeItem(AUTH_MODAL_STORAGE_KEY);
  }

  return tab;
}

export function subscribeToAuthModal(
  listener: (tab: AuthModalTab) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<AuthModalTab>;
    listener(customEvent.detail);
  };

  window.addEventListener(AUTH_MODAL_EVENT, handler);

  return () => {
    window.removeEventListener(AUTH_MODAL_EVENT, handler);
  };
}
