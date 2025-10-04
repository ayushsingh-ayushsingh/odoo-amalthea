import { Montserrat } from "next/font/google";
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from "@/components/ui/theme-provider";

import "./globals.css";

const fontSans = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "400"
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <NextTopLoader
          color="#a48fff"
          initialPosition={0.08}
          crawlSpeed={300}
          crawl={true}
          showSpinner={false}
          showAtBottom={false}
          height={2}
          easing="ease"
          speed={200}
          zIndex={1600}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
