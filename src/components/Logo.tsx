import { cn } from "@/lib/utils";
import logoLight from "@/assets/letclub-logo-light.png";
import logoDark from "@/assets/letclub-logo-dark.png";

/**
 * LETClub logo. Uses the dark-text version for light backgrounds and the
 * white version for dark backgrounds. `variant="auto"` swaps via the `.dark`
 * class on `<html>`.
 */
type Props = {
  className?: string;
  variant?: "auto" | "light" | "dark";
};

export const Logo = ({ className, variant = "auto" }: Props) => {
  if (variant === "light") {
    // logo for use ON light backgrounds (dark text)
    return <img src={logoLight} alt="LETClub" className={cn("h-auto w-full select-none", className)} draggable={false} />;
  }
  if (variant === "dark") {
    // logo for use ON dark backgrounds (white text)
    return <img src={logoDark} alt="LETClub" className={cn("h-auto w-full select-none", className)} draggable={false} />;
  }
  return (
    <>
      <img src={logoLight} alt="LETClub" className={cn("h-auto w-full select-none dark:hidden", className)} draggable={false} />
      <img src={logoDark} alt="LETClub" className={cn("hidden h-auto w-full select-none dark:block", className)} draggable={false} />
    </>
  );
};

export default Logo;