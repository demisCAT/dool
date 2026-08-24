import type { Metadata } from "next";
import { Gloock, Karla, Caveat } from "next/font/google";
import "./globals.css";

const gloock = Gloock({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gloock",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Divina Natales — Comida casera para llevar",
  description:
    "Platos hechos en casa, listos para llevar. Elige tu menú y envíanos tu pedido por WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${gloock.variable} ${karla.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
