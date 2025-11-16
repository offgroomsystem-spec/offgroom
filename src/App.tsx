import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Clientes from "./pages/Clientes";
import Racas from "./pages/Racas";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Pacotes from "./pages/Pacotes";
import Agendamentos from "./pages/Agendamentos";
import Relatorios from "./pages/Relatorios";
import Empresa from "./pages/Empresa";
import NotFound from "./pages/NotFound";
import ContasBancarias from "./pages/ContasBancarias";
import ControleFinanceiro from "./pages/ControleFinanceiro";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            
            {/* Rotas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Agendamentos />} />
                <Route path="/agendamentos" element={<Agendamentos />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/racas" element={<Racas />} />
                <Route path="/pacotes" element={<Pacotes />} />
                <Route path="/empresa" element={<Empresa />} />
                <Route path="/contas-bancarias" element={<ContasBancarias />} />
                <Route path="/controle-financeiro" element={<ControleFinanceiro />} />
                <Route path="/relatorios" element={<Relatorios />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
