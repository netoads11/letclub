import { useAuth } from "@/lib/auth";
import { Navigate, useLocation } from "react-router-dom";

export const RequireAuth = ({ children, requireOnboarding = true, admin = false }: { children: JSX.Element; requireOnboarding?: boolean; admin?: boolean }) => {
  const { user, profile, isAdmin, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  if (admin && !isAdmin) return <Navigate to="/home" replace />;
  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};
