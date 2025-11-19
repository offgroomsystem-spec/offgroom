export const StoreFooter = () => {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="container">
        <div className="mb-4 flex flex-wrap justify-center gap-4 text-sm">
          <a href="#" className="text-gray-600 hover:text-gray-900">
            Contato
          </a>
          <span className="text-gray-300">•</span>
          <a href="#" className="text-gray-600 hover:text-gray-900">
            Termos de Uso
          </a>
          <span className="text-gray-300">•</span>
          <a href="#" className="text-gray-600 hover:text-gray-900">
            Privacidade
          </a>
          <span className="text-gray-300">•</span>
          <a href="#" className="text-gray-600 hover:text-gray-900">
            Suporte
          </a>
        </div>
        
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Offgroom. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};
