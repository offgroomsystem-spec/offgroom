import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Rocket, Zap, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const SubscriptionInfoCard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Calcular dias restantes do trial (10 dias desde criação)
  const diasTrial = 10;
  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const diasDesdeRegistro = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const diasRestantes = Math.max(0, diasTrial - diasDesdeRegistro);
  
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50">
      <div className="p-4 space-y-3">
        {/* Trial Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Você ainda tem <span className="font-semibold text-foreground">{diasRestantes} dias</span> para uso gratuito do Offgroom.
          </span>
        </div>
        
        {/* Main CTA */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Rocket className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Pronto para Transformar seu Petshop?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Junte-se a centenas de petshops que já estão economizando tempo e aumentando lucros com o Offgroom.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/pagamento')}
            className="w-full sm:w-auto mt-2"
          >
            🎯 Ativar Offgroom
          </Button>
        </div>
        
        {/* Trust Signals */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Ativação imediata
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Pagamento 100% seguro
          </span>
        </div>
      </div>
    </Card>
  );
};
