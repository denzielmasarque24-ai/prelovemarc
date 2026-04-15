"use client";

import { FormEvent, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function ContactPage() {
  const [messageSent, setMessageSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessageSent(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="page-shell">
      <Navbar />

      <main className="page-content">
        <section className="contact-grid">
          <article className="contact-card">
            <span className="eyebrow">Contact Us</span>
            <h1>We would love to hear from you.</h1>
            <p>
              Reach out for styling questions, boutique updates, or order support.
            </p>

            <div className="contact-info-list">
              <div className="info-card">
                <strong>Email</strong>
                <p>hello@rosetteboutique.com</p>
              </div>
              <div className="info-card">
                <strong>Phone Number</strong>
                <p>+63 917 555 1122</p>
              </div>
              <div className="info-card">
                <strong>Facebook</strong>
                <p>facebook.com/rosetteboutique</p>
              </div>
              <div className="info-card">
                <strong>Instagram</strong>
                <p>@rosetteboutique</p>
              </div>
            </div>
          </article>

          <article className="contact-card">
            <span className="eyebrow">Send a Message</span>
            <h1>Stay in touch</h1>
            <p>Share your questions and we will get back to you soon.</p>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Write your message here"
                  required
                />
              </div>

              {messageSent ? (
                <div className="message-banner success">
                  Your message has been sent successfully.
                </div>
              ) : null}

              <button type="submit" className="button-primary">
                Send Message
              </button>
            </form>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
