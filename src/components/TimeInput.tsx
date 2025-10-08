import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TimeInput = ({ value, onChange, placeholder = "00:00", className }: TimeInputProps) => {
  const [displayValue, setDisplayValue] = useState(value);

  const formatTime = (input: string) => {
    // Remove tudo que não é número
    const numbers = input.replace(/\D/g, '');
    
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    
    // Adiciona os dois pontos automaticamente
    const hours = numbers.slice(0, 2);
    const minutes = numbers.slice(2, 4);
    
    return `${hours}:${minutes}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatTime(input);
    
    setDisplayValue(formatted);
    onChange(formatted);
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={5}
      className={className}
      style={{
        MozAppearance: 'textfield',
        WebkitAppearance: 'none',
      }}
    />
  );
};
