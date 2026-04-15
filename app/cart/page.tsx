"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { clearCart, getCart, getSession, removeFromCart } from "@/lib/storage";
import { CartItem } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }

    const syncCart = () => {
      setCartItems(getCart());
    };

    syncCart();
    window.addEventListener("cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [router]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  }, [cartItems]);

  const handleRemoveItem = (productId: number) => {
    removeFromCart(productId);
    setCartItems(getCart());
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      window.alert("Your cart is empty. Add some items first.");
      return;
    }

    window.alert("Checkout successful! Thank you for shopping at Rosette Boutique.");
    clearCart();
    setCartItems([]);
  };

  return (
    <div className="page-shell">
      <Navbar />

      <main className="page-content section-block">
        <div className="cart-header section-heading">
          <div>
            <span className="eyebrow">Your Shopping Bag</span>
            <h1>Cart</h1>
          </div>
          <p>Review your selected pieces before checkout.</p>
        </div>

        <section className="cart-layout">
          <div className="cart-list">
            {cartItems.length === 0 ? (
              <div className="empty-state">
                Your cart is empty for now. Visit the home page and add a few
                lovely pieces.
              </div>
            ) : (
              cartItems.map((item) => (
                <article key={item.id} className="cart-item">
                  <div className="cart-thumb">
                    <Image src={item.image} alt={item.name} width={180} height={220} />
                  </div>

                  <div className="cart-meta">
                    <h3>{item.name}</h3>
                    <span className="cart-price">₱{item.price.toLocaleString()}</span>
                    <span>Quantity: {item.quantity}</span>
                    <span>Category: {item.category}</span>
                  </div>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    Remove
                  </button>
                </article>
              ))
            )}
          </div>

          <aside className="summary-box">
            <div className="summary-total">
              <p>Total Items</p>
              <strong>{cartItems.reduce((total, item) => total + item.quantity, 0)}</strong>
            </div>
            <div className="summary-total">
              <p>Total Price</p>
              <strong>₱{totalPrice.toLocaleString()}</strong>
            </div>
            <button type="button" className="button-primary" onClick={handleCheckout}>
              Checkout
            </button>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
