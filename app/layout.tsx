import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./report.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `
(() => {
  try {
    const saved = localStorage.getItem("lumina-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  metadataBase: new URL("https://lumina-ai-visibility.thiagomatos-work.chatgpt.site"),
  title: "Lumina — AI Visibility para seu site",
  description: "Descubra como mecanismos de IA encontram, compreendem e citam seu site.",
  openGraph: {
    title: "Lumina — Descubra como as IAs enxergam seu site",
    description: "AI Visibility para sites preparados para serem encontrados, compreendidos e citados.",
    type: "website",
    images: [{ url: "https://lumina-ai-visibility.thiagomatos-work.chatgpt.site/og.png", width: 1731, height: 909, alt: "Lumina — Descubra como as IAs enxergam seu site" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina — Descubra como as IAs enxergam seu site",
    description: "AI Visibility para sites preparados para serem encontrados, compreendidos e citados.",
    images: ["https://lumina-ai-visibility.thiagomatos-work.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
