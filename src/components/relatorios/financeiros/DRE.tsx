import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface DREProps {
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
  
  switch (filtros.periodo) {
    case "mes":
      return dataItem.getMonth() === hoje.getMonth() && 
             dataItem.getFullYear() === hoje.getFullYear();
    case "ano":
      return dataItem.getFullYear() === hoje.getFullYear();
    default:
      return true;
  }
};

interface DRERowProps {
  titulo: string;
  valor: number | string;
  nivel: number;
  destaque?: boolean;
  cor?: 'default' | 'green' | 'red';
}

const DRERow = ({ titulo, valor, nivel, destaque, cor = 'default' }: DRERowProps) => {
  const indentClass = nivel === 1 ? '' : nivel === 2 ? 'pl-4' : 'pl-8';
  const fontClass = destaque ? 'font-bold text-lg' : nivel === 1 ? 'font-semibold' : '';
  const corClass = cor === 'green' ? 'text-green-600 dark:text-green-400' : 
                    cor === 'red' ? 'text-red-600 dark:text-red-400' : '';

  return (
    <div className={`flex justify-between py-2 ${indentClass} ${fontClass} ${corClass}`}>
      <span>{titulo}</span>
      <span>{typeof valor === 'number' ? formatCurrency(valor) : valor}</span>
    </div>
  );
};

export const DRE = ({ filtros }: DREProps) => {
  const lancamentos = useMemo(() => {
    const data = localStorage.getItem('lancamentos_financeiros');
    return data ? JSON.parse(data) : [];
  }, []);

  const dre = useMemo(() => {
    const receitaBruta = lancamentos
      .filter((l: any) => l.tipo === "Receita" && l.pago && aplicarFiltros(l, filtros))
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const deducoes = 0; // Pode ser implementado depois

    const receitaLiquida = receitaBruta - deducoes;

    const custosVariaveis = lancamentos
      .filter((l: any) => 
        l.tipo === "Despesa" && 
        l.descricao1 === "Despesa Variável" && 
        l.pago && 
        aplicarFiltros(l, filtros)
      )
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const margemContribuicao = receitaLiquida - custosVariaveis;
    const margemBrutaPct = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

    const custosFixos = lancamentos
      .filter((l: any) => 
        l.tipo === "Despesa" && 
        l.descricao1 === "Despesa Fixa" && 
        l.pago && 
        aplicarFiltros(l, filtros)
      )
      .reduce((acc: number, l: any) => acc + (l.valorTotal || 0), 0);

    const lucroLiquido = margemContribuicao - custosFixos;
    const margemLiquidaPct = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      custosVariaveis,
      margemContribuicao,
      margemBrutaPct,
      custosFixos,
      lucroLiquido,
      margemLiquidaPct
    };
  }, [lancamentos, filtros]);

  const getPeriodoTexto = () => {
    const hoje = new Date();
    switch (filtros.periodo) {
      case "mes":
        return `${hoje.toLocaleString('pt-BR', { month: 'long' })} de ${hoje.getFullYear()}`;
      case "ano":
        return `Ano de ${hoje.getFullYear()}`;
      default:
        return "Período selecionado";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Demonstrativo de Resultado (DRE)</h2>

      <Card>
        <CardHeader>
          <CardTitle>DRE Gerencial</CardTitle>
          <CardDescription>{getPeriodoTexto()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <DRERow titulo="(+) Receita Bruta" valor={dre.receitaBruta} nivel={1} />
            <DRERow titulo="(-) Deduções" valor={dre.deducoes} nivel={2} />
            <Separator className="my-2" />
            <DRERow titulo="(=) Receita Líquida" valor={dre.receitaLiquida} nivel={1} destaque />
            
            <div className="pt-4" />
            <DRERow titulo="(-) Custos Variáveis" valor={dre.custosVariaveis} nivel={2} />
            <Separator className="my-2" />
            <DRERow titulo="(=) Margem de Contribuição" valor={dre.margemContribuicao} nivel={1} />
            <DRERow titulo="Margem Bruta %" valor={`${dre.margemBrutaPct.toFixed(2)}%`} nivel={3} />
            
            <div className="pt-4" />
            <DRERow titulo="(-) Custos Fixos" valor={dre.custosFixos} nivel={2} />
            <Separator className="my-2" />
            <DRERow 
              titulo="(=) Lucro Líquido" 
              valor={dre.lucroLiquido} 
              nivel={1} 
              destaque 
              cor={dre.lucroLiquido >= 0 ? "green" : "red"}
            />
            <DRERow 
              titulo="Margem Líquida %" 
              valor={`${dre.margemLiquidaPct.toFixed(2)}%`} 
              nivel={3}
              cor={dre.margemLiquidaPct >= 0 ? "green" : "red"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Análise de Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Receita Líquida</p>
              <p className="text-2xl font-bold">{formatCurrency(dre.receitaLiquida)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Bruta</p>
              <p className="text-2xl font-bold">{dre.margemBrutaPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className={`text-2xl font-bold ${dre.margemLiquidaPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {dre.margemLiquidaPct.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
