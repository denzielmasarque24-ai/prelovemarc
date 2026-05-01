"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import {
  AuthModalTab,
  consumeQueuedAuthModal,
  subscribeToAuthModal,
} from "@/lib/authModal";

export default function AuthModalHost() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalTab>("login");

  useEffect(() => {
    const removeModalListener = subscribeToAuthModal((tab) => {
      setMode(tab);
      setIsModalOpen(true);
    });

    return () => {
      removeModalListener();
    };
  }, []);

  useEffect(() => {
    const queuedTab = consumeQueuedAuthModal();

    if (!queuedTab) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setMode(queuedTab);
      setIsModalOpen(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [pathname]);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return isModalOpen ? (
    <AuthModal
      activeTab={mode}
      onClose={closeModal}
      onSwitchTab={setMode}
    />
  ) : null;
}
