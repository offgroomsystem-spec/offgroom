import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Check, Sparkles } from "lucide-react";
import { abrirHotmart } from "./StoreLayout";
import heroImage from "@/assets/hero-offgroom.png";

export const HeroSection = () => {
  return (
    <section className="bg-card py-16 md:py-24 lg:py-32">
      <div className="container max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Lado esquerdo: Conteúdo */}
          <div className="order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Feito por groomers, para groomers
            </div>

            {/* Título principal */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              Gestão completa
              <span className="block text-primary">para seu petshop</span>
            </h1>

            {/* Subtítulo */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Simplifique agendamentos, controle financeiro e gestão de clientes. Tudo em um só lugar, com a facilidade
              que você precisa.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                onClick={abrirHotmart}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Começar agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-2 border-border hover:border-primary hover:text-primary px-8 py-6 text-lg font-semibold rounded-xl transition-all"
              >
                <Play className="mr-2 h-5 w-5" />
                Ver demonstração
              </Button>
            </div>

            {/* Stats mini */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Sem contrato de fidelidade</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Suporte em português</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>7 dias grátis</span>
              </div>
            </div>
          </div>

          {/* Lado direito: Imagem do sistema */}
          <div className="order-1 lg:order-2">
            <img
              src={heroImage}
              alt="Offgroom - Sistema de gestão para petshops"
              className="w-full sm:max-w-[520px] lg:max-w-[700px] mx-auto rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
