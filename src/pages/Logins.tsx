import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LoginTable } from '@/components/logins/LoginTable';
import { LoginFormDialog } from '@/components/logins/LoginFormDialog';
import { PermissionGuard } from '@/components/PermissionGuard';
import { toast } from 'sonner';

interface StaffAccount {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
}

const Logins = () => {
  const [logins, setLogins] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLogin, setSelectedLogin] = useState<StaffAccount | null>(null);

  const loadLogins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogins(data || []);
    } catch (error) {
      console.error('Erro ao carregar logins:', error);
      toast.error('Erro ao carregar logins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogins();
  }, []);

  const handleNew = () => {
    setSelectedLogin(null);
    setDialogOpen(true);
  };

  const handleEdit = (login: StaffAccount) => {
    setSelectedLogin(login);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (login: StaffAccount) => {
    try {
      const { error } = await supabase
        .from('staff_accounts')
        .update({ ativo: !login.ativo })
        .eq('id', login.id);

      if (error) throw error;
      
      toast.success(`Login ${!login.ativo ? 'ativado' : 'desativado'} com sucesso`);
      loadLogins();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do login');
    }
  };

  const handleDelete = async (loginId: string) => {
    try {
      // Get staff account to get user_id
      const { data: staffData, error: staffError } = await supabase
        .from('staff_accounts')
        .select('user_id')
        .eq('id', loginId)
        .single();

      if (staffError) throw staffError;

      // Delete staff account (cascade will delete permissions)
      const { error: deleteStaffError } = await supabase
        .from('staff_accounts')
        .delete()
        .eq('id', loginId);

      if (deleteStaffError) throw deleteStaffError;

      // Delete user from auth (requires service role - will be done via edge function in production)
      // For now, just mark as deleted in staff_accounts
      
      toast.success('Login excluído com sucesso');
      loadLogins();
    } catch (error) {
      console.error('Erro ao excluir login:', error);
      toast.error('Erro ao excluir login');
    }
  };

  const filteredLogins = logins.filter(login =>
    login.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    login.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PermissionGuard permission="logins.acesso">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Logins</h1>
            <p className="text-sm text-muted-foreground">Crie e gerencie logins de colaboradores</p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Login
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <LoginTable
            logins={filteredLogins}
            loading={loading}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        </Card>

        <LoginFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          login={selectedLogin}
          onSuccess={loadLogins}
        />
      </div>
    </PermissionGuard>
  );
};

export default Logins;
