import { FileText } from "lucide-react";

const Relatorios = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
      </div>

      <div className="bg-card rounded-lg border p-8 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Funcionalidade em desenvolvimento
        </p>
      </div>
    </div>
  );
};

export default Relatorios;
