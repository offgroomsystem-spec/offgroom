import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "../shared/KPICard";
import { ExportButton } from "../shared/ExportButton";
import { format } from "date-fns";
import { Clock, AlertCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface InadimplenciaProps {
  filtros: Filtros;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const Inadimplencia = ({ filtros }: InadimplenciaProps) => {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<any[]>([]);

  useEffect(() => {
    const loadLancamentos = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('lancamentos_financeiros')
        .select('*')
        .eq('user_id', user.id);
      setLancamentos(data || []);
    };
    loadLancamentos();
  }, [user]);

  const contas = useMemo(() => {
    const hoje = new Date();

    const contasNaoPagas = lancamentos.filter((l: any) => l.tipo === "Receita" && !l.pago);

    const contasVencidas = contasNaoPagas
      .filter((c: any) => new Date(c.dataPagamento) < hoje)
      .map((c: any) => ({
        ...c,
        diasAtraso: Math.floor((hoje.getTime() - new Date(c.dataPagamento).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a: any, b: any) => b.diasAtraso - a.diasAtraso);

    const contasAVencer = contasNaoPagas
      .filter((c: any) => new Date(c.dataPagamento) >= hoje)
      .sort((a: any, b: any) => new Date(a.dataPagamento).getTime() - new Date(b.dataPagamento).getTime());

    const totalVencido = contasVencidas.reduce((acc: number, c: any) => acc + (c.valorTotal || 0), 0);
    const totalAVencer = contasAVencer.reduce((acc: number, c: any) => acc + (c.valorTotal || 0), 0);
    const totalReceber = totalVencido + totalAVencer;

    return {
      contasVencidas,
      contasAVencer,
      totalVencido,
      totalAVencer,
      totalReceber
    };
  }, [lancamentos]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inadimplência e Contas a Receber</h2>
        <ExportButton 
          data={[...contas.contasVencidas, ...contas.contasAVencer]}
          filename="inadimplencia"
          columns={[
            { key: 'nomeCliente', label: 'Cliente' },
            { key: 'nomePet', label: 'Pet' },
            { key: 'descricao1', label: 'Serviço' },
            { key: 'dataPagamento', label: 'Vencimento' },
            { key: 'valorTotal', label: 'Valor' }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          titulo="Total a Receber" 
          valor={contas.totalReceber}
          icon={<Clock className="h-4 w-4" />}
        />
        <KPICard 
          titulo="Vencidos" 
          valor={contas.totalVencido}
          icon={<AlertCircle className="h-4 w-4" />}
          cor="red"
          destaque
        />
        <KPICard 
          titulo="A Vencer" 
          valor={contas.totalAVencer}
          icon={<Calendar className="h-4 w-4" />}
          cor="yellow"
        />
      </div>

      <Tabs defaultValue="vencidos">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vencidos">
            Vencidos ({contas.contasVencidas.length})
          </TabsTrigger>
          <TabsTrigger value="avencer">
            A Vencer ({contas.contasAVencer.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="vencidos">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Contas Vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pet</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dias Atraso</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contas.contasVencidas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma conta vencida
                        </TableCell>
                      </TableRow>
                    ) : (
                      contas.contasVencidas.map((conta: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{conta.nomeCliente}</TableCell>
                          <TableCell>{conta.nomePet}</TableCell>
                          <TableCell>{conta.descricao1}</TableCell>
                          <TableCell>{format(new Date(conta.dataPagamento), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-red-600 dark:text-red-400 font-semibold">
                            {conta.diasAtraso} dias
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(conta.valorTotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="avencer">
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-400">Contas a Vencer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pet</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contas.contasAVencer.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma conta a vencer
                        </TableCell>
                      </TableRow>
                    ) : (
                      contas.contasAVencer.map((conta: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{conta.nomeCliente}</TableCell>
                          <TableCell>{conta.nomePet}</TableCell>
                          <TableCell>{conta.descricao1}</TableCell>
                          <TableCell>{format(new Date(conta.dataPagamento), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(conta.valorTotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
