"use client";

import { FC, ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Create a context to provide wallet functionality even when not loaded
import { createContext, useContext } from "react";

const WalletLoadingContext = createContext<{ isLoading: boolean }>({ isLoading: true });

export const useWalletLoading = () => useContext(WalletLoadingContext);

// Dynamically import Solana wallet components to avoid SSR issues
const WalletProviderInner: FC<{ children: ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [WalletComponents, setWalletComponents] = useState<{
    ConnectionProvider: any;
    WalletProvider: any;
    WalletModalProvider: any;
    wallets: any[];
    endpoint: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Dynamically import all Solana wallet dependencies
    const loadWalletDeps = async () => {
      try {
        const [
          { clusterApiUrl },
          { WalletAdapterNetwork },
          { ConnectionProvider, WalletProvider },
          { WalletModalProvider },
          { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter }
        ] = await Promise.all([
          import("@solana/web3.js"),
          import("@solana/wallet-adapter-base"),
          import("@solana/wallet-adapter-react"),
          import("@solana/wallet-adapter-react-ui"),
          import("@solana/wallet-adapter-wallets")
        ]);

        const network = WalletAdapterNetwork.Devnet;
        const endpoint = clusterApiUrl(network);
        const wallets = [
          new PhantomWalletAdapter(),
          new SolflareWalletAdapter(),
          new TorusWalletAdapter(),
        ];

        setWalletComponents({
          ConnectionProvider,
          WalletProvider,
          WalletModalProvider,
          wallets,
          endpoint
        });
      } catch (error) {
        console.error("Failed to load wallet dependencies:", error);
      }
    };

    loadWalletDeps();
  }, []);

  const onError = useCallback((error: Error) => {
    console.error(error);
  }, []);

  if (!mounted || !WalletComponents) {
    return (
      <WalletLoadingContext.Provider value={{ isLoading: true }}>
        {children}
      </WalletLoadingContext.Provider>
    );
  }

  const { ConnectionProvider, WalletProvider, WalletModalProvider, wallets, endpoint } = WalletComponents;

  return (
    <WalletLoadingContext.Provider value={{ isLoading: false }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} onError={onError} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </WalletLoadingContext.Provider>
  );
};

export default WalletProviderInner;
