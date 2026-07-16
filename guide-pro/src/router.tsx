import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getPublicBasePath } from "./lib/api";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
        staleTime: 60_000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
  return createRouter({
    routeTree,
    basepath: getPublicBasePath() || undefined,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
