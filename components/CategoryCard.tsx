import Image from "next/image";

interface CategoryCardProps {
  title: string;
  image: string;
  alt: string;
  href: string;
}

export default function CategoryCard({
  title,
  image,
  alt,
  href,
}: CategoryCardProps) {
  return (
    <a className="category-card boutique-card" href={href}>
      <div className="category-media">
        <Image src={image} alt={alt} width={440} height={540} />
      </div>
      <h3>{title}</h3>
    </a>
  );
}
