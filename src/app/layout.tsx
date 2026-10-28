import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "proxi. • University GPS Geofence Attendance",
  description:
    "Proximity-based verified GPS classroom attendance management system for Obafemi Awolowo University faculty and students.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans bg-proxi-bg text-proxi-ink antialiased flex flex-col selection:bg-emerald-100 selection:text-emerald-900 relative">
        {/* Ambient background decoration */}
        <div
          className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-60"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-32 w-96 h-96 bg-teal-100/35 rounded-full blur-3xl" />
        </div>

        <AuthProvider>
          <ToastProvider>
            <Navigation />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
              {children}
            </main>
            <footer className="border-t border-proxi-line bg-white/80 backdrop-blur-sm py-8 text-center text-xs text-proxi-muted">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
                <p className="font-bold tracking-widest text-[11px] uppercase text-proxi-ink/80 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-proxi-green animate-pulse" />
                  proxi. • Proximity-Based Campus Attendance
                </p>
                <p className="text-proxi-muted text-[11px]">
                  Department of Computer Science & Engineering • Obafemi Awolowo University, Ile-Ife
                </p>
                <p className="text-[10px] text-gray-400">
                  Server-side Haversine verification • Sub-50m GPS filtering • Duplicate check-in prevention
                </p>
              </div>
            </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
