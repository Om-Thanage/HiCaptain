import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata: Metadata = {
  title: "HiCaptain - Project Management Platform",
  description: "A modern project management platform for admins, project managers, developers, and clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className="font-sans antialiased"
        suppressHydrationWarning={true}
      >
        <DashboardLayout>{children}</DashboardLayout>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#231b20',
              color: '#ffffff',
              border: '1px solid #3d3239',
            },
          }}
        />
      </body>
    </html>
  );
}
