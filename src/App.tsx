import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Missoes from "./pages/Missoes";
import MissaoDetalhe from "./pages/MissaoDetalhe";
import Dieta from "./pages/Dieta";
import ReceitaDetalhe from "./pages/ReceitaDetalhe";
import Chat from "./pages/Chat";
import Comunidade from "./pages/Comunidade";
import Perfil from "./pages/Perfil";
import Notificacoes from "./pages/Notificacoes";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner theme="dark" position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<RequireAuth requireOnboarding={false}><Onboarding /></RequireAuth>} />
            <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/missoes" element={<RequireAuth><Missoes /></RequireAuth>} />
            <Route path="/missao/:id" element={<RequireAuth><MissaoDetalhe /></RequireAuth>} />
            <Route path="/dieta" element={<RequireAuth><Dieta /></RequireAuth>} />
            <Route path="/receita/:id" element={<RequireAuth><ReceitaDetalhe /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/comunidade" element={<RequireAuth><Comunidade /></RequireAuth>} />
            <Route path="/perfil" element={<RequireAuth><Perfil /></RequireAuth>} />
            <Route path="/notificacoes" element={<RequireAuth><Notificacoes /></RequireAuth>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAuth admin requireOnboarding={false}><Admin /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
