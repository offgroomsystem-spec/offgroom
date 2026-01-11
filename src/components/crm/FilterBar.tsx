import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  value: string;
  onChange: (value: string) => void;
}

const FilterBar = ({ value, onChange }: FilterBarProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por telefone, empresa ou dono..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 max-w-md"
      />
    </div>
  );
};

export default FilterBar;
