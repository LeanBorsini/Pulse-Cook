import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse&Cook - Recetario Inteligente y Menú Semanal",
  description: "Libro de recetas personal y familiar con planificador de menú y lista de compras inteligente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
