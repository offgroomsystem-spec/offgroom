import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const EXPORTABLE_TABLES = [
  { key: "agendamentos", label: "Agendamentos" },
  { key: "agendamentos_pacotes", label: "Agendamentos Pacotes" },
  { key: "clientes", label: "Clientes" },
  { key: "pets", label: "Pets" },
  { key: "servicos", label: "Serviços" },
  { key: "produtos", label: "Produtos" },
  { key: "pacotes", label: "Pacotes" },
  { key: "lancamentos_financeiros", label: "Lançamentos Financeiros" },
  { key: "lancamentos_financeiros_itens", label: "Itens Financeiros" },
  { key: "despesas", label: "Despesas" },
  { key: "receitas", label: "Receitas" },
  { key: "contas_bancarias", label: "Contas Bancárias" },
  { key: "fornecedores", label: "Fornecedores" },
  { key: "compras_nf", label: "Compras NF" },
  { key: "compras_nf_itens", label: "Itens Compras NF" },
  { key: "groomers", label: "Groomers" },
  { key: "racas", label: "Raças" },
  { key: "empresa_config", label: "Configuração Empresa" },
  { key: "comissoes_config", label: "Configuração Comissões" },
  { key: "notas_fiscais", label: "Notas Fiscais" },
  { key: "creche_estadias", label: "Creche Estadias" },
  { key: "creche_registros_diarios", label: "Creche Registros Diários" },
  { key: "servicos_creche", label: "Serviços Creche" },
  { key: "pacotes_creche", label: "Pacotes Creche" },
  { key: "whatsapp_mensagens_agendadas", label: "WhatsApp Agendadas" },
  { key: "whatsapp_mensagens_risco", label: "WhatsApp Risco" },
  { key: "formas_pagamento", label: "Formas de Pagamento" },
  { key: "profiles", label: "Perfil do Usuário" },
  { key: "staff_accounts", label: "Contas Staff" },
] as const;

type TableKey = typeof EXPORTABLE_TABLES[number]["key"];

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportDataDialog = ({ open, onOpenChange }: ExportDataDialogProps) => {
  const [selected, setSelected] = useState<Set<TableKey>>(new Set());
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const toggleAll = () => {
    if (selected.size === EXPORTABLE_TABLES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(EXPORTABLE_TABLES.map(t => t.key)));
    }
  };

  const toggle = (key: TableKey) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const toCsv = (rows: Record<string, any>[]): string => {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = (typeof v === "object" ? JSON.stringify(v) : String(v)).replace(/(\r\n|\r|\n)/gm, ' ');
      if (s.includes(",") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    return [
      headers.join(","),
      ...rows.map(r => headers.map(h => escape(r[h])).join(","))
    ].join("\n");
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      toast({ title: "Aviso", description: "Selecione ao menos uma tabela.", variant: "destructive" });
      return;
    }

    setExporting(true);
    const dateStr = format(new Date(), "yyyy-MM-dd_HHmm");
    let successCount = 0;
    let errorCount = 0;

    for (const key of selected) {
      try {
        const { data, error } = await (supabase.from(key as any).select("*") as any);
        if (error) throw error;
        if (!data || data.length === 0) {
          // skip empty tables silently
          continue;
        }
        const csv = toCsv(data);
        downloadCsv(csv, `${key}_${dateStr}.csv`);
        successCount++;
      } catch (err: any) {
        console.error(`Erro ao exportar ${key}:`, err);
        errorCount++;
      }
    }

    setExporting(false);

    if (successCount > 0) {
      toast({
        title: "Exportação concluída",
        description: `${successCount} tabela(s) exportada(s) com sucesso.${errorCount > 0 ? ` ${errorCount} com erro.` : ""}`,
      });
    } else if (errorCount > 0) {
      toast({ title: "Erro", description: "Não foi possível exportar as tabelas selecionadas.", variant: "destructive" });
    } else {
      toast({ title: "Aviso", description: "As tabelas selecionadas estão vazias.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Dados (CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2 border-b">
          <Checkbox
            checked={selected.size === EXPORTABLE_TABLES.length}
            onCheckedChange={toggleAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-[12px] font-semibold cursor-pointer">
            Selecionar Todos
          </label>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1 py-2">
          {EXPORTABLE_TABLES.map(t => (
            <div key={t.key} className="flex items-center gap-2 px-1 py-0.5">
              <Checkbox
                checked={selected.has(t.key)}
                onCheckedChange={() => toggle(t.key)}
                id={`table-${t.key}`}
              />
              <label htmlFor={`table-${t.key}`} className="text-[12px] cursor-pointer">
                {t.label}
              </label>
            </div>
          ))}
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || selected.size === 0}
          className="h-8 text-[12px] font-semibold w-full mt-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5 mr-2" />
              Exportar {selected.size} tabela(s)
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
