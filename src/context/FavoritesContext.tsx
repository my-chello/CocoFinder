import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { favoriteVendorIds as initialFavoriteVendorIds } from '../data/mockVendors';
import { getCurrentSupabaseUserId, isMissingRelationError } from '../lib/social';
import { supabase } from '../lib/supabase';

type FavoritesContextValue = {
  favoriteVendorIds: string[];
  isFavorite: (vendorId: string) => boolean;
  toggleFavorite: (vendorId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type FavoritesProviderProps = {
  children: ReactNode;
};

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>(initialFavoriteVendorIds);

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      try {
        const userId = await getCurrentSupabaseUserId();

        if (!userId) {
          return;
        }

        const { data, error } = await supabase
          .from('app_favorites')
          .select('vendor_id')
          .eq('user_id', userId);

        if (error) {
          if (!isMissingRelationError(error.message)) {
            console.error('Failed to load favorites from Supabase', error);
          }
          return;
        }

        if (isMounted) {
          setFavoriteVendorIds((data ?? []).map((row) => row.vendor_id as string));
        }
      } catch {}
    }

    void loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteVendorIds,
      isFavorite: (vendorId: string) => favoriteVendorIds.includes(vendorId),
      toggleFavorite: (vendorId: string) => {
        setFavoriteVendorIds((current) => {
          const nextFavorites = current.includes(vendorId)
            ? current.filter((id) => id !== vendorId)
            : [...current, vendorId];

          void (async () => {
            try {
              const userId = await getCurrentSupabaseUserId();

              if (!userId) {
                return;
              }

              if (current.includes(vendorId)) {
                const { error } = await supabase
                  .from('app_favorites')
                  .delete()
                  .eq('user_id', userId)
                  .eq('vendor_id', vendorId);

                if (error && !isMissingRelationError(error.message)) {
                  console.error('Failed to remove favorite', error);
                }
                return;
              }

              const { error } = await supabase.from('app_favorites').upsert(
                {
                  user_id: userId,
                  vendor_id: vendorId,
                },
                {
                  onConflict: 'user_id,vendor_id',
                }
              );

              if (error && !isMissingRelationError(error.message)) {
                console.error('Failed to save favorite', error);
              }
            } catch {}
          })();

          return nextFavorites;
        });
      },
    }),
    [favoriteVendorIds]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider.');
  }

  return context;
}
