import { Link, useLocation } from "react-router-dom";
import { Users, PawPrint, Scissors, Calendar } from "lucide-react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Clientes", icon: Users },
    { path: "/racas", label: "Raças", icon: PawPrint },
    { path: "/servicos", label: "Serviços", icon: Scissors },
    { path: "/agendamentos", label: "Agendamentos", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2 mr-8">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-foreground">PetSystem</span>
          </div>
          
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="container py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
