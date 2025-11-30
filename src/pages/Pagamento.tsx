import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, Crown, Shield, Clock, Lock, Headphones, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pagamento = () => {
  const handleCheckout = async (planId: string) => {
    if (planId === "flex") {
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { price_id: 'price_1SYxTcGzVCrwCNdCBKwgtdRG' }
        });
        
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Erro ao criar checkout:', error);
        toast.error('Erro ao processar pagamento');
      }
    } else {
      console.log("Checkout para plano:", planId);
      toast.info("Em breve: outros planos");
    }
  };

  return (
    <StoreLayout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Escolha seu plano Offgroom e leve sua gestão pet para outro nível
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Automatize sua operação e aumente seu faturamento com a plataforma mais completa do mercado
            </p>
          </div>

          {/* Gatilhos Mentais - Seção de Ancoragem */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Badge variant="secondary" className="px-6 py-3 text-base">
              <TrendingUp className="mr-2 h-5 w-5" />
              Sistema utilizado em pet shops por todo o Brasil
            </Badge>
            <Badge variant="outline" className="px-6 py-3 text-base border-amber-500 text-amber-700">
              <Sparkles className="mr-2 h-5 w-5" />
              Valor promocional por tempo limitado
            </Badge>
          </div>

          {/* Ancoragem Visual */}
          <div className="text-center mb-16 p-6 bg-card rounded-xl border border-border max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground mb-2">
              De <span className="line-through">R$ 147/mês</span> →
            </p>
            <p className="text-3xl font-bold text-primary">
              por apenas <span className="text-green-600">R$ 37,37/mês</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">no plano Power 24</p>
          </div>

          {/* Cards de Planos */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {/* Card 1 - Offgroom Flex */}
            <Card className="relative flex flex-col transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-4">
                  <Clock className="mr-1 h-3 w-3" />
                  Flexibilidade
                </Badge>
                <CardTitle className="text-2xl">Offgroom Flex</CardTitle>
                <CardDescription>Mensal</CardDescription>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-foreground">R$ 147</p>
                  <p className="text-muted-foreground">/mês</p>
                  <p className="text-sm text-muted-foreground mt-1">(recorrente)</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Acesso completo ao sistema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Atualizações inclusas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Suporte padrão</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground mt-6">
                  Ideal para começar agora com flexibilidade mensal.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleCheckout("flex")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Assinar plano mensal
                </Button>
              </CardFooter>
            </Card>

            {/* Card 2 - Offgroom Power 24 - DESTAQUE */}
            <Card className="relative flex flex-col transition-all duration-300 scale-105 shadow-2xl border-[3px] border-amber-500 bg-gradient-to-br from-amber-50/50 to-card md:mt-0 -mt-4">
              {/* Badge "Mais Escolhido" */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-amber-500 text-white px-8 py-2 text-base font-bold shadow-lg whitespace-nowrap">
                  🔥 Mais Escolhido
                </Badge>
              </div>
              
              <CardHeader className="pt-8">
                <Badge variant="default" className="w-fit mb-4 bg-primary">
                  <Zap className="mr-1 h-3 w-3" />
                  Melhor Custo-Benefício
                </Badge>
                <CardTitle className="text-3xl">Offgroom Power 24</CardTitle>
                <CardDescription className="text-base">2 anos de acesso total</CardDescription>
                <div className="mt-4">
                  <p className="text-5xl font-bold text-foreground">R$ 897</p>
                  <p className="text-muted-foreground">pagamento único por 24 meses</p>
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xl font-bold text-green-700">
                      Custo: apenas R$ 37,37/mês
                    </p>
                  </div>
                  <Badge variant="destructive" className="mt-3 text-sm">
                    Economize R$ 2.631
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Acesso total ao Offgroom</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Zero mensalidade pelos próximos 24 meses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Economize R$ 2.631 comparado ao plano mensal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Melhor custo-benefício do mercado</span>
                  </li>
                </ul>
                
                {/* Chamadas especiais */}
                <div className="mt-6 space-y-2 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                  <p className="text-sm font-semibold text-amber-900">
                    ✓ O plano que 82% dos clientes escolhem
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    ✓ Mais economia, zero preocupação
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    ✓ Pague uma vez e fique tranquilo por 2 anos inteiros
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    ✓ A escolha inteligente para quem quer lucrar mais
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleCheckout("power24")}
                  className="w-full animate-pulse"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Quero o plano mais vantajoso
                </Button>
              </CardFooter>
            </Card>

            {/* Card 3 - Offgroom Master 60 */}
            <Card className="relative flex flex-col transition-all duration-300 hover:shadow-lg border-green-200">
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-4 bg-green-100 text-green-700">
                  <Crown className="mr-1 h-3 w-3" />
                  🏆 Economia Máxima
                </Badge>
                <CardTitle className="text-2xl">Offgroom Master 60</CardTitle>
                <CardDescription>Longo Prazo</CardDescription>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-foreground">R$ 1.497</p>
                  <p className="text-muted-foreground">pagamento único por 5 anos</p>
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-lg font-bold text-green-700">
                      Custo: apenas R$ 24,95/mês
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Economia máxima no longo prazo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">60 meses de acesso sem preocupação</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Ideal para quem quer estabilidade total</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Todas as atualizações inclusas</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleCheckout("master60")}
                  variant="outline"
                  className="w-full border-green-600 text-green-700 hover:bg-green-50"
                  size="lg"
                >
                  Garantir 5 anos de acesso
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Seção Copy de Vendas */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
                ⭐ Por que a maioria dos pet shops escolhem o plano Power 24?
              </h2>
              <p className="text-lg text-muted-foreground mb-6 text-center">
                Porque ele reúne <strong>tudo o que você precisa</strong> com o menor custo mensal percebido:
              </p>
              <div className="text-center mb-8 p-6 bg-green-50 rounded-xl border border-green-200">
                <p className="text-2xl md:text-3xl font-bold text-green-700">
                  💡 Apenas R$ 37,37 por mês
                </p>
                <p className="text-muted-foreground mt-2">sem mensalidades durante 2 anos</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Agendamento inteligente</h3>
                      <p className="text-sm text-muted-foreground">Organize sua agenda com eficiência</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Gestão completa de clientes e pets</h3>
                      <p className="text-sm text-muted-foreground">Histórico completo em um só lugar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Mensagens no WhatsApp</h3>
                      <p className="text-sm text-muted-foreground">Comunicação direta com seus clientes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Histórico de serviços</h3>
                      <p className="text-sm text-muted-foreground">Rastreie cada atendimento</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Relatórios e métricas</h3>
                      <p className="text-sm text-muted-foreground">Decisões baseadas em dados</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Atualizações contínuas</h3>
                      <p className="text-sm text-muted-foreground">Sempre com as últimas funcionalidades</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Performance e estabilidade</h3>
                      <p className="text-sm text-muted-foreground">Sistema rápido e confiável</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Suporte dedicado</h3>
                      <p className="text-sm text-muted-foreground">Ajuda quando você precisar</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center p-6 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-lg font-semibold text-foreground">
                  O <span className="text-primary">Power 24</span> é o plano com o{" "}
                  <span className="text-green-600">maior retorno financeiro</span> e a{" "}
                  <span className="text-green-600">maior taxa de satisfação</span> dos clientes.
                </p>
              </div>
            </Card>
          </div>

          {/* Trust Signals / Garantias */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Compromisso Offgroom com você
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-card rounded-xl border border-border">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">7 dias de garantia</h3>
                <p className="text-sm text-muted-foreground">
                  Não gostou? Devolvemos seu dinheiro
                </p>
              </div>
              <div className="text-center p-6 bg-card rounded-xl border border-border">
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Cancele quando quiser</h3>
                <p className="text-sm text-muted-foreground">
                  Sem burocracias ou taxas escondidas
                </p>
              </div>
              <div className="text-center p-6 bg-card rounded-xl border border-border">
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Dados 100% seguros</h3>
                <p className="text-sm text-muted-foreground">
                  Criptografia de ponta a ponta
                </p>
              </div>
              <div className="text-center p-6 bg-card rounded-xl border border-border">
                <Headphones className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Suporte em português</h3>
                <p className="text-sm text-muted-foreground">
                  Equipe pronta para te ajudar
                </p>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Pronto para transformar seu petshop?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Escolha o plano ideal e comece agora mesmo
            </p>
            <Button
              onClick={() => handleCheckout("power24")}
              size="lg"
              className="text-lg px-12 py-7 animate-pulse"
            >
              <Sparkles className="mr-2 h-6 w-6" />
              Quero começar com o Power 24
            </Button>
          </div>
        </div>
      </section>
    </StoreLayout>
  );
};

export default Pagamento;
