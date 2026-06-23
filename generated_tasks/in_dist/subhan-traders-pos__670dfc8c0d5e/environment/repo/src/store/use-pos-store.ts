"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  itemId: string;
  productName: string;
  categoryName: string | null;
  quantity: number;
  retailPrice: number;
  wholesalePrice: number | null;
  costPrice: number | null;
  appliedPrice: number;
  discount: number;
  priceType: "RETAIL" | "WHOLESALE";
  maxQuantity: number; // Available stock
}

export interface CartCustomer {
  id: string;
  name: string;
  phone: string;
  outstandingAmount: number;
}

interface POSState {
  // Cart items
  items: CartItem[];
  
  // Customer
  customer: CartCustomer | null;
  walkInCustomer: {
    name: string;
    phone: string;
    cnic: string;
  } | null;
  
  // Pricing mode
  isWholesale: boolean;
  
  // Payment
  paymentMethod: "CASH" | "CARD" | "ONLINE_PAYMENT";
  amountPaid: number;
  
  // Actions
  addItem: (item: Omit<CartItem, "id" | "appliedPrice" | "discount">) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateItemDiscount: (id: string, discount: number) => void;
  updateItemPrice: (id: string, price: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  
  setCustomer: (customer: CartCustomer | null) => void;
  setWalkInCustomer: (customer: { name: string; phone: string; cnic: string } | null) => void;
  
  setIsWholesale: (isWholesale: boolean) => void;
  setPaymentMethod: (method: "CASH" | "CARD" | "ONLINE_PAYMENT") => void;
  setAmountPaid: (amount: number) => void;
  
  // Computed helpers
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTotal: () => number;
  getOutstanding: () => number;
  getTotalProfit: () => number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      walkInCustomer: null,
      isWholesale: false,
      paymentMethod: "CASH",
      amountPaid: 0,

      addItem: (item) => {
        const items = get().items;
        const isWholesale = get().isWholesale;
        const existingIndex = items.findIndex((i) => i.itemId === item.itemId);
        
        const appliedPrice = isWholesale && item.wholesalePrice 
          ? item.wholesalePrice 
          : item.retailPrice;

        if (existingIndex > -1) {
          // Update quantity if item exists
          const newItems = [...items];
          const newQty = Math.min(
            newItems[existingIndex].quantity + item.quantity,
            item.maxQuantity
          );
          newItems[existingIndex].quantity = newQty;
          set({ items: newItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            id: crypto.randomUUID(),
            itemId: item.itemId,
            productName: item.productName,
            categoryName: item.categoryName,
            quantity: Math.min(item.quantity, item.maxQuantity),
            retailPrice: item.retailPrice,
            wholesalePrice: item.wholesalePrice,
            costPrice: item.costPrice,
            appliedPrice,
            discount: 0,
            priceType: isWholesale ? "WHOLESALE" : "RETAIL",
            maxQuantity: item.maxQuantity,
          };
          set({ items: [...items, newItem] });
        }
      },

      updateItemQuantity: (id, quantity) => {
        const items = get().items;
        const newItems = items.map((item) =>
          item.id === id
            ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) }
            : item
        );
        set({ items: newItems });
      },

      updateItemDiscount: (id, discount) => {
        const items = get().items;
        const newItems = items.map((item) =>
          item.id === id ? { ...item, discount: Math.max(0, discount) } : item
        );
        set({ items: newItems });
      },

      updateItemPrice: (id, price) => {
        const items = get().items;
        const newItems = items.map((item) =>
          item.id === id ? { ...item, appliedPrice: Math.max(0, price) } : item
        );
        set({ items: newItems });
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      clearCart: () => {
        set({
          items: [],
          customer: null,
          walkInCustomer: null,
          amountPaid: 0,
        });
      },

      setCustomer: (customer) => {
        set({ customer, walkInCustomer: null });
      },

      setWalkInCustomer: (customer) => {
        set({ walkInCustomer: customer, customer: null });
      },

      setIsWholesale: (isWholesale) => {
        // Update all item prices when switching mode
        const items = get().items.map((item) => ({
          ...item,
          priceType: isWholesale ? "WHOLESALE" as const : "RETAIL" as const,
          appliedPrice: isWholesale && item.wholesalePrice 
            ? item.wholesalePrice 
            : item.retailPrice,
        }));
        set({ isWholesale, items });
      },

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setAmountPaid: (amountPaid) => set({ amountPaid }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.appliedPrice * item.quantity,
          0
        );
      },

      getTotalDiscount: () => {
        return get().items.reduce((sum, item) => sum + item.discount, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getTotalDiscount();
        return subtotal - discount;
      },

      getOutstanding: () => {
        const total = get().getTotal();
        const paid = get().amountPaid;
        return Math.max(0, total - paid);
      },

      getTotalProfit: () => {
        return get().items.reduce((sum, item) => {
          const costPrice = item.costPrice || 0;
          const profit = (item.appliedPrice - costPrice) * item.quantity - item.discount;
          return sum + profit;
        }, 0);
      },
    }),
    {
      name: "pos-cart-storage",
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        walkInCustomer: state.walkInCustomer,
        isWholesale: state.isWholesale,
        paymentMethod: state.paymentMethod,
        amountPaid: state.amountPaid,
      }),
    }
  )
);
