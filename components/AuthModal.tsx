"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthModalTab } from "@/lib/authModal";
import LoginForm from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";
import OtpForm from "@/components/OtpForm";

type ModalMode = AuthModalTab | "otp";

type AuthModalProps = {
  activeTab: AuthModalTab;
  onClose: () => void;
  onSwitchTab: (tab: AuthModalTab) => void;
};

export default function AuthModal({ activeTab, onClose, onSwitchTab }: AuthModalProps) {
  const [isVisible, setIsVisible]             = useState(false);
  const [mode, setMode]                       = useState<ModalMode>(activeTab);
  const [prefillEmail, setPrefillEmail]       = useState("");
  const [pendingEmail, setPendingEmail]       = useState("");
  const [loginSuccessMsg, setLoginSuccessMsg] = useState("");
  const closingRef    = useRef(false);
  const initialised   = useRef(false);

  // Only sync activeTab on the very first render — never override otp mode
  useEffect(() => {
    if (!initialised.current) { initialised.current = true; return; }
    // Parent tab change is only respected when we are NOT in otp mode
    setMode((prev) => prev === "otp" ? "otp" : activeTab);
  }, [activeTab]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(id); document.body.style.overflow = ""; };
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

  // Called by RegisterForm after OTP is sent successfully
  function handleOtpSent(email: string) {
    setPendingEmail(email);
    setMode("otp");
  }

  // Called by OtpForm after code is verified — switch to login, do NOT sign in
  function handleVerified(email: string) {
    setPrefillEmail(email);
    setLoginSuccessMsg("Email verified. Please log in now.");
    setMode("login");
  }

  function handleSwitchTab(tab: AuthModalTab) {
    setPendingEmail("");
    setMode(tab);
    onSwitchTab(tab);
  }

  const isOtp   = mode === "otp";
  const isLogin = mode === "login";

  const headerTitle = isOtp
    ? "Verify your email"
    : isLogin
    ? "Welcome back"
    : "Join the boutique";

  const headerSubtitle = isOtp
    ? "Enter the 6-digit code sent to your Gmail."
    : isLogin
    ? "Sign in to your account to continue shopping."
    : "Create your account and start shopping today.";

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
        aria-label={headerTitle}
      >
        <button type="button" className="am-close" onClick={handleClose} aria-label="Close">✕</button>

        <div className="am-header">
          <span className="am-eyebrow">🌸 PRELOVE SHOP</span>
          <h2 className="am-title">{headerTitle}</h2>
          <p className="am-subtitle">{headerSubtitle}</p>
        </div>

        {/* Tabs hidden during OTP screen */}
        {!isOtp && (
          <div className="am-tabs" role="tablist">
            <button
              type="button" role="tab" aria-selected={isLogin}
              className={`am-tab${isLogin ? " am-tab-active" : ""}`}
              onClick={() => handleSwitchTab("login")}
            >
              Log In
            </button>
            <button
              type="button" role="tab" aria-selected={!isLogin}
              className={`am-tab${!isLogin ? " am-tab-active" : ""}`}
              onClick={() => handleSwitchTab("register")}
            >
              Register
            </button>
          </div>
        )}

        <div className="am-body">
          {isOtp ? (
            <OtpForm
              pendingEmail={pendingEmail}
              onVerified={handleVerified}
              onBack={() => setMode("register")}
            />
          ) : isLogin ? (
            <LoginForm
              key={`login-${prefillEmail}`}
              onClose={handleClose}
              onSwitchToRegister={() => {
                setPrefillEmail("");
                setLoginSuccessMsg("");
                handleSwitchTab("register");
              }}
              prefillEmail={prefillEmail}
              successMessage={loginSuccessMsg}
            />
          ) : (
            <RegisterForm
              key="register"
              onClose={handleClose}
              onSwitchToLogin={() => { setPrefillEmail(""); handleSwitchTab("login"); }}
              onDuplicateEmail={(email) => { setPrefillEmail(email); handleSwitchTab("login"); }}
              onOtpSent={handleOtpSent}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
