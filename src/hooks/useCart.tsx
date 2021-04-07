import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  //Lóigica para não precisar usar o SetItem para cada método
  const prevCartRef = useRef<Product[]>();
  
  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;
  useEffect(() => {
    if(cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])



  const addProduct = async (productId: number) => {
    try {

      const tempCart = [...cart]
      const { data } = await api.get<Stock>(`stock/${productId}`);

      const thereIsProduct = tempCart.find(({ id }) => id === productId);

      const currentAmount = thereIsProduct ? thereIsProduct.amount : 1;
      const updateAmount = currentAmount+1;
      
      if(updateAmount > data.amount)
      {
          toast.error('Quantidade solicitada fora de estoque');
          return;
      }

      if (thereIsProduct) {
        thereIsProduct.amount =  updateAmount;      
      }
      else {
        let product = (await api.get<Product>(`products/${productId}`)).data;        
        product.amount = 1;

        tempCart.push(product);
      }
      
      setCart(tempCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };




  const removeProduct = async (productId: number) => {
    try {
      
      const  data  = cart.find(x => x.id === productId);  

      if(!data)
      { 
        throw new Error("Erro na remoção do produto")
      }

      let cartUpdated = cart.filter(x => x.id !== productId);
      setCart(cartUpdated);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {      
      if(amount <= 0)
        return;

      const { data } = await api.get<Stock>(`stock/${productId}`);

      if(amount <= data.amount && amount > 0)
      {
        var result = cart.map((x) => {
          if (x.id == productId) {
            x.amount = amount;
          }
          return x;
        });        
        setCart(result);
        
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(result));
      }
      else 
      {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
