export const VideoSection = () => {
  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja o Offgroom em ação
          </h2>
          <p className="text-lg text-muted-foreground">
            Descubra como simplificar a gestão do seu petshop em minutos
          </p>
        </div>
        
        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-border">
          <iframe
            className="h-full w-full"
            src="https://www.youtube.com/embed/5yLZvrxtJlo"
            title="Offgroom - Sistema de Gestão para Petshops"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
};
