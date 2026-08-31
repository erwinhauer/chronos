import type { Metadata } from "next";
import localFont from "next/font/local";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const switzer = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "../fonts/switzer/Switzer-Thin.otf", weight: "100", style: "normal" },
    { path: "../fonts/switzer/Switzer-ThinItalic.otf", weight: "100", style: "italic" },
    { path: "../fonts/switzer/Switzer-Extralight.otf", weight: "200", style: "normal" },
    { path: "../fonts/switzer/Switzer-ExtralightItalic.otf", weight: "200", style: "italic" },
    { path: "../fonts/switzer/Switzer-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/switzer/Switzer-LightItalic.otf", weight: "300", style: "italic" },
    { path: "../fonts/switzer/Switzer-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/switzer/Switzer-Italic.otf", weight: "400", style: "italic" },
    { path: "../fonts/switzer/Switzer-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/switzer/Switzer-MediumItalic.otf", weight: "500", style: "italic" },
    { path: "../fonts/switzer/Switzer-Semibold.otf", weight: "600", style: "normal" },
    { path: "../fonts/switzer/Switzer-SemiboldItalic.otf", weight: "600", style: "italic" },
    { path: "../fonts/switzer/Switzer-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/switzer/Switzer-BoldItalic.otf", weight: "700", style: "italic" },
    { path: "../fonts/switzer/Switzer-Extrabold.otf", weight: "800", style: "normal" },
    { path: "../fonts/switzer/Switzer-ExtraboldItalic.otf", weight: "800", style: "italic" },
    { path: "../fonts/switzer/Switzer-Black.otf", weight: "900", style: "normal" },
    { path: "../fonts/switzer/Switzer-BlackItalic.otf", weight: "900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Chronos | Knijff",
  description: "Uren- en facturatieportal van Knijff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${switzer.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
