"use client";

import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthModalTab } from "@/lib/authModal";
import LoginForm from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";

const CLOSE_ANIMATION_MS = 220;

type AuthModalProps = {
  activeTab: AuthModalTab;
  onClose: () => void;
  onSwitchTab: (tab: AuthModalTab) => void;
};

export default function AuthModal({
  activeTab,
  onClose,
  onSwitchTab,
}: AuthModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add("modal-open");

    return () => {
      document.body.classList.remove("modal-open");
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleRequestClose = useCallback(() => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, CLOSE_ANIMATION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleRequestClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [handleRequestClose]);

  const handleSwitchTab = (tab: AuthModalTab) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isClosing) {
      setIsClosing(false);
    }
    onSwitchTab(tab);
  };

  return createPortal(
    <div
      className={`modal-overlay auth-modal-overlay ${isClosing ? "is-closing" : ""}`}
      onClick={handleRequestClose}
      role="presentation"
    >
      <div
        className={`modal-panel auth-card modal-card auth-modal-shell ${isClosing ? "is-closing" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button type="button" className="modal-close auth-modal-close" onClick={handleRequestClose} aria-label="Close authentication modal">
          <span aria-hidden="true">X</span>
        </button>

        <div className="auth-modal-aside">
          <span className="eyebrow auth-modal-badge">
            {activeTab === "login" ? "Welcome Back" : "Join Rosette"}
          </span>
          <h1 id="auth-modal-title">
            {activeTab === "login" ? "Step back into your curated closet." : "Create your boutique account."}
          </h1>
          <p>
            {activeTab === "login"
              ? "Log in without leaving the page and keep browsing your favorites in the background."
              : "Register in one elegant popup, then continue shopping from exactly where you are."}
          </p>

          <div className="auth-modal-features">
            <div className="auth-feature-pill">Baby pink access</div>
            <div className="auth-feature-pill">Protected cart</div>
            <div className="auth-feature-pill">Quick profile setup</div>
          </div>
        </div>

        <div className="auth-modal-main">
          <div className="auth-modal-tabs" role="tablist" aria-label="Authentication tabs">
            <button
              type="button"
              className={`auth-tab-button ${activeTab === "login" ? "active" : ""}`}
              onClick={handleSwitchTab("login")}
            >
              Log In
            </button>
            <button
              type="button"
              className={`auth-tab-button ${activeTab === "register" ? "active" : ""}`}
              onClick={handleSwitchTab("register")}
            >
              Register
            </button>
          </div>

          {activeTab === "login" ? (
            <LoginForm
              key="login-form"
              onClose={onClose}
              onSwitchToRegister={() => onSwitchTab("register")}
            />
          ) : (
            <RegisterForm
              key="register-form"
              onClose={onClose}
              onSwitchToLogin={() => onSwitchTab("login")}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

