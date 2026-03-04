"use client";

import { useEffect } from "react";
import { useAuthStore, useModuleStore } from "@/store";
import type { User } from "@/store";

/**
 * Syncs server-side session data into client Zustand stores.
 * Rendered in the dashboard layout with props from the server.
 */
export function StoreSync({
  user,
  enabledModules,
}: {
  user: User;
  enabledModules: string[];
}) {
  useEffect(() => {
    const current = useAuthStore.getState().user;
    if (!current || current.id !== user.id) {
      useAuthStore.getState().setAppUser(user);
    }
  }, [user]);

  useEffect(() => {
    const store = useModuleStore.getState();
    if (!store.loaded) {
      store.setModules(enabledModules);
    }
  }, [enabledModules]);

  return null;
}
