import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: { key: string; label: string }[];
}

export const ExportButton = ({ data, filename, columns }: ExportButtonProps) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (data.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    // Cabeçalhos
    const headers = columns.map(col => col.label).join(',');
    
    // Linhas
    const rows = data.map(row => 
      columns.map(col => {
        let value = row[col.key];
        
        // Formatar datas
        if (value instanceof Date) {
          value = format(value, 'dd/MM/yyyy');
        }
        
        // Escapar vírgulas e aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!"
    });
  };

  const exportToPDF = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Exportação para PDF será implementada em breve"
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToCSV}>
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <FileText className="h-4 w-4 mr-2" />
        Exportar PDF
      </Button>
    </div>
  );
};
