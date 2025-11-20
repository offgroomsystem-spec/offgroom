import { Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { abrirHotmart } from "./StoreLayout";

const plans = [
  {
    name: "Básico",
    price: "97",
    popular: false,
    features: [
      "1 usuário",
      "Agendamentos ilimitados",
      "Controle financeiro básico",
      "Suporte por email",
    ],
  },
  {
    name: "Profissional",
    price: "147",
    popular: true,
    features: [
      "3 usuários",
      "Todos os recursos do Básico",
      "Relatórios avançados",
      "Gestão de estoque",
      "Suporte prioritário",
    ],
  },
  {
    name: "Empresarial",
    price: "247",
    popular: false,
    features: [
      "Usuários ilimitados",
      "Todos os recursos do Profissional",
      "API de integração",
      "Suporte 24/7",
      "Gerente de conta dedicado",
    ],
  },
];

export const PricingSection = () => {
  return (
    <section className="bg-muted py-16 md:py-24">
      <div className="container max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos que cabem no seu bolso
          </h2>
          <p className="text-lg text-muted-foreground">
            Escolha o melhor plano para o seu petshop
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-card rounded-2xl p-8 border-2 transition-all hover:scale-105 ${
                plan.popular 
                  ? 'border-primary shadow-xl' 
                  : 'border-border shadow-md hover:border-primary/50'
              }`}
            >
              {/* Badge "Mais Popular" */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-amber-500 text-white px-4 py-1 text-sm font-semibold shadow-lg">
                    ⭐ Mais Popular
                  </Badge>
                </div>
              )}
              
              {/* Nome do plano */}
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {plan.name}
              </h3>
              
              {/* Preço */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">
                    R$ {plan.price}
                  </span>
                  <span className="text-lg text-muted-foreground">/mês</span>
                </div>
              </div>
              
              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-card-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* CTA */}
              <Button
                onClick={abrirHotmart}
                className={`w-full py-6 text-lg font-semibold rounded-xl ${
                  plan.popular
                    ? 'bg-primary hover:bg-primary/90 shadow-lg'
                    : 'bg-foreground hover:bg-foreground/90 text-background'
                }`}
              >
                Escolher plano
              </Button>
            </div>
          ))}
        </div>
        
        {/* Garantia */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            7 dias de garantia • Cancele quando quiser • Sem multas ou taxas
          </p>
        </div>
      </div>
    </section>
  );
};
