import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  discount: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customerId: string | null) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      discount: 0,
      addItem: (newItem) => {
        const items = get().items;
        const existingItem = items.find((i) => i.productId === newItem.productId);
        
        if (existingItem) {
          if (existingItem.quantity + 1 > existingItem.maxStock) return; // Prevent overstock
          set({
            items: items.map((i) =>
              i.productId === newItem.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...newItem, quantity: 1 }] });
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        const items = get().items;
        const item = items.find((i) => i.productId === productId);
        if(!item) return;

        if (quantity > item.maxStock) {
            // Optional: Toast warning here
            return;
        }
        if (quantity < 1) {
             set({ items: items.filter((i) => i.productId !== productId) });
             return;
        }

        set({
          items: items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },
      setCustomer: (customerId) => set({ customerId }),
      setDiscount: (discount) => set({ discount }),
      clearCart: () => set({ items: [], customerId: null, discount: 0 }),
      subtotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
      total: () => {
        const sub = get().subtotal();
        return Math.max(0, sub - get().discount);
      },
    }),
    {
      name: 'pos-cart-storage',
    }
  )
);
