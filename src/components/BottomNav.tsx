import { NavLink, useLocation } from "react-router-dom";
import { Home, Target, UtensilsCrossed, MessageCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/missoes", label: "Missões", icon: Target },
  { to: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { to: "/chat", label: "Let", icon: MessageCircle },
  { to: "/comunidade", label: "Comunidade", icon: Users },
];

export const BottomNav = () => {
  const loc = useLocation();
  // Hide on detail/sub pages? Keep visible on main routes only
  const hide = /^\/(missao|receita|perfil|notificacoes|admin|onboarding|auth)/.test(loc.pathname);
  if (hide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
