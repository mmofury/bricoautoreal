import Link from 'next/link';

export interface CategoryCardProps {
  name: string;
  count?: number;
  imageUrl: string;
  href: string;
  featured?: boolean;
}

export function CategoryCard({ name, count, imageUrl, href, featured = false }: CategoryCardProps) {
  const content = (
    <>
      <div className={`flex items-center justify-center ${featured ? 'h-[73px]' : 'h-[140px]'}`}>
        <img src={imageUrl} alt={name} className="h-[120px] w-[120px] object-contain" />
      </div>
      
      <div className="text-center">
        <h3 className="text-[15px] font-semibold leading-[22.5px] tracking-[-0.3px] text-[#0F172A]">
          {name}
        </h3>
        {count !== undefined && (
          <div className="mt-1 text-[10px] font-medium leading-4 tracking-[-0.4px] text-[#64748B]">
            {count}
          </div>
        )}
      </div>
    </>
  );
  
  if (featured) {
    return (
      <Link
        href={href}
        className="flex h-[73px] w-full flex-col items-center justify-center rounded-lg transition-colors hover:bg-gray-50"
      >
        {content}
      </Link>
    );
  }
  
  return (
    <Link
      href={href}
      className="flex h-[213px] w-full flex-col items-center justify-center rounded-lg bg-white transition-shadow hover:shadow-md"
    >
      {content}
    </Link>
  );
}
