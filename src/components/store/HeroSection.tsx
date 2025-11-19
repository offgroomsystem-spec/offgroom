import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { abrirHotmart } from "./StoreLayout";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background py-20 md:py-32">
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center rounded-full border bg-card px-4 py-2 text-sm shadow-sm">
            <span className="mr-2 flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            Sistema de gestão completo para petshops
          </div>

          {/* Título Principal */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Gestão Completa para seu{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Petshop
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="mb-10 text-lg text-muted-foreground md:text-xl lg:text-2xl">
            Simplifique seu dia a dia com o Offgroom. Agendamentos, controle
            financeiro, gestão de clientes e muito mais em um só lugar.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={abrirHotmart}
              className="group w-full font-semibold sm:w-auto"
            >
              Comprar Agora
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => document.getElementById("video")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="mr-2 h-4 w-4" />
              Ver Demonstração
            </Button>
          </div>

          {/* Badges de confiança */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Sem instalação</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Atualizações gratuitas</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Suporte dedicado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decoração de fundo */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-1/2 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>
    </section>
  );
};
