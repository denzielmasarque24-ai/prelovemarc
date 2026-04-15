"use client";

import { CartItem, Product, SessionUser, User } from "@/lib/types";

const USERS_KEY = "rosette-users";
const SESSION_KEY = "rosette-session";
const CART_KEY = "rosette-cart";

const isBrowser = () => typeof window !== "undefined";

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  const value = window.localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function dispatchUpdate(eventName: string) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}

export function getUsers() {
  return readJSON<User[]>(USERS_KEY, []);
}

export function saveUser(user: User) {
  const users = getUsers();
  users.push(user);
  writeJSON(USERS_KEY, users);
}

export function findUser(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();

  return getUsers().find(
    (user) =>
      user.username.trim().toLowerCase() === normalizedUsername &&
      user.password === password,
  );
}

export function usernameExists(username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  return getUsers().some(
    (user) => user.username.trim().toLowerCase() === normalizedUsername,
  );
}

export function emailExists(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return getUsers().some(
    (user) => user.email.trim().toLowerCase() === normalizedEmail,
  );
}

export function setSession(user: SessionUser) {
  writeJSON(SESSION_KEY, user);
  dispatchUpdate("session-updated");
}

export function getSession() {
  return readJSON<SessionUser | null>(SESSION_KEY, null);
}

export function clearSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  dispatchUpdate("session-updated");
}

export function getCart() {
  return readJSON<CartItem[]>(CART_KEY, []);
}

export function saveCart(cart: CartItem[]) {
  writeJSON(CART_KEY, cart);
  dispatchUpdate("cart-updated");
}

export function addToCart(product: Product) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
}

export function removeFromCart(productId: number) {
  const updatedCart = getCart().filter((item) => item.id !== productId);
  saveCart(updatedCart);
}

export function clearCart() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(CART_KEY);
  dispatchUpdate("cart-updated");
}
