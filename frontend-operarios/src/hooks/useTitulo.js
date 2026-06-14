import { useEffect } from 'react';

export function useTitulo(titulo) {
  useEffect(() => {
    const tituloOriginal = document.title;
    document.title = titulo;

    // Opcional: restaurar el título original al desmontar el componente
    return () => {
      document.title = tituloOriginal;
    };
  }, [titulo]);
}