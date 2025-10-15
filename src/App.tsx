import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Clientes from "./pages/Clientes";
import Racas from "./pages/Racas";
import Servicos from "./pages/Servicos";
import Pacotes from "./pages/Pacotes";
import Agendamentos from "./pages/Agendamentos";
import Relatorios from "./pages/Relatorios";
import Empresa from "./pages/Empresa";
import NotFound from "./pages/NotFound";
import Receitas from "./pages/Receitas";
import Despesas from "./pages/Despesas";
import ContasBancarias from "./pages/ContasBancarias";
import ControleFinanceiro from "./pages/ControleFinanceiro";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Agendamentos />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/racas" element={<Racas />} />
            <Route path="/pacotes" element={<Pacotes />} />
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/receitas" element={<Receitas />} />
            <Route path="/despesas" element={<Despesas />} />
            <Route path="/contas-bancarias" element={<ContasBancarias />} />
            <Route path="/controle-financeiro" element={<ControleFinanceiro />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
