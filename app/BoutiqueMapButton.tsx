"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const mapQuery = "Pardo New State, Cebu City, Philippines";
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

export default function BoutiqueMapButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.classList.add("boutique-map-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("boutique-map-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button type="button" className={styles.primaryButton} onClick={() => setIsOpen(true)}>
        Visit the Boutique
      </button>

      {isOpen && (
        <div className={styles.mapOverlay} role="dialog" aria-modal="true" aria-label="PRELOVE SHOP map">
          <div className={styles.mapBackdrop} onClick={() => setIsOpen(false)} />
          <section className={styles.mapModal}>
            <button
              type="button"
              className={styles.mapClose}
              onClick={() => setIsOpen(false)}
              aria-label="Close boutique map"
            >
              X
            </button>

            <div className={styles.mapContent}>
              <p className={styles.eyebrow}>Visit us</p>
              <h2>PRELOVE SHOP</h2>
              <p>Pardo New State, Cebu City, Philippines</p>
            </div>

            <div className={styles.mapFrameWrap}>
              <iframe
                title="PRELOVE SHOP location in Pardo New State, Cebu City"
                src={mapEmbedUrl}
                className={styles.mapFrame}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <a className={styles.mapOpenButton} href={mapOpenUrl} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          </section>
        </div>
      )}
    </>
  );
}
