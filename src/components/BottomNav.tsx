import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import iconHome from "@/assets/icons/nav/home.svg";
import iconHomeActive from "@/assets/icons/nav/home_active.svg";
import iconDieta from "@/assets/icons/nav/dieta.svg";
import iconDietaActive from "@/assets/icons/nav/dieta_active.svg";
import iconComunidade from "@/assets/icons/nav/comunidade.svg";
import iconComunidadeActive from "@/assets/icons/nav/comunidade_active.svg";
import iconChat from "@/assets/icons/nav/chat.svg";
import iconChatActive from "@/assets/icons/nav/chat_active.svg";

type Tab = {
  to: string;
  label: string;
  icon: string;
  iconActive: string;
  badge?: number;
};

const tabs: Tab[] = [
  { to: "/home", label: "Início", icon: iconHome, iconActive: iconHomeActive },
  { to: "/dieta", label: "Cardápio", icon: iconDieta, iconActive: iconDietaActive },
  { to: "/comunidade", label: "Comunidade", icon: iconComunidade, iconActive: iconComunidadeActive },
  { to: "/chat", label: "Let", icon: iconChat, iconActive: iconChatActive },
];

export const BottomNav = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const hide = /^\/(missao|receita|perfil|notificacoes|audios|admin|onboarding|auth)/.test(loc.pathname);
  if (hide) return null;

  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  const renderTab = ({ to, label, icon, iconActive, badge }: Tab) => (
    <NavLink
      key={to}
      to={to}
      className="flex flex-1 flex-col items-center justify-start gap-1 pt-1"
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <img
              src={isActive ? iconActive : icon}
              alt=""
              className="h-9 w-9"
            />
            {badge && badge > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                {badge}
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "text-[11px] leading-none text-secondary",
              isActive ? "font-semibold" : "font-medium",
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
      style={{ height: "calc(72px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto flex h-[72px] max-w-md items-start justify-around px-2 pt-1.5">
        {left.map(renderTab)}

        <div className="flex flex-1 flex-col items-center justify-start">
          <button
            type="button"
            onClick={() => nav("/comunidade?novo=1")}
            aria-label="Criar post na comunidade"
            className="relative z-10 -mt-6 flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[20px] bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        {right.map(renderTab)}
      </div>
    </nav>
  );
};
