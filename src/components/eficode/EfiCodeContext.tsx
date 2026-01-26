import React, { createContext, useContext, ReactNode } from 'react';

interface EfiCodeContextType {
  globalCss: string;
}

const EfiCodeContext = createContext<EfiCodeContextType>({
  globalCss: '',
});

interface EfiCodeProviderProps {
  children: ReactNode;
  globalCss: string;
}

export const EfiCodeProvider = ({ children, globalCss }: EfiCodeProviderProps) => {
  return (
    <EfiCodeContext.Provider value={{ globalCss }}>
      {children}
    </EfiCodeContext.Provider>
  );
};

export const useEfiCodeContext = () => {
  return useContext(EfiCodeContext);
};
