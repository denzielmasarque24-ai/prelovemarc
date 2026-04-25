// Product data with local dummy products
export const products = [
  // Tops
  {
    id: 1,
    name: 'Soft Pink Blouse',
    category: 'Tops',
    price: 2499,
    image: '/images/top1.jpg',
    description: 'A delicate pink blouse perfect for any occasion',
  },
  {
    id: 2,
    name: 'Cream Knit Top',
    category: 'Tops',
    price: 1999,
    image: '/images/top2.jpg',
    description: 'Cozy cream knit top with elegant neckline',
  },
  {
    id: 3,
    name: 'Mauve Oversized Shirt',
    category: 'Tops',
    price: 2299,
    image: '/images/top3.jpg',
    description: 'Comfortable oversized shirt in soft mauve',
  },

  // Bottoms
  {
    id: 4,
    name: 'White Wide Leg Pants',
    category: 'Bottoms',
    price: 2799,
    image: '/images/bottom1.jpg',
    description: 'Classic white pants with a contemporary cut',
  },
  {
    id: 5,
    name: 'Pink Mini Skirt',
    category: 'Bottoms',
    price: 1799,
    image: '/images/bottom2.jpg',
    description: 'Adorable pink mini skirt perfect for any season',
  },
  {
    id: 6,
    name: 'Beige Linen Trousers',
    category: 'Bottoms',
    price: 2599,
    image: '/images/bottom3.jpg',
    description: 'Elegant beige linen trousers for timeless style',
  },

  // Dresses
  {
    id: 7,
    name: 'Blush Pink Wrap Dress',
    category: 'Dresses',
    price: 3499,
    image: '/images/dress1.jpg',
    description: 'Flattering wrap dress in beautiful blush pink',
  },
  {
    id: 8,
    name: 'Cream Lace Dress',
    category: 'Dresses',
    price: 3799,
    image: '/images/dress2.jpg',
    description: 'Elegant lace dress with delicate details',
  },
  {
    id: 9,
    name: 'Mauve Midi Dress',
    category: 'Dresses',
    price: 3299,
    image: '/images/dress3.jpg',
    description: 'Sophisticated midi dress in soft mauve',
  },
];

export const categories = ['All', 'Tops', 'Bottoms', 'Dresses'];

export function getProductsByCategory(category) {
  if (category === 'All') {
    return products;
  }
  return products.filter((product) => product.category === category);
}
