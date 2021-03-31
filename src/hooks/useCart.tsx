import { createContext, ReactNode, useContext, useState } from 'react';
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

const qtdInStock = async (productId: number) => {
  const { amount } = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);
   
  return amount;
}

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if(storagedCart){
      return JSON.parse(storagedCart)
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const alreadyInCart          = cart.find(product => product.id === productId);
      const productQuantityInStock = await qtdInStock(productId);
      
      if(!alreadyInCart){
        // se não estiver, dá fetch no produto e adiciona no carrinho
        // verificar no estoque se existe essa quantidade do produto tbm
        if(productQuantityInStock > 0){
          const produto = await api.get<Product>(`products/${productId}`).then(response => response.data);
          // adiciona a qtd ao produto, e então adiciona isso ao carrinho
          setCart([ ...cart,{...produto, amount: 1}])

          localStorage.setItem('@RocketShoes:cart', JSON.stringify([ ...cart,{...produto, amount: 1}]));        
        }else{
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      }else{
        if(productQuantityInStock > alreadyInCart.amount){
          // pega o item do carrinho com o id passado no metodo e incrementa em um a qtd
          const updateCart = cart.map(item => item.id === productId ? {
            ...item,
            amount: Number(item.amount)+1
          }: item);

          setCart(updateCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
        }else{
          toast.error('Quantidade solicitada fora de estoque');
          return;       
        }
      }

    } catch(err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(cartProduct => cartProduct.id === productId)
      if(!productExists){
        throw new Error();
      }
      const updatedCart = cart.filter(cartItem => cartItem.id !== productId);
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }
      const productQuantityInStock = await qtdInStock(productId);
      
      if(amount > productQuantityInStock){
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const isInCart = cart.some(product => product.id === productId)

      if(!isInCart){
        toast.error('Erro na alteração de quantidade do produto')
        return;
      }

      const updatedCart = cart.map(cartItem => cartItem.id === productId ? {
        ...cartItem,
        amount: amount
      } : cartItem)

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));


    } catch {
      toast.error('Erro na alteração de quantidade do produto')
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
