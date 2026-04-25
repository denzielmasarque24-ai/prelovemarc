'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  addToCart as addToStoredCart,
  clearCart as clearStoredCart,
  getCart,
  hydrateCartFromSupabase,
  removeFromCart as removeStoredCart,
  saveCart,
} from '@/lib/storage';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const syncCart = () => {
      setCartItems(getCart());
    };

    syncCart();
    void hydrateCartFromSupabase().then((cart) => setCartItems(cart));

    window.addEventListener('cart-updated', syncCart);
    window.addEventListener('storage', syncCart);
    window.addEventListener('session-updated', () => {
      void hydrateCartFromSupabase().then((cart) => setCartItems(cart));
    });

    return () => {
      window.removeEventListener('cart-updated', syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const addToCart = (product) => {
    addToStoredCart(product);
    setCartItems(getCart());
  };

  const removeFromCart = (productId) => {
    removeStoredCart(productId);
    setCartItems(getCart());
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cartItems.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    );

    saveCart(updatedCart);
    setCartItems(updatedCart);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const clearCart = () => {
    clearStoredCart();
    setCartItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        getTotalItems,
        getTotalPrice,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
