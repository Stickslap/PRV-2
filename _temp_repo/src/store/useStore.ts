import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Category } from '../lib/api';

interface CartItem extends Product {
  quantity: number;
  variant_id?: number | null;
  selectedOptions?: Record<number, number>;
}

interface AppState {
  cart: CartItem[];
  addItem: (product: Product, variant_id?: number, selectedOptions?: Record<number, number>, price?: number) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  user: any | null;
  setUser: (user: any) => void;
  products: Product[];
  categories: Category[];
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      cart: [],
      addItem: (product, variant_id, selectedOptions, price) => 
        set((state) => {
          let vid = variant_id ?? product.base_variant_id ?? null;
          if (!vid && product.variants && product.variants.length > 0) {
            vid = product.variants[0].id;
          }
          
          const finalPrice = typeof price === 'number' ? price : (Number(product.price) || 0);
          
          const existingItem = state.cart.find((item) => 
            item.id === product.id && 
            item.variant_id === vid && 
            JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions || {}) &&
            item.price === finalPrice
          );
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                (item.id === product.id && item.variant_id === vid && JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions || {}) && item.price === finalPrice) 
                  ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          return { cart: [...state.cart, { ...product, price: finalPrice, quantity: 1, variant_id: vid, selectedOptions }] };
        }),
      removeItem: (index) =>
        set((state) => ({
          cart: state.cart.filter((_, i) => i !== index),
        })),
      updateQuantity: (index, quantity) =>
        set((state) => ({
          cart: state.cart.map((item, i) =>
            i === index ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),
      clearCart: () => set({ cart: [] }),
      user: null,
      setUser: (user) => set({ user }),
      products: [],
      categories: [],
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'print-society-storage',
    }
  )
);
