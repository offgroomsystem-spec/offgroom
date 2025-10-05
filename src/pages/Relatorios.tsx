import { FileText } from "lucide-react";

const Relatorios = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-foreground">Relatórios</h1>
      </div>

      <div className="bg-card rounded-lg border p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-xs">
          Funcionalidade em desenvolvimento
        </p>
      </div>
    </div>
  );
};

export default Relatorios;
