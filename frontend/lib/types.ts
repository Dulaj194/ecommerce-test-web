export type Role = "ROLE_ADMIN" | "ROLE_CUSTOMER";

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  userId: number;
  fullName: string;
  email: string;
  role: Role;
};

export type SessionData = {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: Role;
};

export type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageUrls: string[];
  active: boolean;
};

export type PagedResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CartItem = {
  id: number;
  productId: number;
  productName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CartResponse = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
};

export type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};
