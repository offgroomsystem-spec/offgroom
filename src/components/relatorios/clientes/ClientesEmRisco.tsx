// src/components/relatorios/clientes/ClientesEmRisco.tsx
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, isValid } from "date-fns";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ClienteEmRisco {
  id: string;
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

function determinarFaixa(dias: number) {
  if (dias >= 7 && dias <= 10) return "7-10";
  if (dias >= 11 && dias <= 15) return "11-15";
  if (dias >= 16 && dias <= 20) return "16-20";
  if (dias >= 21 && dias <= 30) return "21-30";
  if (dias >= 31 && dias <= 45) return "31-45";
  if (dias >= 46 && dias <= 90) return "46-90";
  if (dias > 90) return "perdido";
  return "sem-risco";
}

export function ClientesEmRisco() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteEmRisco[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteEmRisco[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros (recolhíveis)
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtroDias, setFiltroDias] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteEmRisco | null>(null);

  useEffect(() => {
    carregarClientesEmRisco();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const carregarClientesEmRisco = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Agendamentos regulares
      const { data: agendamentos, error: errorAg } = await supabase
        .from("agendamentos")
        .select("id, cliente, pet, data, whatsapp")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      if (errorAg) throw errorAg;

      // Pacotes (contêm um JSON/texto com várias datas dos serviços)
      const { data: pacotes, error: errorPac } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, nome_pet, whatsapp, servicos, data_venda")
        .eq("user_id", user.id);

      if (errorPac) throw errorPac;

      const mapa = new Map<string, ClienteEmRisco>();

      const adicionarOuAtualizar = (
        chave: string,
        nomeCliente: string,
        nomePet: string,
        whatsapp: any,
        dataStr: string,
      ) => {
        if (!dataStr) return;
        const parsed = parseISO(dataStr);
        if (!isValid(parsed)) return;

        const existente = mapa.get(chave);
        if (!existente) {
          mapa.set(chave, {
            id: chave,
            nomeCliente,
            nomePet,
            whatsapp: whatsapp ? whatsapp.toString() : "",
            ultimoAgendamento: parsed,
            diasSemAgendar: differenceInDays(hoje, parsed),
            faixaRisco: determinarFaixa(differenceInDays(hoje, parsed)),
          });
        } else {
          if (parsed > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = parsed;
            existente.diasSemAgendar = differenceInDays(hoje, parsed);
            existente.faixaRisco = determinarFaixa(existente.diasSemAgendar);
          }
        }
      };

      // Processa agendamentos regulares
      agendamentos?.forEach((a: any) => {
        const chave = `${a.cliente}_${a.pet}`;
        adicionarOuAtualizar(chave, a.cliente, a.pet, a.whatsapp, a.data);
      });

      // Processa pacotes: extrair as datas dentro do campo `servicos` (JSON) e pegar a maior (última) data
      pacotes?.forEach((p: any) => {
        const chave = `${p.nome_cliente}_${p.nome_pet}`;
        let ultimaDataServico: Date | null = null;

        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            const datasValidas = servicos.map((s: any) => parseISO(s.data)).filter((d: Date) => isValid(d));
            if (datasValidas.length > 0) {
              ultimaDataServico = new Date(Math.max(...datasValidas.map((d: Date) => d.getTime())));
            }
          }
        } catch (err) {
          // se JSON inválido, ignore e use data_venda abaixo como fallback
          console.error("Erro ao parsear servicos do pacote:", err);
        }

        const dataFinalStr = ultimaDataServico ? ultimaDataServico.toISOString().split("T")[0] : p.data_venda;
        adicionarOuAtualizar(chave, p.nome_cliente, p.nome_pet, p.whatsapp, dataFinalStr);
      });

      // Converter mapa para array e filtrar somente quem tem > = 7 dias sem agendar e sem agendamento futuro
      const lista = Array.from(mapa.values());

      // Remover clientes que possuam agendamento FUTURO (verificando ambos os conjuntos)
      const temAgendamentoFuturo = (cliente: ClienteEmRisco) => {
        const temReg = agendamentos?.some(
          (a: any) =>
            a.cliente === cliente.nomeCliente &&
            a.pet === cliente.nomePet &&
            isValid(parseISO(a.data)) &&
            parseISO(a.data) >= hoje,
        );
        const temPac = pacotes?.some((p: any) => {
          if (p.nome_cliente !== cliente.nomeCliente || p.nome_pet !== cliente.nomePet) return false;
          try {
            const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
            if (Array.isArray(servicos)) {
              return servicos.some((s: any) => isValid(parseISO(s.data)) && parseISO(s.data) >= hoje);
            }
          } catch {
            // fallback para data_venda
            return isValid(parseISO(p.data_venda)) && parseISO(p.data_venda) >= hoje;
          }
          return false;
        });

        return !!temReg || !!temPac;
      };

      const hojeZero = new Date();
      hojeZero.setHours(0, 0, 0, 0);

      const clientesEmRisco = lista
        .filter((c) => !temAgendamentoFuturo(c) && c.diasSemAgendar >= 7)
        .sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);

      setClientes(clientesEmRisco);
      setClientesFiltrados(clientesEmRisco);
    } catch (error) {
      console.error("Erro ao carregar clientes em risco:", error);
      toast.error("Erro ao carregar dados dos clientes");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...clientes];

    if (filtroDias) {
      const diasNum = Number(filtroDias);
      if (!Number.isNaN(diasNum)) resultado = resultado.filter((c) => c.diasSemAgendar >= diasNum);
    }

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(
        (c) => c.nomeCliente.toLowerCase().includes(termo) || c.nomePet.toLowerCase().includes(termo),
      );
    }

    if (dataInicio) {
      const inicio = parseISO(dataInicio);
      if (isValid(inicio)) resultado = resultado.filter((c) => c.ultimoAgendamento >= inicio);
    }

    if (dataFim) {
      const fim = parseISO(dataFim);
      if (isValid(fim)) resultado = resultado.filter((c) => c.ultimoAgendamento <= fim);
    }

    setClientesFiltrados(resultado);
    setFiltroAberto(false); // recolhe após aplicar
  };

  const limparFiltros = () => {
    setFiltroDias("");
    setBusca("");
    setDataInicio("");
    setDataFim("");
    setClientesFiltrados(clientes);
    setFiltroAberto(false); // recolhe também ao limpar
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderPlaceholder />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFiltroAberto((s) => !s)}
              className="flex items-center gap-2"
            >
              {filtroAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {filtroAberto ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          </div>
        </CardHeader>

        {filtroAberto && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Intervalo de Dias (mínimo)</label>
                <Input
                  type="number"
                  value={filtroDias}
                  onChange={(e) => setFiltroDias(e.target.value)}
                  placeholder="Ex: 7"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Buscar Cliente ou Pet</label>
                <Input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome cliente ou pet"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Data Início (Opcional)</label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Data Fim (Opcional)</label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={aplicarFiltros}>Filtrar</Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent>
          {clientesFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado com os filtros aplicados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Último Agendamento</TableHead>
                    <TableHead>Dias sem Agendar</TableHead>
                    <TableHead>Faixa de Risco</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {clientesFiltrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nomeCliente}</TableCell>
                      <TableCell>{c.nomePet}</TableCell>
                      <TableCell>{c.whatsapp}</TableCell>
                      <TableCell>{format(c.ultimoAgendamento, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{c.diasSemAgendar} dias</TableCell>
                      <TableCell>
                        <Badge variant={c.faixaRisco === "perdido" ? "destructive" : "secondary"}>{c.faixaRisco}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setClienteSelecionado(c)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Quando quiser trocar o ícone por LinkIcon ou outro, altere aqui */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copiarLinkParaClipboard(c)}
                            title="Copiar link do WhatsApp"
                          >
                            <span className="text-lg">🔗</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {clienteSelecionado && (
        <ModalDetalhesCliente aberto={true} cliente={clienteSelecionado} onFechar={() => setClienteSelecionado(null)} />
      )}
    </div>
  );
}

// helper: copiar link com mensagem (padrão simples)
function copiarLinkParaClipboard(cliente: ClienteEmRisco) {
  if (!cliente.whatsapp) return toast.error("Número de WhatsApp não informado");
  const numeroLimpo = cliente.whatsapp.toString().replace(/\D/g, "");
  const numeroCompleto = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

  const mensagem = encodeURIComponent(
    `Olá ${cliente.nomeCliente}! Notamos que faz ${cliente.diasSemAgendar} dias desde o último banho de ${cliente.nomePet}.`,
  );
  const link = `https://wa.me/${numeroCompleto}?text=${mensagem}`;

  navigator.clipboard
    .writeText(link)
    .then(() => {
      toast.success("✅ Link copiado! Cole no navegador (Ctrl+V) para abrir o WhatsApp");
    })
    .catch(() => {
      toast.error("Erro ao copiar link para a área de transferência");
    });
}

// simples placeholder do loader (import separado pode causar problemas dependendo do seu setup)
function LoaderPlaceholder() {
  return <div className="h-8 w-8 rounded border-t-2 border-primary animate-spin" />;
}

// Exporte também como default para evitar erros de importação nomeada/defaul
export default ClientesEmRisco;
