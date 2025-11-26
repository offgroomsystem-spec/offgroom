import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Permission {
  codigo: string;
  nome: string;
  tema: string;
  parent_codigo: string | null;
  ordem: number;
}

interface PermissionsPanelProps {
  selectedPermissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
}

export const PermissionsPanel = ({ selectedPermissions, onPermissionsChange }: PermissionsPanelProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('ordem');

      if (error) throw error;
      setPermissions(data || []);
      
      // Auto-expand all themes by default
      const themes = new Set((data || []).filter(p => !p.parent_codigo).map(p => p.codigo));
      setExpandedThemes(themes);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    }
  };

  const toggleTheme = (tema: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(tema)) {
      newExpanded.delete(tema);
    } else {
      newExpanded.add(tema);
    }
    setExpandedThemes(newExpanded);
  };

  const handlePermissionToggle = (codigo: string, checked: boolean) => {
    let newPermissions = [...selectedPermissions];

    if (checked) {
      // Add permission if not already present
      if (!newPermissions.includes(codigo)) {
        newPermissions.push(codigo);
      }

      // If it's a parent, add all children
      const children = permissions.filter(p => p.parent_codigo === codigo);
      children.forEach(child => {
        if (!newPermissions.includes(child.codigo)) {
          newPermissions.push(child.codigo);
        }
      });
    } else {
      // Remove permission
      newPermissions = newPermissions.filter(p => p !== codigo);

      // If it's a parent, remove all children
      const children = permissions.filter(p => p.parent_codigo === codigo);
      children.forEach(child => {
        newPermissions = newPermissions.filter(p => p !== child.codigo);
      });
    }

    onPermissionsChange(newPermissions);
  };

  const isPermissionChecked = (codigo: string) => {
    return selectedPermissions.includes(codigo);
  };

  const isThemeFullyChecked = (themeCodigo: string) => {
    const themePerms = permissions.filter(
      p => p.codigo === themeCodigo || p.parent_codigo === themeCodigo || 
      permissions.find(parent => parent.codigo === p.parent_codigo)?.parent_codigo === themeCodigo
    );
    return themePerms.length > 0 && themePerms.every(p => selectedPermissions.includes(p.codigo));
  };

  const themes = permissions.filter(p => !p.parent_codigo);

  return (
    <div className="space-y-4">
      {themes.map((theme) => {
        const isExpanded = expandedThemes.has(theme.codigo);
        const themeChildren = permissions.filter(p => p.parent_codigo === theme.codigo);

        return (
          <div key={theme.codigo} className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => toggleTheme(theme.codigo)}
                className="p-1 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={theme.codigo}
                  checked={isThemeFullyChecked(theme.codigo)}
                  onCheckedChange={(checked) => handlePermissionToggle(theme.codigo, checked as boolean)}
                />
                <Label htmlFor={theme.codigo} className="font-semibold text-base cursor-pointer">
                  {theme.nome}
                </Label>
              </div>
            </div>

            {isExpanded && themeChildren.length > 0 && (
              <div className="ml-9 space-y-3">
                {themeChildren.map((child) => {
                  const grandChildren = permissions.filter(p => p.parent_codigo === child.codigo);

                  return (
                    <div key={child.codigo}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={child.codigo}
                          checked={isPermissionChecked(child.codigo)}
                          onCheckedChange={(checked) => handlePermissionToggle(child.codigo, checked as boolean)}
                        />
                        <Label htmlFor={child.codigo} className="cursor-pointer">
                          {child.nome}
                        </Label>
                      </div>

                      {grandChildren.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {grandChildren.map((grandChild) => (
                            <div key={grandChild.codigo} className="flex items-center gap-2">
                              <Checkbox
                                id={grandChild.codigo}
                                checked={isPermissionChecked(grandChild.codigo)}
                                onCheckedChange={(checked) => 
                                  handlePermissionToggle(grandChild.codigo, checked as boolean)
                                }
                              />
                              <Label htmlFor={grandChild.codigo} className="text-sm cursor-pointer">
                                {grandChild.nome}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
