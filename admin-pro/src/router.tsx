import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function adminPlatformBasepath() {
  if (typeof window === "undefined") return undefined;
  const match = window.location.pathname.match(/^\/p\/([a-z0-9-]+)(?:\/admin)?(?:\/|$)/i);
  if (!match) return undefined;
  const legacyAdminSegment = new RegExp(`^/p/${match[1]}/admin(?:/|$)`, "i").test(window.location.pathname);
  return legacyAdminSegment ? `/p/${match[1]}/admin` : `/p/${match[1]}`;
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
