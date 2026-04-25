import Link from "next/link";
import "./success.css";

export default function CheckoutSuccessPage() {
  return (
    <main className="checkout-success-main">
      <section className="checkout-success-card">
        <p className="checkout-success-kicker">Order Received</p>
        <h1>Thank you for your order</h1>
        <p>
          Your PRELOVE SHOP order has been saved. We will review it and contact you with the
          next steps for payment and fulfillment.
        </p>
        <div className="checkout-success-actions">
          <Link href="/shop">Continue Shopping</Link>
          <Link href="/">Back Home</Link>
        </div>
      </section>
    </main>
  );
}
