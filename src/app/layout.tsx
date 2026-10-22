import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegistrarSW } from "@/components/RegistrarSW";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Revenda", template: "%s · Revenda" },
  description: "Compra e venda de usados: calcular, estoque, caixa e giro.",
  appleWebApp: { capable: true, title: "Revenda", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121410" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
