export interface OrganizationAccount {
  role?: string;
  email?: string;
  name?: string;
  permissions?: string[];
  organizationScopes?: string[];
}
export const WORKSPACES = [
  "magxtv",
  "deals",
  "stream",
  "digital",
  "live",
  "mystic",
  "visual",
  "gateway",
  "gatefit",
] as const;
export type Workspace = (typeof WORKSPACES)[number];
export const DATA_PERMISSIONS: Record<string, string> = {
  stats: "analytics",
  inventory: "inventory",
  "inventory-adjust":"inventory",
  "order-status":"orders",
  orders: "orders",
  products: "products",
  live: "inventory",
  audit: "audit",
};
export function workspaceScopes(user: OrganizationAccount): string[] {
  if (user.role === "admin") return [...WORKSPACES];
  if (user.role !== "staff") return [];
  const explicit = user.organizationScopes;
  if (Array.isArray(explicit))
    return WORKSPACES.filter((scope) => explicit.includes(scope));
  const p = user.permissions || [];
  return p.some((v) =>
    ["products", "orders", "inventory", "analytics", "customers"].includes(v),
  )
    ? ["digital"]
    : [];
}
export function canReadSection(
  user: OrganizationAccount,
  section: string,
): boolean {
  if (section === "profile" || section === "heartbeat")
    return user.role === "admin" || user.role === "staff";
  const records:Record<string,string>={"deal-records":"deals","mystic-projects":"mystic","visual-designs":"visual","mystic-run":"mystic","mystic-runs":"mystic","visual-assist":"visual"};
  if(records[section])return (user.role==="admin"||user.role==="staff")&&workspaceScopes(user).includes(records[section]);
  if (["catalog-stream","catalog-live","catalog-magxtv"].includes(section)) return user.role === "admin" || workspaceScopes(user).includes(section.slice(8));
  if (user.role === "admin")
    return [
      "stats",
      "inventory",
      "inventory-adjust",
      "order-status",
      "orders",
      "products",
      "live",
      "audit",
      "people",
      "devices",
      "staff-scopes",
      "staff-create",
      "staff-update",
      "revoke-device",
      "chat",
      "gateway-chat",
    ].includes(section);
  if (user.role !== "staff") return false;
  if (section === "chat") return workspaceScopes(user).includes("gatefit");
  if (section === "gateway-chat")
    return workspaceScopes(user).includes("gateway");
  const permission = DATA_PERMISSIONS[section];
  if (!permission || !(user.permissions || []).includes(permission))
    return false;
  return workspaceScopes(user).includes(
    section === "live" ? "live" : "digital",
  );
}
export function validDeviceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  );
}
