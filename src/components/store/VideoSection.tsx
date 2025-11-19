export const VideoSection = () => {
  return (
    <section id="video" className="py-20 md:py-32">
      <div className="container">
        <div className="mx-auto max-w-5xl text-center">
          {/* Título */}
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Conheça o Offgroom em ação
          </h2>
          <p className="mb-12 text-lg text-muted-foreground">
            Veja como é fácil gerenciar seu petshop com o Offgroom
          </p>

          {/* Vídeo Embed */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border">
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/5yLZvrxtJlo"
                title="Offgroom - Sistema de Gestão para Petshops"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
