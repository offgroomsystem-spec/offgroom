import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Package, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { ExportButton } from "../shared/ExportButton";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProdutoVencimento {
  id: string;
  produtoId: string;
  codigo: string;
  nome: string;
  quantidade: number;
  dataValidade: Date;
  diasParaVencer: number;
  status: "vencido" | "vencendo";
}

interface Filtros {
  produto: string;
  status: string;
  diasAlerta: number;
}

export const ProdutosProximosVencimento = () => {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<ProdutoVencimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    produto: "",
    status: "todos",
    diasAlerta: 30,
  });

  const loadProdutosVencimento = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      // Buscar todos os itens de compras com validade
      const { data: itensCompra, error } = await supabase
        .from('compras_nf_itens')
        .select(`
          id,
          produto_id,
          quantidade,
          data_validade,
          nf_id,
          compras_nf!inner (
            user_id
          )
        `)
        .not('data_validade', 'is', null);
      
      if (error) throw error;
      
      // Filtrar apenas do usuário atual
      const itensDoUsuario = (itensCompra || []).filter(
        (item: any) => item.compras_nf?.user_id === user.id
      );
      
      // Buscar produtos para obter código e nome
      const { data: produtosData, error: errorProdutos } = await supabase
        .from('produtos')
        .select('id, codigo, nome')
        .eq('user_id', user.id);
      
      if (errorProdutos) throw errorProdutos;
      
      // Criar mapa de produtos
      const produtosMap = new Map();
      (produtosData || []).forEach(p => {
        produtosMap.set(p.id, { codigo: p.codigo, nome: p.nome });
      });
      
      // Agrupar por produto + data_validade (cada lote é separado)
      const lotesMap = new Map<string, ProdutoVencimento>();
      
      itensDoUsuario.forEach((item: any) => {
        const dataValidade = new Date(item.data_validade);
        dataValidade.setHours(0, 0, 0, 0);
        
        const diasParaVencer = differenceInDays(dataValidade, hoje);
        const produto = produtosMap.get(item.produto_id);
        
        if (!produto) return;
        
        // Chave única: produto + data de validade
        const chave = `${item.produto_id}-${item.data_validade}`;
        
        // Determinar status
        let status: "vencido" | "vencendo" | null = null;
        if (diasParaVencer < 0) {
          status = "vencido";
        } else if (diasParaVencer <= filtros.diasAlerta) {
          status = "vencendo";
        }
        
        // Só adicionar se estiver na janela de alerta ou vencido
        if (status) {
          if (lotesMap.has(chave)) {
            // Somar quantidade ao lote existente
            const loteExistente = lotesMap.get(chave)!;
            loteExistente.quantidade += Number(item.quantidade);
          } else {
            // Criar novo registro de lote
            lotesMap.set(chave, {
              id: chave,
              produtoId: item.produto_id,
              codigo: produto.codigo,
              nome: produto.nome,
              quantidade: Number(item.quantidade),
              dataValidade,
              diasParaVencer,
              status,
            });
          }
        }
      });
      
      // Converter para array e ordenar por data de validade (mais próximos primeiro)
      const produtosOrdenados = Array.from(lotesMap.values())
        .sort((a, b) => a.diasParaVencer - b.diasParaVencer);
      
      setProdutos(produtosOrdenados);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutosVencimento();
  }, [user, filtros.diasAlerta]);

  // Aplicar filtros locais
  const produtosFiltrados = produtos.filter(p => {
    if (filtros.produto && 
        !p.nome.toLowerCase().includes(filtros.produto.toLowerCase()) &&
        !p.codigo.toLowerCase().includes(filtros.produto.toLowerCase())) {
      return false;
    }
    if (filtros.status !== "todos" && p.status !== filtros.status) {
      return false;
    }
    return true;
  });

  // Dados para exportação
  const dadosExportacao = produtosFiltrados.map(p => ({
    "Código": p.codigo,
    "Produto": p.nome,
    "Quantidade": p.quantidade,
    "Data Validade": format(p.dataValidade, "dd/MM/yyyy"),
    "Dias para Vencer": p.diasParaVencer < 0 ? `Vencido há ${Math.abs(p.diasParaVencer)} dias` : `${p.diasParaVencer} dias`,
    "Status": p.status === "vencido" ? "Vencido" : "Vencendo",
  }));

  const colunasExportacao = [
    { key: "Código", label: "Código" },
    { key: "Produto", label: "Produto" },
    { key: "Quantidade", label: "Quantidade" },
    { key: "Data Validade", label: "Data Validade" },
    { key: "Dias para Vencer", label: "Dias para Vencer" },
    { key: "Status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Produtos Próximos ao Vencimento
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Produtos com validade dentro da janela de alerta ou já vencidos
              </p>
            </div>
            <ExportButton 
              data={dadosExportacao}
              filename={`produtos-vencimento-${format(new Date(), "yyyy-MM-dd")}`}
              columns={colunasExportacao}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Painel de Filtros Colapsável */}
          <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="mb-4">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {filtrosAbertos ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <Label>Buscar Produto</Label>
                  <Input
                    placeholder="Nome ou código..."
                    value={filtros.produto}
                    onChange={(e) => setFiltros({ ...filtros, produto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={filtros.status} 
                    onValueChange={(v) => setFiltros({ ...filtros, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="vencendo">Vencendo</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Janela de Alerta (dias)</Label>
                  <Select 
                    value={String(filtros.diasAlerta)} 
                    onValueChange={(v) => setFiltros({ ...filtros, diasAlerta: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Tabela */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto próximo ao vencimento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd. Estoque</TableHead>
                  <TableHead>Data Validade</TableHead>
                  <TableHead className="text-center">Dias p/ Vencer</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-mono text-sm">{produto.codigo}</TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell className="text-center">{produto.quantidade}</TableCell>
                    <TableCell>
                      {format(produto.dataValidade, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-center">
                      {produto.diasParaVencer < 0 ? (
                        <span className="text-red-600 font-semibold">
                          {Math.abs(produto.diasParaVencer)} dias atrás
                        </span>
                      ) : produto.diasParaVencer === 0 ? (
                        <span className="text-orange-600 font-semibold">Hoje</span>
                      ) : (
                        <span className={produto.diasParaVencer <= 7 ? "text-orange-600" : ""}>
                          {produto.diasParaVencer} dias
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {produto.status === "vencido" ? (
                        <Badge variant="destructive">Vencido</Badge>
                      ) : (
                        <Badge className="bg-orange-500 hover:bg-orange-600">Vencendo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Totalizador */}
          {produtosFiltrados.length > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {produtosFiltrados.length} lote(s) encontrado(s)
              </span>
              <div className="flex gap-4">
                <span className="text-red-600">
                  Vencidos: {produtosFiltrados.filter(p => p.status === "vencido").length}
                </span>
                <span className="text-orange-600">
                  Vencendo: {produtosFiltrados.filter(p => p.status === "vencendo").length}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
