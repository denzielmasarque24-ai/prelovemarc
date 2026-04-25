"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart, getCart, hydrateCartFromSupabase } from "@/lib/storage";
import { placeCheckoutOrder, type DeliveryOption, type PaymentMethod } from "@/lib/orders";
import type { CartItem } from "@/lib/types";
import "./checkout.css";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const deliveryFee = 5000;

function formatPrice(price: number) {
  return pesoFormatter.format(price / 100);
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gcash");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const syncCart = () => {
      setCartItems(getCart());
    };

    syncCart();
    void hydrateCartFromSupabase().then((cart) => setCartItems(cart));
    window.addEventListener("cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );
  const selectedDeliveryFee = deliveryOption === "delivery" ? deliveryFee : 0;
  const total = subtotal + selectedDeliveryFee;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    if (!customerName.trim() || !phone.trim()) {
      setError("Please enter your full name and phone number.");
      return;
    }

    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    if (
      deliveryOption === "delivery" &&
      (!streetAddress.trim() || !barangay.trim() || !city.trim() || !province.trim())
    ) {
      setError("Please complete your street address, barangay, city, and province.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = await placeCheckoutOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: deliveryOption === "delivery" ? streetAddress.trim() : "Pickup",
        barangay: deliveryOption === "delivery" ? barangay.trim() : null,
        city: deliveryOption === "delivery" ? city.trim() : null,
        province: deliveryOption === "delivery" ? province.trim() : null,
        zipCode: deliveryOption === "delivery" ? zipCode.trim() || null : null,
        notes,
        paymentMethod,
        deliveryOption,
        total,
        items: cartItems,
      });

      clearCart();
      router.push(`/checkout/success?order=${orderId}`);
    } catch (caughtError) {
      console.error("Checkout order failed:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to place your order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cartItems.length) {
    return (
      <main className="checkout-main">
        <section className="checkout-empty">
          <h1>Your cart is empty</h1>
          <p>Add a few boutique finds before checking out.</p>
          <Link href="/shop" className="checkout-primary-link">
            Continue Shopping
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-main">
      <div className="checkout-container">
        <div className="checkout-heading">
          <p>Secure Checkout</p>
          <h1>Complete your order</h1>
        </div>

        <form className="checkout-grid" onSubmit={handleSubmit}>
          <section className="checkout-card checkout-items-card">
            <h2>Selected Items</h2>
            <div className="checkout-items">
              {cartItems.map((item) => (
                <article key={item.id} className="checkout-item">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      {item.quantity} x {formatPrice(item.price)}
                    </p>
                  </div>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="checkout-card">
            <h2>Customer Details</h2>
            <div className="checkout-fields">
              <label>
                Full Name
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </label>

              <label>
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </label>
            </div>
          </section>

          <section className="checkout-card">
            <h2>Delivery Option</h2>
            <div className="checkout-choice-row">
              <label className={deliveryOption === "pickup" ? "checkout-choice active" : "checkout-choice"}>
                <input
                  type="radio"
                  name="deliveryOption"
                  value="pickup"
                  checked={deliveryOption === "pickup"}
                  onChange={() => setDeliveryOption("pickup")}
                />
                <span>Pickup</span>
              </label>
              <label
                className={deliveryOption === "delivery" ? "checkout-choice active" : "checkout-choice"}
              >
                <input
                  type="radio"
                  name="deliveryOption"
                  value="delivery"
                  checked={deliveryOption === "delivery"}
                  onChange={() => setDeliveryOption("delivery")}
                />
                <span>Delivery</span>
              </label>
            </div>

            {deliveryOption === "delivery" && (
              <div className="checkout-fields address-fields">
                <label className="wide-field">
                  Street Address
                  <input
                    value={streetAddress}
                    onChange={(event) => setStreetAddress(event.target.value)}
                    autoComplete="street-address"
                    required
                  />
                </label>

                <label>
                  Barangay
                  <input
                    value={barangay}
                    onChange={(event) => setBarangay(event.target.value)}
                    required
                  />
                </label>

                <label>
                  City
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    autoComplete="address-level2"
                    required
                  />
                </label>

                <label>
                  Province
                  <input
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    autoComplete="address-level1"
                    required
                  />
                </label>

                <label>
                  Zip Code
                  <input
                    value={zipCode}
                    onChange={(event) => setZipCode(event.target.value)}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </label>
              </div>
            )}
          </section>

          <section className="checkout-card">
            <h2>Payment Method</h2>
            <div className="checkout-choice-row payment-row">
              {[
                ["gcash", "GCash"],
                ["paymaya", "PayMaya"],
                ["cod", "Cash on Delivery"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={paymentMethod === value ? "checkout-choice active" : "checkout-choice"}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={value}
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value as PaymentMethod)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          <aside className="checkout-card checkout-summary">
            <h2>Order Summary</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Delivery Fee</span>
              <strong>{formatPrice(selectedDeliveryFee)}</strong>
            </div>
            <div className="summary-total">
              <span>Total Amount</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button type="submit" className="place-order-button" disabled={isSubmitting}>
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}
