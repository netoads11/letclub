import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Apple, MessageCircle, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  badge?: number;
};

const tabs: Tab[] = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/dieta", label: "Cardápio", icon: Apple },
  { to: "/comunidade", label: "Comunidade", icon: Users, badge: 3 },
  { to: "/chat", label: "Let", icon: MessageCircle },
];

export const BottomNav = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const hide = /^\/(missao|receita|perfil|notificacoes|admin|onboarding|auth)/.test(loc.pathname);
  if (hide) return null;

  // Split tabs around the center FAB: 2 left, then FAB, then 2 right.
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  const renderTab = ({ to, label, icon: Icon, badge }: Tab) => (
    <NavLink
      key={to}
      to={to}
      className="flex flex-1 items-center justify-center"
    >
      {({ isActive }) => (
        <div
          className={cn(
            "relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-medium text-secondary transition-colors",
            isActive && "bg-secondary/15",
          )}
        >
          <div className="relative">
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
            {badge ? (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {badge}
              </span>
            ) : null}
          </div>
          <span>{label}</span>
        </div>
      )}
    </NavLink>
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
      style={{ height: "calc(76px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto flex h-[76px] max-w-md items-center justify-around px-2">
        {left.map(renderTab)}

        {/* Center FAB */}
        <button
          type="button"
          onClick={() => nav("/missoes")}
          aria-label="Ações rápidas"
          className="relative z-10 -mt-8 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-4 ring-card transition-transform active:scale-95"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>

        {right.map(renderTab)}
      </div>
    </nav>
  );
};
