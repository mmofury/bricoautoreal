interface Service {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ServicesSectionProps {
  services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <div className="mx-auto max-w-[1408px] px-4 md:px-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {services.map((service) => (
          <div
            key={service.id}
            className="rounded-t-lg border-b-4 border-[#FFCC00] bg-[#1E1E1E] p-6 shadow-lg"
          >
            {/* Icon */}
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E1E] text-white outline outline-[3px] outline-[#FFCC00]">
              {service.icon}
            </div>

            {/* Title */}
            <h3 className="mb-4 text-xl font-bold leading-tight text-[#FFCC00]">
              {service.title}
            </h3>

            {/* Description */}
            <p className="text-sm font-light leading-relaxed text-white">{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

