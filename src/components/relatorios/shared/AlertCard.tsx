import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface AlertCardProps {
  tipo: "warning" | "error" | "info";
  titulo: string;
  lista?: any[];
  valor?: number;
  textoDestaque?: string;
  icone?: ReactNode;
  onClick?: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const AlertCard = ({ tipo, titulo, lista, valor, icone, onClick, textoDestaque }: AlertCardProps) => {
  const tipoClasses = {
    warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
    error: "border-red-500 bg-red-50 dark:bg-red-950",
    info: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  };

  const tipoIconColor = {
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  return (
    <Card
      className={`flex flex-col justify-between rounded-2xl shadow-sm border-2 ${tipoClasses[tipo]} ${
        onClick ? "cursor-pointer hover:shadow-lg transition-all hover:border-primary" : ""
      }`}
      onClick={onClick}
    >
      {/* HEADER */}
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground leading-tight">
          {icone && <span className={`${tipoIconColor[tipo]} text-base`}>{icone}</span>}
          {titulo}
        </CardTitle>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="p-3 pt-1 space-y-2">
        {/* Valor ou texto de destaque movido para o topo */}
        {(valor !== undefined || textoDestaque) && (
          <div className="text-2xl font-bold leading-tight">
            {valor !== undefined ? (
              <span className={tipoIconColor[tipo]}>{formatCurrency(valor)}</span>
            ) : (
              <span className={tipoIconColor[tipo]}>{textoDestaque}</span>
            )}
          </div>
        )}

        {/* Lista de itens (se não houver valor nem destaque) */}
        {!valor && !textoDestaque && lista && lista.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-sm text-left">
            {lista
              .slice(0, 5)
              .filter((item) => item !== undefined && item !== null)
              .map((item, idx) => (
                <li key={idx}>
                  {typeof item === "string"
                    ? item
                    : `${item.nomeCliente || item.cliente || ""} - ${item.nomePet || item.pet || ""}`}
                </li>
              ))}
            {lista.length > 5 && <li className="text-muted-foreground">+ {lista.length - 5} mais</li>}
          </ul>
        )}

        {/* Caso vazio */}
        {!valor && !textoDestaque && lista && lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
        )}
      </CardContent>
    </Card>
  );
};
