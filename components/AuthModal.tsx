"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthModalTab } from "@/lib/authModal";
import LoginForm from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";

type AuthModalProps = {
  activeTab: AuthModalTab;
  onClose: () => void;
  onSwitchTab: (tab: AuthModalTab) => void;
};

export default function AuthModal({ activeTab, onClose, onSwitchTab }: AuthModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const closingRef = useRef(false);

  // Trigger enter animation on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsVisible(false);
    setTimeout(onClose, 240);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const isLogin = activeTab === "login";

  return createPortal(
    <div
      className={`am-overlay${isVisible ? " am-visible" : ""}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={`am-panel${isVisible ? " am-visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isLogin ? "Log in to PRELOVE SHOP" : "Create your PRELOVE SHOP account"}
      >
        {/* Close button */}
        <button
          type="button"
          className="am-close"
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="am-header">
          <span className="am-eyebrow">🌸 PRELOVE SHOP</span>
          <h2 className="am-title">
            {isLogin ? "Welcome back" : "Join the boutique"}
          </h2>
          <p className="am-subtitle">
            {isLogin
              ? "Sign in to your account to continue shopping."
              : "Create your account and start shopping today."}
          </p>
        </div>

        {/* Tabs */}
        <div className="am-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={`am-tab${isLogin ? " am-tab-active" : ""}`}
            onClick={() => onSwitchTab("login")}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={`am-tab${!isLogin ? " am-tab-active" : ""}`}
            onClick={() => onSwitchTab("register")}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <div className="am-body">
          {isLogin ? (
            <LoginForm
              key="login"
              onClose={handleClose}
              onSwitchToRegister={() => onSwitchTab("register")}
            />
          ) : (
            <RegisterForm
              key="register"
              onClose={handleClose}
              onSwitchToLogin={() => onSwitchTab("login")}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
