import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@pos_user';
const CART_KEY = '@pos_cart';
const CASHIER_KEY = '@pos_cashier';

export const storage = {
  // User Auth (Manager)
  saveUser: async (user: any) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser: async () => {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  removeUser: async () => {
    await AsyncStorage.removeItem(USER_KEY);
  },

  // Cashier Auth
  setCashier: async (cashier: { id: string; name: string }) => {
    await AsyncStorage.setItem(CASHIER_KEY, JSON.stringify(cashier));
  },

  getCashier: async () => {
    const cashier = await AsyncStorage.getItem(CASHIER_KEY);
    return cashier ? JSON.parse(cashier) : null;
  },

  removeCashier: async () => {
    await AsyncStorage.removeItem(CASHIER_KEY);
  },

  // Cart
  saveCart: async (cart: any) => {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  },

  getCart: async () => {
    const cart = await AsyncStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  },

  clearCart: async () => {
    await AsyncStorage.removeItem(CART_KEY);
  },
};
