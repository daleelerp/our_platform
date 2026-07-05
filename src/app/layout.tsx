import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cairo } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/UserProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Toaster } from "react-hot-toast";

// Plus Jakarta Sans for English (polished, modern, great weight range)
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Cairo for Arabic (excellent Arabic font support)
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daleel - ERP Learning Paths",
  description: "Your guide to mastering ERP systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body
        className={`${jakarta.variable} ${cairo.variable} font-sans antialiased`}
      >
        <UserProvider>
          <LanguageProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </LanguageProvider>
        </UserProvider>
      </body>
    </html>
  );
}
