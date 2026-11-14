import type { Metadata } from "next";
import { Barlow, Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AstroBase Academy — Junior Astronaut Mission Trainer",
  description:
    "Construis et gère une colonie lunaire ou martienne. Équilibre oxygène, énergie, nourriture et radiations — comme un vrai ingénieur de mission.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-space-bg text-foreground">
        {children}
      </body>
    </html>
  );
}
