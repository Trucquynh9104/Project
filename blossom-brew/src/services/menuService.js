import { store } from "./dataStore";
const PRODUCTS_KEY = "blossom-products";

const defaultProducts = [
  {
    id: "1",
    name: "Cold Brew Cam",
    category: "Cà phê",
    price: 45000,
    sizes: [
      { size: "M", price: 45000 },
      { size: "L", price: 53000 },
    ],
    available: true,
  },
  {
    id: "2",
    name: "Latte Hoa Nhài",
    category: "Cà phê",
    price: 52000,
    sizes: [
      { size: "M", price: 52000 },
      { size: "L", price: 60000 },
    ],
    available: true,
  },
  {
    id: "3",
    name: "Trà Đào Cam Sả",
    category: "Trà",
    price: 49000,
    sizes: [
      { size: "M", price: 49000 },
      { size: "L", price: 57000 },
    ],
    available: true,
  },
  {
    id: "4",
    name: "Matcha Latte",
    category: "Trà",
    price: 59000,
    sizes: [
      { size: "M", price: 59000 },
      { size: "L", price: 67000 },
    ],
    available: true,
  },
  {
    id: "5",
    name: "Chocolate Đá Xay",
    category: "Đá xay",
    price: 55000,
    sizes: [
      { size: "M", price: 55000 },
      { size: "L", price: 63000 },
    ],
    available: true,
  },
  {
    id: "6",
    name: "Americano",
    category: "Cà phê",
    price: 39000,
    sizes: [
      { size: "M", price: 39000 },
      { size: "L", price: 47000 },
    ],
    available: true,
  },
];

export function getProductSizes(product) {
  const savedSizes = Array.isArray(product?.sizes)
    ? product.sizes
        .map((item) => ({
          size: String(item?.size || item?.label || "")
            .trim()
            .toUpperCase(),
          price: Number(item?.price || 0),
        }))
        .filter((item) => item.size && item.price > 0)
    : [];

  if (savedSizes.length) return savedSizes;

  const basePrice = Number(product?.price || 0);
  return [
    { size: "M", price: basePrice },
    { size: "L", price: basePrice + 8000 },
  ];
}

function normalizeProduct(product) {
  const sizes = getProductSizes(product);
  const lowestPrice = sizes.reduce(
    (currentLowest, size) => Math.min(currentLowest, size.price),
    Number.POSITIVE_INFINITY,
  );

  return {
    ...product,
    available: product?.available !== false,
    price: Number.isFinite(lowestPrice)
      ? lowestPrice
      : Number(product?.price || 0),
    sizes,
  };
}

export function getProducts() {
  try {
    return JSON.parse(store.getItem(PRODUCTS_KEY) || "[]").map(
      normalizeProduct,
    );
  } catch {
    return [];
  }
}

export function saveMenuProducts(products) {
  store.setItem(PRODUCTS_KEY, JSON.stringify(products.map(normalizeProduct)));
}
