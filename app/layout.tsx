import type { Metadata } from "next";
import { IM_Fell_English, Nunito } from "next/font/google";
import "./globals.css";

const storybook = IM_Fell_English({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-storybook" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Pocket Dungeon",
  description: "Name three objects. Escape the strange little room they make.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${storybook.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
