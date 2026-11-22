import type { Metadata } from "next";
import { DM_Sans, Domine } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const domine = Domine({ variable: "--font-domine", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Resonate",
  description: "Find who needs what you've already lived through.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${domine.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
