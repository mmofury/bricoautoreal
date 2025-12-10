export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface FeaturesSectionProps {
  features: Feature[];
}

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <div className="border-b border-[#E2E8F0] py-10">
      <div className="container mx-auto max-w-[1280px] px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 ${
                index < features.length - 1 ? 'border-r border-[#E2E8F0] pr-8' : ''
              }`}
            >
              <div className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center">
                {feature.icon}
              </div>
              <div>
                <h3 className="mb-1 text-base font-semibold leading-6 tracking-[-0.32px] text-[#212529]">
                  {feature.title}
                </h3>
                <p className="text-xs leading-[19.2px] tracking-[-0.4px] text-[#64748B]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
