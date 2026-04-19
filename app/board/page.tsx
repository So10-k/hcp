import SideQuestClient from "../sidequest-client";
import { requireUser } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await requireUser();
  return <SideQuestClient isAdmin={user.role === "admin"} />;
}
