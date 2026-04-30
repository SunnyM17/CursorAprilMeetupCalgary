import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Idea → Jira",
  description: "Turn an idea into a team-optimized Jira project plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');}catch{}})();`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <ToastProvider>
          <header className="border-b border-border">
            <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-5 h-5 text-accent" />
                Idea → Jira
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
