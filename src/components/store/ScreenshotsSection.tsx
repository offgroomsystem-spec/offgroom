import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Placeholder - usuário irá substituir com prints reais
const screenshots = [
  {
    title: "Dashboard Executivo",
    image: "/placeholder.svg",
  },
  {
    title: "Agendamentos",
    image: "/placeholder.svg",
  },
  {
    title: "Gestão de Clientes",
    image: "/placeholder.svg",
  },
  {
    title: "Controle Financeiro",
    image: "/placeholder.svg",
  },
  {
    title: "Relatórios",
    image: "/placeholder.svg",
  },
];

export const ScreenshotsSection = () => {
  return (
    <section className="bg-muted/30 py-20 md:py-32">
      <div className="container">
        {/* Cabeçalho */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Veja o sistema em detalhes
          </h2>
          <p className="text-lg text-muted-foreground">
            Conheça as principais telas e funcionalidades do Offgroom
          </p>
        </div>

        {/* Carrossel de screenshots */}
        <div className="mx-auto max-w-6xl">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {screenshots.map((screenshot, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-2">
                    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20">
                      {/* Imagem com efeito 3D */}
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={screenshot.image}
                          alt={screenshot.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          style={{
                            transform: "perspective(1000px) rotateY(-2deg)",
                          }}
                        />
                      </div>
                      
                      {/* Overlay com título */}
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-background/90 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                        <h3 className="text-lg font-semibold">
                          {screenshot.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-12 hidden lg:flex" />
            <CarouselNext className="-right-12 hidden lg:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};
