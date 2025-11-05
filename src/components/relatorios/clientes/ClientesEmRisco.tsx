import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";

export default function ClientesEmRisco() {
  const { user } = useAuth();

  const [dados, setDados] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [intervaloDias, setIntervaloDias] = useState(90);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);

  const carregarDados = async () => {
    setLoading(true);

    try {
      const { data: agendamentos, error: errorAg } = await supabase.from("agendamentos").select("*");
      const { data: pacotes, error: errorPac } = await supabase.from("agendamentos_pacotes").select("*");

      if (errorAg) throw errorAg;
      if (errorPac) throw errorPac;

      const hoje = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(hoje.getDate() - intervaloDias);

      const todosAgendamentos = [...(agendamentos || []), ...(pacotes || [])];

      // Agrupar por cliente
      const clientesMap = new Map<string, any>();

      todosAgendamentos.forEach((item) => {
        const nomeCliente = item.nomeCliente?.trim();
        const nomePet = item.nomePet?.trim();
        const dataServico = new Date(item.data);
        if (!nomeCliente || isNaN(dataServico.getTime())) return;

        if (!clientesMap.has(nomeCliente)) {
          clientesMap.set(nomeCliente, {
            nomeCliente,
            nomePet,
            ultimoAgendamento: dataServico,
            telefone: item.telefone || "",
          });
        } else {
          const existente = clientesMap.get(nomeCliente);
          if (dataServico > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = dataServico;
          }
        }
      });

      // Clientes que não aparecem há X dias
      const clientesEmRisco = Array.from(clientesMap.values()).filter((c) => {
        return c.ultimoAgendamento < dataLimite;
      });

      setDados(clientesEmRisco);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar os dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const dadosFiltrados = useMemo(() => {
    let filtrados = dados;

    if (busca.trim() !== "") {
      filtrados = filtrados.filter(
        (item) =>
          item.nomeCliente?.toLowerCase().includes(busca.toLowerCase()) ||
          item.nomePet?.toLowerCase().includes(busca.toLowerCase()),
      );
    }

    if (dataInicio) {
      const inicio = new Date(dataInicio);
      filtrados = filtrados.filter((item) => item.ultimoAgendamento >= inicio);
    }

    if (dataFim) {
      const fim = new Date(dataFim);
      filtrados = filtrados.filter((item) => item.ultimoAgendamento <= fim);
    }

    return filtrados.sort((a, b) => a.ultimoAgendamento.getTime() - b.ultimoAgendamento.getTime());
  }, [dados, busca, dataInicio, dataFim]);

  const limparFiltros = () => {
    setBusca("");
    setDataInicio("");
    setDataFim("");
    setIntervaloDias(90);
    setFiltroAberto(false);
    carregarDados();
  };

  const aplicarFiltros = () => {
    setFiltroAberto(false);
    carregarDados();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Clientes em Risco</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setFiltroAberto(!filtroAberto)}>
              {filtroAberto ? "Recolher Filtros" : "Filtrar"}
            </Button>
          </div>
        </CardHeader>

        {filtroAberto && (
          <CardContent className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Intervalo de Dias</label>
                <Input
                  type="number"
                  value={intervaloDias}
                  onChange={(e) => setIntervaloDias(Number(e.target.value))}
                  placeholder="Ex: 90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Buscar Cliente ou Pet</label>
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Início (Opcional)</label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data Fim (Opcional)</label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={aplicarFiltros}>Filtrar</Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}

        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : dadosFiltrados.length === 0 ? (
            <p>Nenhum cliente em risco encontrado.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Cliente</th>
                  <th className="p-2 text-left">Pet</th>
                  <th className="p-2 text-left">Último Agendamento</th>
                  <th className="p-2 text-left">Telefone</th>
                  <th className="p-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{item.nomeCliente}</td>
                    <td className="p-2">{item.nomePet}</td>
                    <td className="p-2">{item.ultimoAgendamento.toLocaleDateString("pt-BR")}</td>
                    <td className="p-2">{item.telefone}</td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => setClienteSelecionado(item)}>
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {clienteSelecionado && (
        <ModalDetalhesCliente cliente={clienteSelecionado} onClose={() => setClienteSelecionado(null)} />
      )}
    </div>
  );
}
