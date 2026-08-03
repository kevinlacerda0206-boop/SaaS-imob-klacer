import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Closer",
  description: "Closer — CRM por conversa pro corretor de imóveis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
