import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface CRMFiltersState {
  status: string;
  tentativa: string;
  periodo: string;
}

interface CRMFiltersProps {
  filters: CRMFiltersState;
  onChange: (filters: CRMFiltersState) => void;
}

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "Novo", label: "Novo" },
  { value: "Em contato", label: "Em contato" },
  { value: "Reunião agendada", label: "Reunião agendada" },
  { value: "Acesso grátis", label: "Acesso grátis" },
  { value: "Acesso pago", label: "Acesso pago" },
  { value: "Standby", label: "Standby" },
  { value: "Sem interesse", label: "Sem interesse" },
];

const tentativaOptions = [
  { value: "all", label: "Todas as tentativas" },
  { value: "0", label: "Tentativa 0" },
  { value: "1", label: "Tentativa 1" },
  { value: "2", label: "Tentativa 2" },
  { value: "3", label: "Tentativa 3" },
  { value: "4", label: "Tentativa 4" },
  { value: "5", label: "Tentativa 5+" },
];

const periodoOptions = [
  { value: "all", label: "Todos os períodos" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "overdue", label: "Atrasados" },
];

const CRMFilters = ({ filters, onChange }: CRMFiltersProps) => {
  const handleChange = (key: keyof CRMFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.status !== "all" || filters.tentativa !== "all" || filters.periodo !== "all";

  const clearFilters = () => {
    onChange({ status: "all", tentativa: "all", periodo: "all" });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={filters.status} onValueChange={(v) => handleChange("status", v)}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.tentativa} onValueChange={(v) => handleChange("tentativa", v)}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Tentativa" />
        </SelectTrigger>
        <SelectContent>
          {tentativaOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.periodo} onValueChange={(v) => handleChange("periodo", v)}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {periodoOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
};

export default CRMFilters;
