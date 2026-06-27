import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { ROLE_HOME } from "@/features/admin/RoleSwitcher";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { effectiveRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!effectiveRole) {
      navigate({ to: "/login", replace: true });
    } else {
      navigate({ to: ROLE_HOME[effectiveRole], replace: true });
    }
  }, [loading, effectiveRole, navigate]);

  return null;
}
