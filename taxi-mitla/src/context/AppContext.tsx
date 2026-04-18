import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

interface AppContextType {
  isLoading: boolean;
  choferId: string | null;
  choferToken: string | null;
  choferNombre: string | null;
  viajeActivoId: string | null;
  setChofer: (id: string | null, token: string | null, nombre: string | null) => void;
  setViajeActivo: (id: string | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [choferId, setChoferId] = useState<string | null>(null);
  const [choferToken, setChoferToken] = useState<string | null>(null);
  const [choferNombre, setChoferNombre] = useState<string | null>(null);
  const [viajeActivoId, setViajeActivoIdState] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar Capacitor
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await SplashScreen.hide();
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#1E3A5F' });
        } catch (e) {
          console.log('Splash/StatusBar no disponible:', e);
        }
      }
      setIsLoading(false);
    };

    // Cargar sesión guardada
    const savedChoferId = localStorage.getItem('choferId');
    const savedToken = localStorage.getItem('choferToken');
    const savedNombre = localStorage.getItem('choferNombre');
    const savedViaje = localStorage.getItem('viajeActivoId');

    if (savedChoferId && savedToken) {
      setChoferId(savedChoferId);
      setChoferToken(savedToken);
      setChoferNombre(savedNombre);
    }

    if (savedViaje) {
      setViajeActivoIdState(savedViaje);
    }

    initCapacitor();
  }, []);

  const setChofer = (id: string | null, token: string | null, nombre: string | null) => {
    setChoferId(id);
    setChoferToken(token);
    setChoferNombre(nombre);

    if (id && token) {
      localStorage.setItem('choferId', id);
      localStorage.setItem('choferToken', token);
      if (nombre) localStorage.setItem('choferNombre', nombre);
    } else {
      localStorage.removeItem('choferId');
      localStorage.removeItem('choferToken');
      localStorage.removeItem('choferNombre');
    }
  };

  const setViajeActivo = (id: string | null) => {
    setViajeActivoIdState(id);
    if (id) {
      localStorage.setItem('viajeActivoId', id);
    } else {
      localStorage.removeItem('viajeActivoId');
    }
  };

  const logout = () => {
    setChofer(null, null, null);
    setViajeActivo(null);
  };

  return (
    <AppContext.Provider
      value={{
        isLoading,
        choferId,
        choferToken,
        choferNombre,
        viajeActivoId,
        setChofer,
        setViajeActivo,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
