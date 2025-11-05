import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";

interface Agendamento {
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  dataAgendada: string;
}

interface ClienteRisco {
  nomeCliente: string;
  nomePet: string;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

export function ClientesEmRisco() {
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientesRisco, setClientesRisco] = useState<ClienteRisco[]>([]);
  const [filtroRisco, setFiltroRisco] = useState<string>("todos");
  const [filtroNome, setFiltroNome] = useState<string>("");
  const [mostrarFiltros, setMostrarFiltros] = useState<boolean>(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resAg = await fetch("/api/agendamentos");
        const agendamentosData: Agendamento[] = await resAg.json();

        const resPac = await fetch("/api/agendamentos_pacotes");
        const pacotesData: Agendamento[] = await resPac.json();

        const todosAgendamentos = [...agendamentosData, ...pacotesData];
        setAgendamentos(todosAgendamentos);

        const clientes = calcularClientesEmRisco(todosAgendamentos);
        setClientesRisco(clientes);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }

    carregarDados();
  }, []);

  const calcularClientesEmRisco = (agendamentos: Agendamento[]): ClienteRisco[] => {
    const clientesMap = new Map<string, Agendamento[]>();

    agendamentos.forEach((ag) => {
      const chave = `${ag.nomeCliente}_${ag.nomePet}`;
      if (!clientesMap.has(chave)) {
        clientesMap.set(chave, []);
      }
      clientesMap.get(chave)?.push(ag);
    });

    const clientesRisco: ClienteRisco[] = [];

    clientesMap.forEach((lista, chave) => {
      const ultimoAgendamento = lista.map((a) => parseISO(a.dataAgendada)).sort((a, b) => b.getTime() - a.getTime())[0];

      const diasSemAgendar = differenceInDays(new Date(), ultimoAgendamento);
      const faixaRisco = obterFaixaDeRisco(diasSemAgendar);
      const [nomeCliente, nomePet] = chave.split("_");

      clientesRisco.push({
        nomeCliente,
        nomePet,
        whatsapp: lista[0].whatsapp,
        ultimoAgendamento,
        diasSemAgendar,
        faixaRisco,
      });
    });

    return clientesRisco.sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);
  };

  const obterFaixaDeRisco = (dias: number): string => {
    if (dias <= 30) return "baixo";
    if (dias <= 60) return "moderado";
    if (dias <= 90) return "alto";
    return "crítico";
  };

  const obterLabelFaixa = (faixa: string): string => {
    const labels: Record<string, string> = {
      baixo: "Baixo (até 30 dias)",
      moderado: "Moderado (31 a 60 dias)",
      alto: "Alto (61 a 90 dias)",
      crítico: "Crítico (acima de 90 dias)",
    };
    return labels[faixa] || faixa;
  };

  const clientesFiltrados = clientesRisco.filter(
    (c) =>
      (filtroRisco === "todos" || c.faixaRisco === filtroRisco) &&
      (filtroNome === "" ||
        c.nomeCliente.toLowerCase().includes(filtroNome.toLowerCase()) ||
        c.nomePet.toLowerCase().includes(filtroNome.toLowerCase())),
  );

  const copiarLink = (whatsapp: string, nomeCliente: string) => {
    const numeroLimpo = whatsapp.replace(/\D/g, "");
    const mensagem = `Olá ${nomeCliente}, tudo bem? Notamos que faz um tempinho desde o último atendimento do seu pet. Que tal agendar um novo banho ou tosa com a gente?`;
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado",
      description: "Cole o link no navegador para abrir o WhatsApp.",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            {mostrarFiltros ? "Ocultar filtros" : "Mostrar filtros"}
          </Button>
        </CardHeader>

        {mostrarFiltros && (
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Buscar por nome do cliente ou pet"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
            />
            <Select value={filtroRisco} onValueChange={setFiltroRisco}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="moderado">Moderado</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="crítico">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        )}

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Cliente</th>
                  <th className="p-2 border">Pet</th>
                  <th className="p-2 border">WhatsApp</th>
                  <th className="p-2 border">Último Agendamento</th>
                  <th className="p-2 border">Dias sem Agendar</th>
                  <th className="p-2 border">Faixa de Risco</th>
                  <th className="p-2 border">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 border">{c.nomeCliente}</td>
                    <td className="p-2 border">{c.nomePet}</td>
                    <td className="p-2 border">{c.whatsapp}</td>
                    <td className="p-2 border">{format(c.ultimoAgendamento, "dd/MM/yyyy")}</td>
                    <td className="p-2 border text-center">{c.diasSemAgendar}</td>
                    <td
                      className={`p-2 border text-center font-semibold ${
                        c.faixaRisco === "baixo"
                          ? "text-green-600"
                          : c.faixaRisco === "moderado"
                            ? "text-yellow-600"
                            : c.faixaRisco === "alto"
                              ? "text-orange-600"
                              : "text-red-600"
                      }`}
                    >
                      {obterLabelFaixa(c.faixaRisco)}
                    </td>
                    <td className="p-2 border text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copiarLink(c.whatsapp, c.nomeCliente)}
                        title="Copiar link do WhatsApp"
                      >
                        <i className="fi fi-rr-link-alt text-lg" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientesFiltrados.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nenhum cliente encontrado com os filtros atuais.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
