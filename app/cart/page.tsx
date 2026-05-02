'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CartItem, ProductId } from '@/lib/types';
import {
  clearCart as clearStoredCart,
  getCart,
  hydrateCartFromSupabase,
  removeFromCart,
  saveCart,
} from '@/lib/storage';
import { formatPrice } from '@/lib/format';

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const handleUpdateQuantity = (productId: ProductId, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      setCartItems(getCart());
      return;
    }

    const updatedCart = cartItems.map((item) => {
      if (item.id !== productId) {
        return item;
      }

      const availableStock = typeof item.stock === 'number' ? item.stock : null;
      return { ...item, quantity: availableStock === null ? quantity : Math.min(quantity, Math.max(availableStock, 1)) };
    });

    saveCart(updatedCart);
    setCartItems(updatedCart);
  };

  const handleRemove = (productId: ProductId) => {
    removeFromCart(productId);
    setCartItems(getCart());
  };

  const handleClearCart = () => {
    clearStoredCart();
    setCartItems([]);
  };

  if (cartItems.length === 0) {
    return (
      <main className="cart-main">
        <p className="sr-only">Cart Page Working</p>

        <div className="cart-container">
          <h1 className="cart-title">YOUR CART</h1>
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link href="/shop" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-main">
      <p className="sr-only">Cart Page Working</p>

      <div className="cart-container">
        <h1 className="cart-title">YOUR CART</h1>

        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => {
              const itemTotal = item.price * item.quantity;

              return (
                <div key={item.id} className="cart-item">
                  <div className="item-image">
                    <img src={item.image} alt={item.name} />
                  </div>

                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price">{formatPrice(item.price)}</p>
                  </div>

                  <div className="item-quantity">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      -
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    <p className="total-price">{formatPrice(itemTotal)}</p>
                  </div>

                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>TBD</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total-row">
              <span>Total:</span>
              <span>{formatPrice(total)}</span>
            </div>

            <Link href="/checkout" className="checkout-btn">
              Proceed to Checkout
            </Link>
            <Link href="/shop" className="continue-shopping-btn continue-btn">
              Continue Shopping
            </Link>
            <button type="button" className="clear-btn" onClick={handleClearCart}>
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
