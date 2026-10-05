const PRODUCTS_KEY = 'blossom-products'

const defaultProducts = [
  {
    id: '1',
    name: 'Cold Brew Cam',
    category: 'Cà phê',
    price: 45000,
    available: true,
  },
  {
    id: '2',
    name: 'Latte Hoa Nhài',
    category: 'Cà phê',
    price: 52000,
    available: true,
  },
  {
    id: '3',
    name: 'Trà Đào Cam Sả',
    category: 'Trà',
    price: 49000,
    available: true,
  },
  {
    id: '4',
    name: 'Matcha Latte',
    category: 'Trà',
    price: 59000,
    available: true,
  },
  {
    id: '5',
    name: 'Chocolate Đá Xay',
    category: 'Đá xay',
    price: 55000,
    available: true,
  },
  {
    id: '6',
    name: 'Americano',
    category: 'Cà phê',
    price: 39000,
    available: true,
  },
]

export function getProducts() {
  const savedProducts = localStorage.getItem(PRODUCTS_KEY)

  if (!savedProducts) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(defaultProducts))
    return defaultProducts
  }

  return JSON.parse(savedProducts)
}

export function saveMenuProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products))
}