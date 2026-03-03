import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FSQA Management Portal",
  description: "Goodness Gardens Food Safety & Quality Assurance Management Portal",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#166534" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
