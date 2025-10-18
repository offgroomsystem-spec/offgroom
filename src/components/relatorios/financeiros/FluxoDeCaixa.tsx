import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard } from "../shared/KPICard";
import { ExportButton } from "../shared/ExportButton";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface FluxoDeCaixaProps {
  filtros: Filtros;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const aplicarFiltros = (item: any, filtros: Filtros): boolean => {
  if (!filtros.periodo || filtros.periodo === "todos") return true;
  
  const dataItem = new Date(item.dataPagamento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  switch (filtros.periodo) {
    case "hoje":
      return dataItem.toDateString() === hoje.toDateString();
    case "semana":
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      return dataItem >= inicioSemana;
    case "mes":
      return dataItem.getMonth() === hoje.getMonth() && 
             dataItem.getFullYear() === hoje.getFullYear();
    case "trimestre":
      const trimestreAtual = Math.floor(hoje.getMonth() / 3);
      const trimestreItem = Math.floor(dataItem.getMonth() / 3);
      return trimestreItem === trimestreAtual && 
             dataItem.getFullYear() === hoje.getFullYear();
    case "ano":
      return dataItem.getFullYear() === hoje.getFullYear();
    case "customizado":
      if (!filtros.dataInicio && !filtros.dataFim) return true;
      if (filtros.dataInicio && !filtros.dataFim) {
        return dataItem >= new Date(filtros.dataInicio);
      }
      if (!filtros.dataInicio && filtros.dataFim) {
        return dataItem <= new Date(filtros.dataFim);
      }
      return dataItem >= new Date(filtros.dataInicio) && 
             dataItem <= new Date(filtros.dataFim);
    default:
      return true;
  }
};

export const FluxoDeCaixa = ({ filtros }: FluxoDeCaixaProps) => {
  const lancamentos = useMemo(() => {
    const data = localStorage.getItem('lancamentos_financeiros');
    return data ? JSON.parse(data) : [];
  }, []);

  const linhasFluxo = useMemo(() => {
    const lancamentosFiltrados = lancamentos
      .filter((l: any) => l.pago && aplicarFiltros(l, filtros))
      .sort((a: any, b: any) => new Date(a.dataPagamento).getTime() - new Date(b.dataPagamento).getTime());

    let saldoAcumulado = 0;

    return lancamentosFiltrados.map((l: any) => {
      const entrada = l.tipo === "Receita" ? l.valorTotal || 0 : 0;
      const saida = l.tipo === "Despesa" ? l.valorTotal || 0 : 0;
      saldoAcumulado += (entrada - saida);
      
      return {
        data: l.dataPagamento,
        descricao: `${l.descricao1} - ${l.nomeCliente || ''} ${l.nomePet ? '/ ' + l.nomePet : ''}`,
        entrada,
        saida,
        saldo: saldoAcumulado
      };
    });
  }, [lancamentos, filtros]);

  const resumo = useMemo(() => {
    const saldoInicial = 0; // Pode ser configurável
    const totalEntradas = linhasFluxo.reduce((acc, l) => acc + l.entrada, 0);
    const totalSaidas = linhasFluxo.reduce((acc, l) => acc + l.saida, 0);
    const saldoFinal = saldoInicial + totalEntradas - totalSaidas;

    return {
      saldoInicial,
      totalEntradas,
      totalSaidas,
      saldoFinal
    };
  }, [linhasFluxo]);

  const dadosExportacao = linhasFluxo.map(l => ({
    data: format(new Date(l.data), 'dd/MM/yyyy'),
    descricao: l.descricao,
    entrada: l.entrada,
    saida: l.saida,
    saldo: l.saldo
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>
        <ExportButton 
          data={dadosExportacao}
          filename="fluxo_caixa"
          columns={[
            { key: 'data', label: 'Data' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'entrada', label: 'Entrada' },
            { key: 'saida', label: 'Saída' },
            { key: 'saldo', label: 'Saldo' }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          titulo="Saldo Inicial" 
          valor={resumo.saldoInicial}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard 
          titulo="Total Entradas" 
          valor={resumo.totalEntradas}
          icon={<TrendingUp className="h-4 w-4" />}
          cor="green"
        />
        <KPICard 
          titulo="Total Saídas" 
          valor={resumo.totalSaidas}
          icon={<TrendingDown className="h-4 w-4" />}
          cor="red"
        />
        <KPICard 
          titulo="Saldo Final" 
          valor={resumo.saldoFinal}
          icon={<DollarSign className="h-4 w-4" />}
          cor={resumo.saldoFinal >= 0 ? 'green' : 'red'}
          destaque
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Saída</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasFluxo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma movimentação encontrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  linhasFluxo.map((linha, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(linha.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{linha.descricao}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {linha.entrada > 0 ? formatCurrency(linha.entrada) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {linha.saida > 0 ? formatCurrency(linha.saida) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(linha.saldo)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
