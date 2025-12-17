import Link from 'next/link';

interface Service {
  icon: JSX.Element;
  title: string;
  description: string;
  href: string;
}

interface ServicesSectionProps {
  services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <div className="container mx-auto overflow-hidden px-4 py-12">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {services.map((service, index) => (
          <Link
            key={index}
            href={service.href}
            className="group relative flex flex-col bg-[#1E1E1E] rounded-t-lg shadow-[0px_4px_8px_0px_rgba(55,55,55,0.16)] border-b-4 border-[#FFCC00] transition-transform hover:scale-105"
          >
            {/* Contenu décalé vers le haut */}
            <div className="relative -mt-6 px-4 pb-6 pt-0">
              {/* Icône avec cercle */}
              <div className="mb-4">
                {service.icon}
              </div>

              {/* Titre */}
              <h3 className="mb-3 text-xl font-bold leading-7 text-[#FFCC00]">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-sm font-light leading-5 text-white">
                {service.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
