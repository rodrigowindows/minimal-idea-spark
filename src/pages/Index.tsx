import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Heart } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-in max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Simples & Elegante</span>
          </div>
          
          <h1 className="text-5xl font-bold leading-tight text-foreground md:text-7xl">
            Crie algo
            <span className="text-gradient"> incrível</span>
          </h1>
          
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Uma página minimalista para começar seu próximo projeto. 
            Rápido, limpo e pronto para personalizar.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2">
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              Saiba mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-card py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Rápido"
              description="Performance otimizada para carregar em segundos."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Moderno"
              description="Design atual com as melhores práticas de UI."
            />
            <FeatureCard
              icon={<Heart className="h-6 w-6" />}
              title="Simples"
              description="Fácil de entender e personalizar como quiser."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Feito com ❤️ usando Lovable</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="rounded-xl border border-border bg-background p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
