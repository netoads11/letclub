import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import iconMaca from "@/assets/icons/maca.svg";
import iconComunidade from "@/assets/icons/comunidade.svg";
import iconChatLet from "@/assets/icons/chat-let.svg";

type Tab = {
  to: string;
  label: string;
  render: (active: boolean) => JSX.Element;
  badge?: number;
};

const HomeIcon = () => <Home className="h-[22px] w-[22px] text-secondary" strokeWidth={2.2} />;
const ImgIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} className="h-[22px] w-[22px] object-contain" />
);

const tabs: Tab[] = [
  { to: "/home", label: "Início", render: () => <HomeIcon /> },
  { to: "/dieta", label: "Cardápio", render: () => <ImgIcon src={iconMaca} alt="" /> },
  { to: "/comunidade", label: "Comunidade", badge: 3, render: () => <ImgIcon src={iconComunidade} alt="" /> },
  { to: "/chat", label: "Let", render: () => <ImgIcon src={iconChatLet} alt="" /> },
];

export const BottomNav = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const hide = /^\/(missao|receita|perfil|notificacoes|admin|onboarding|auth)/.test(loc.pathname);
  if (hide) return null;

  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  const renderTab = ({ to, label, render, badge }: Tab) => (
    <NavLink
      key={to}
      to={to}
      className="flex flex-1 flex-col items-center justify-start gap-1 pt-1"
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
              isActive ? "bg-secondary/20" : "bg-muted/60",
            )}
          >
            {render(isActive)}
            {badge ? (
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
      style={{ height: "calc(86px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto flex h-[86px] max-w-md items-start justify-around px-2 pt-2">
        {left.map(renderTab)}

        <div className="flex flex-1 flex-col items-center justify-start">
          <button
            type="button"
            onClick={() => nav("/missoes")}
            aria-label="Ações rápidas"
            className="relative z-10 -mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        {right.map(renderTab)}
      </div>
    </nav>
  );
};
