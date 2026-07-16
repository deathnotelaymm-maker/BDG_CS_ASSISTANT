import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function adminPlatformBasepath() {
  if (typeof window === "undefined") return undefined;
  const match = window.location.pathname.match(/^\/p\/([a-z0-9-]+)\/admin(?:\/|$)/i);
  return match ? `/p/${match[1]}/admin` : undefined;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    basepath: adminPlatformBasepath(),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
