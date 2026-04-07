import { useEffect, useState } from 'react';
import { getPublicSiteData, PublicSiteData } from '@/services/api';

export const emptyPublicSiteData: PublicSiteData = {
  overview: {
    totalBooks: 0,
    availableCopies: 0,
    activeLoans: 0,
    suggestionsCount: 0,
    totalUsers: 0,
    activeNotices: 0,
    featuredNotices: [],
  },
  pendingLoans: 0,
  completedLoans: 0,
  totalFavorites: 0,
  totalReviews: 0,
  studentsCount: 0,
  teachersCount: 0,
  activeNotices: [],
  highlightedNotices: [],
  topBooks: [],
};

const usePublicSiteData = () => {
  const [data, setData] = useState<PublicSiteData>(emptyPublicSiteData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const nextData = await getPublicSiteData();
        if (active) {
          setData(nextData);
        }
      } catch {
        if (active) {
          setData((current) => current);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return { data, isLoading };
};

export default usePublicSiteData;
