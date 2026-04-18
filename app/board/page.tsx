import SideQuestClient from "../sidequest-client";
import { requireUser } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  await requireUser();
  return <SideQuestClient />;
}
