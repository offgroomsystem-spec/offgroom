import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Facebook, Instagram, Linkedin, Mail, Phone } from "lucide-react";
import logoOffgroom from "@/assets/logo-offgroom.png";

const footerSections = [
  {
    title: "Sobre",
    links: [
      { label: "O que é o Offgroom", href: "#" },
      { label: "Nossa Missão", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Carreiras", href: "#" },
    ],
  },
  {
    title: "Produto",
    links: [
      { label: "Funcionalidades", href: "#features" },
      { label: "Preços", href: "#pricing" },
      { label: "Atualizações", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Suporte",
    links: [
      { label: "Central de Ajuda", href: "#" },
      { label: "Contato", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Tutorial em Vídeo", href: "#video" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de Uso", href: "#" },
      { label: "Política de Privacidade", href: "#" },
      { label: "LGPD", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

export const StoreFooter = () => {
  return (
    <footer className="border-t bg-card">
      <div className="container py-12 md:py-16">
        {/* Grid principal */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Logo e descrição */}
          <div className="lg:col-span-2">
            <Link to="/store" className="mb-4 inline-block">
              <img src={logoOffgroom} alt="Offgroom" className="h-10" />
            </Link>
            <p className="mb-6 text-sm text-muted-foreground">
              Sistema completo de gestão para petshops. Simplifique seu dia a
              dia e aumente sua produtividade.
            </p>
            
            {/* Redes sociais */}
            <div className="flex gap-4">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links de navegação */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        {/* Informações de contato e copyright */}
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>contato@offgroom.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>(11) 9999-9999</span>
            </div>
          </div>
          
          <p className="text-center">
            © {new Date().getFullYear()} Offgroom. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
