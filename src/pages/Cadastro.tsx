import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock } from 'lucide-react';

const cadastroSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome muito longo'),
  email_hotmart: z.string()
    .email('E-mail inválido')
    .max(255, 'E-mail muito longo'),
  whatsapp: z.string()
    .regex(/^\(\d{2}\) \d{5}-\d{4}$/, 'WhatsApp inválido. Use o formato (XX) XXXXX-XXXX'),
  senha: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha muito longa'),
  confirmar_senha: z.string()
}).refine((data) => data.senha === data.confirmar_senha, {
  message: 'As senhas não coincidem',
  path: ['confirmar_senha']
});

type CadastroForm = z.infer<typeof cadastroSchema>;

const Cadastro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
  });

  // Se já estiver autenticado, redirecionar para home
  if (user) {
    return <Navigate to="/home" replace />;
  }

  const formatarWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      const formatted = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      return formatted;
    }
    return value;
  };

  const onSubmit = async (data: CadastroForm) => {
    setLoading(true);
    try {
      // Call public signup Edge Function
      const { data: signupData, error: signupError } = await supabase.functions.invoke('public-signup', {
        body: {
          email: data.email_hotmart,
          password: data.senha,
          nome_completo: data.nome_completo,
          whatsapp: data.whatsapp
        }
      });

      if (signupError) {
        toast.error(signupError.message || 'Erro ao criar conta');
        return;
      }

      if (signupData?.error) {
        toast.error(signupData.error);
        return;
      }

      // Auto-login after successful signup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email_hotmart,
        password: data.senha
      });

      if (loginError) {
        toast.error('Conta criada! Faça login para continuar.');
        navigate('/login');
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      navigate('/home');
    } catch (error) {
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <img src="/src/assets/logo-offgroom.png" alt="OffGroom" className="h-16 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
          <CardDescription>Preencha os dados abaixo para se cadastrar</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome_completo"
                  type="text"
                  placeholder="João Silva"
                  className="pl-10"
                  {...register('nome_completo')}
                />
              </div>
              {errors.nome_completo && (
                <p className="text-sm text-destructive">{errors.nome_completo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_hotmart">E-mail cadastrado na Hotmart</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email_hotmart"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  {...register('email_hotmart')}
                />
              </div>
              {errors.email_hotmart && (
                <p className="text-sm text-destructive">{errors.email_hotmart.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  type="text"
                  placeholder="(11) 99999-9999"
                  className="pl-10"
                  {...register('whatsapp')}
                  onChange={(e) => {
                    const formatted = formatarWhatsApp(e.target.value);
                    setValue('whatsapp', formatted);
                  }}
                />
              </div>
              {errors.whatsapp && (
                <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('senha')}
                />
              </div>
              {errors.senha && (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar_senha">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmar_senha"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('confirmar_senha')}
                />
              </div>
              {errors.confirmar_senha && (
                <p className="text-sm text-destructive">{errors.confirmar_senha.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Cadastro;
