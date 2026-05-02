import type { Metadata } from "next";
import { CartProvider } from "@/context/CartContext";
import ConditionalShell from "@/components/ConditionalShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRELOVE SHOP - Fashion for Everyone",
  description: "Give clothes a second chance. Premium pre-loved fashion at affordable prices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <ConditionalShell>{children}</ConditionalShell>
        </CartProvider>
      </body>
    </html>
  );
}
