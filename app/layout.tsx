import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEDrecord FHIR R4 Server",
  description: "Dutch ZIB (nl-core) compliant FHIR R4 API for secure healthcare data exchange. Built by MEDrecord - eHealth platform as a Service.",
  keywords: ["FHIR", "HL7", "Dutch ZIB", "nl-core", "healthcare", "API", "MEDrecord", "eHealth"],
};

export const viewport: Viewport = {
  themeColor: "#2C5F9B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${ibmPlexSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
