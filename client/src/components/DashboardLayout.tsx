import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/features/auth/useAuth";
import { LogOut } from "lucide-react";

const C = {
  brown:    "#333333",
  bege1:    "#B3B3B3",
  bege2:    "#CCCCCC",
  bege3:    "#E6E6E6",
  offwhite: "#F2F2F2",
  white:    "#FFFFFF",
} as const;

type DashboardLayoutProps = {
  children: ReactNode;
  navItems?: { label: string; href: string }[];
};

export default function DashboardLayout({
  children,
  navItems = [],
}: DashboardLayoutProps) {
  const { logout, profile } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.offwhite, fontFamily: "'Fira Sans', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* Header */}
      <header style={{ backgroundColor: C.white, borderBottom: `1px solid ${C.bege3}` }}>
        <div className="relative mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4 sm:px-8">

          {/* Brand (left) */}
          <div className="flex flex-col">
          </div>

          <img
            src="/logo_joseph.png"
            alt="Joseph Atelier"
            className="absolute left-1/2 -translate-x-1/2 h-8 object-contain"
          />

          {/* Right: role badge + logout */}
          <div className="flex items-center gap-4">
            <button type="button" onClick={logout}
              className="flex items-center gap-1.5 text-[10px] font-light tracking-[0.3em] uppercase transition hover:opacity-50"
              style={{ color: C.bege1, background: "none", border: "none", cursor: "pointer" }}>
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Nav tabs (mobile) */}
        {navItems.length > 0 && (
          <div className="flex gap-0 overflow-x-auto border-t sm:hidden" style={{ borderColor: C.bege3 }}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className="flex-1 whitespace-nowrap px-4 py-2.5 text-center text-[9px] font-light tracking-[0.3em] uppercase transition"
                  style={{
                    color: isActive ? C.brown : C.bege1,
                    borderBottom: isActive ? `2px solid ${C.brown}` : "2px solid transparent",
                    textDecoration: "none",
                  }}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
