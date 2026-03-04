"use client";

/**
 * Compatibility shim for react-router-dom.
 * Maps react-router-dom APIs to their Next.js App Router equivalents.
 * This allows existing page components to work without modification.
 */

import NextLink from "next/link";
import {
  useRouter,
  usePathname,
  useParams as useNextParams,
  redirect,
} from "next/navigation";
import React from "react";

// --- Link ---
export const Link = React.forwardRef<
  HTMLAnchorElement,
  Omit<React.ComponentProps<typeof NextLink>, "href"> & { to: string }
>(function RouterLink({ to, children, ...rest }, ref) {
  return (
    <NextLink ref={ref} href={to} {...rest}>
      {children}
    </NextLink>
  );
});
Link.displayName = "Link";

// --- useNavigate ---
export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else router.push("/");
    } else if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

// --- useSearchParams ---
export function useSearchParams(): [URLSearchParams, (params: URLSearchParams) => void] {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const router = useRouter();
  const setParams = (next: URLSearchParams) => {
    router.push(`?${next.toString()}`);
  };
  return [params, setParams];
}

// --- useParams ---
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useNextParams() as T;
}

// --- useLocation ---
export function useLocation() {
  const pathname = usePathname();
  return { pathname, search: "", hash: "", state: null, key: "default" };
}

// --- Navigate (redirect component) ---
export function Navigate({ to }: { to: string; replace?: boolean }) {
  redirect(to);
  return null;
}
