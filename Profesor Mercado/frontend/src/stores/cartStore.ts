/**
 * Store del carrito de compras usando Zustand.
 *
 * --- QUÉ ES ZUSTAND ---
 * Es una librería minimalista para manejar estado global en React.
 * A diferencia de Redux, no necesita providers, actions, reducers, etc.
 *
 * --- POR QUÉ ZUSTAND Y NO REDUX ---
 * Este proyecto es simple. Zustand:
 * - No necesita boilerplate
 * - No necesita Provider en el árbol de componentes
 * - Tipado nativo con TypeScript
 * - Soporte para persistencia (localStorage) via middleware
 *
 * --- PERSISTENCIA ---
 * El carrito se guarda en localStorage con persist().
 * Esto significa que si el usuario recarga la página,
 * los items del carrito NO se pierden.
 *
 * Key en localStorage: "cart-storage"
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Item individual del carrito.
 * Almacena el snapshot del producto al momento de agregarlo.
 *
 * productoId: ID del producto en la BD
 * nombre: Snapshot del nombre (por si cambia después)
 * precio: Snapshot del precio (por si cambia después)
 * cantidad: Unidades que el usuario quiere
 * imagen: URL de la imagen del producto
 */
export interface CartItem {
  productoId: number
  nombre: string
  precio: number
  cantidad: number
  imagen?: string
}

interface CartState {
  items: CartItem[]

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (productoId: number) => void
  updateQuantity: (productoId: number, cantidad: number) => void
  clearCart: () => void

  // Computed (son funciones porque Zustand no tiene getters)
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Agrega un item al carrito.
       * Si el producto ya existe, incrementa la cantidad.
       * Si no existe, lo agrega como nuevo.
       */
      addItem: (item) => {
        const items = get().items
        const existing = items.find((i) => i.productoId === item.productoId)
        if (existing) {
          set({
            items: items.map((i) =>
              i.productoId === item.productoId
                ? { ...i, cantidad: i.cantidad + item.cantidad }
                : i
            ),
          })
        } else {
          set({ items: [...items, item] })
        }
      },

      /**
       * Elimina un item del carrito por su ID.
       */
      removeItem: (productoId) => {
        set({ items: get().items.filter((i) => i.productoId !== productoId) })
      },

      /**
       * Actualiza la cantidad de un item.
       * Si la cantidad es 0 o menor, elimina el item.
       */
      updateQuantity: (productoId, cantidad) => {
        if (cantidad <= 0) {
          get().removeItem(productoId)
        } else {
          set({
            items: get().items.map((i) =>
              i.productoId === productoId ? { ...i, cantidad } : i
            ),
          })
        }
      },

      /**
       * Vacía el carrito completamente.
       * Se llama después de crear el pedido exitosamente.
       */
      clearCart: () => set({ items: [] }),

      /**
       * Calcula la cantidad total de items (suma de cantidades).
       */
      totalItems: () => get().items.reduce((acc, item) => acc + item.cantidad, 0),

      /**
       * Calcula el precio total del carrito.
       */
      totalPrice: () => get().items.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    }),
    {
      // Nombre de la key en localStorage
      name: 'cart-storage',
    }
  )
)
