"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getSession } from "@/lib/session";
import { useHydrated } from "@/lib/useHydrated";
import type { Role, SessionData } from "@/lib/types";

type GuardState = {
  loading: boolean;
  session: SessionData | null;
};

export function useAuthGuard(requiredRole?: Role): GuardState {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = hydrated ? getSession() : null;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!session) {
      const nextUrl = encodeURIComponent(pathname || "/");
      const loginPath = requiredRole === "ROLE_ADMIN" ? "/admin/login" : "/login";
      router.replace(`${loginPath}?next=${nextUrl}`);
      return;
    }

    if (requiredRole && session.role !== requiredRole) {
      router.replace("/");
    }
  }, [hydrated, requiredRole, router, pathname, session]);

  if (!hydrated) {
    return { loading: true, session: null };
  }

  if (!session) {
    return { loading: false, session: null };
  }

  if (requiredRole && session.role !== requiredRole) {
    return { loading: false, session: null };
  }

  return { loading: false, session };
}
