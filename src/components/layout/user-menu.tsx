import { getSessionUser } from "@/server/auth/session";

import { UserMenuDropdown } from "./user-menu-dropdown";

export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) return null;
  return <UserMenuDropdown name={user.name} email={user.email} image={user.image} />;
}
