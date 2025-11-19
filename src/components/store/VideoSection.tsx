export const VideoSection = () => {
  return (
    <section id="video" className="bg-gray-50 py-12">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-medium text-gray-900">
            Veja como funciona
          </h2>

          <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 shadow-sm">
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
    </section>
  );
};
