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
      // REMOVEMOS O h-full, já está assim no seu último código.
      // Agora, o card deve apenas ocupar o espaço que precisa.
      className={`border-2 ${tipoClasses[tipo]} ${onClick ? "cursor-pointer hover:shadow-lg transition-shadow hover:border-primary" : ""}`}
      onClick={onClick}
    >
      {/* AJUSTE CRÍTICO AQUI: Padding do CardHeader mais compacto */}
      <CardHeader className="p-3 pb-1 flex-row items-center space-x-2"> {/* Adicionado flex-row, items-center e space-x-2 */}
        {icone && <span className={`${tipoIconColor[tipo]} flex-shrink-0`}>{icone}</span>} {/* flex-shrink-0 para o ícone não diminuir */}
        <CardTitle className="text-base leading-tight"> {/* leading-tight para reduzir altura da linha */}
          {titulo}
        </CardTitle>
      </CardHeader>

      {/* AJUSTE CRÍTICO AQUI: Padding do CardContent mais compacto */}
      <CardContent className="p-3 pt-1"> {/* Reduzido de p-2 para p-3 e pt-0 para pt-1 para um visual mais clean */}
        {/* Prioridade 1: Valor (monetário) */}
        {valor !== undefined && <p className={`text-2xl font-bold ${tipoIconColor[tipo]}`}>{formatCurrency(valor)}</p>}
        
        {/* Prioridade 2: Texto de Destaque (nosso contador) */}
        {textoDestaque && <p className={`text-2xl font-bold ${tipoIconColor[tipo]}`}>{textoDestaque}</p>}

        {/* Prioridade 3: Lista (só mostra se não houver valor nem textoDestaque) */}
        {!valor && !textoDestaque && lista && lista.length > 0 && (
          <ul className="list-disc list-inside space-y-0.5 text-sm"> {/* space-y-0.5 para linhas mais próximas */}
            {lista
              .slice(0, 5)
              .filter((item) => item !== undefined && item !== null)
              .map((item, idx) => (
                <li key={idx}>
                  {typeof item === "string"
                    ? item
                    : `${item.nomeCliente || item.cliente} - ${item.nomePet || item.pet || ""}`}
                </li>
              ))}
            {lista.length > 5 && <li className="text-muted-foreground">+ {lista.length - 5} mais</li>}
          </ul>
        )}
        
        {/* "Nenhum item" */}
        {!valor && !textoDestaque && lista && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>}
      </CardContent>
    </Card>
  );
};z