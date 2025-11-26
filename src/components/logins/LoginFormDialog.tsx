import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { PermissionsPanel } from './PermissionsPanel';

interface StaffAccount {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
}

interface LoginFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  login: StaffAccount | null;
  onSuccess: () => void;
}

export const LoginFormDialog = ({ open, onOpenChange, login, onSuccess }: LoginFormDialogProps) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (login) {
      setNome(login.nome);
      setEmail(login.email);
      setAtivo(login.ativo);
      setSenha('');
      loadPermissions(login.id);
    } else {
      resetForm();
    }
  }, [login]);

  const resetForm = () => {
    setNome('');
    setEmail('');
    setSenha('');
    setAtivo(true);
    setSelectedPermissions([]);
  };

  const loadPermissions = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('permission_codigo')
        .eq('staff_id', staffId);

      if (error) throw error;
      setSelectedPermissions((data || []).map(p => p.permission_codigo));
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome || !email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!login && !senha) {
      toast.error('A senha é obrigatória para novos logins');
      return;
    }

    setLoading(true);

    try {
      if (login) {
        // Update existing login
        const { error: updateError } = await supabase
          .from('staff_accounts')
          .update({ nome, email, ativo })
          .eq('id', login.id);

        if (updateError) throw updateError;

        // Update permissions
        // First delete all existing permissions
        await supabase
          .from('staff_permissions')
          .delete()
          .eq('staff_id', login.id);

        // Then insert new ones
        if (selectedPermissions.length > 0) {
          const permissionsToInsert = selectedPermissions.map(codigo => ({
            staff_id: login.id,
            permission_codigo: codigo
          }));

          const { error: permError } = await supabase
            .from('staff_permissions')
            .insert(permissionsToInsert);

          if (permError) throw permError;
        }

        toast.success('Login atualizado com sucesso');
      } else {
        // Create new login via edge function
        const { error: funcError } = await supabase.functions.invoke('create-staff-user', {
          body: {
            nome,
            email,
            senha,
            ativo,
            permissions: selectedPermissions
          }
        });

        if (funcError) throw funcError;
        toast.success('Login criado com sucesso');
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar login:', error);
      toast.error(error.message || 'Erro ao salvar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{login ? 'Editar Login' : 'Novo Login'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do colaborador"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="senha">
                Senha {!login && '*'}
                {login && ' (deixe em branco para não alterar)'}
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  required={!login}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Permissões</h3>
            <PermissionsPanel
              selectedPermissions={selectedPermissions}
              onPermissionsChange={setSelectedPermissions}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
