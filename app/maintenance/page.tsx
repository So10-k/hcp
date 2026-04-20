import { getMaintenanceConfig } from "../lib/sidequest-db";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  let message = "SideQuest is down for a quick update. Check back soon!";
  try {
    const config = await getMaintenanceConfig();
    if (config.message) message = config.message;
  } catch {
    // If DB is down, show the default message
  }

  return (
    <main className="maintenance-shell">
      <div className="maintenance-card">
        <p className="eyebrow">Under construction</p>
        <h1>SideQuest is taking a break</h1>
        <p className="maintenance-message">{message}</p>
        <p className="maintenance-sub">
          The admins will have everything back up shortly. No quests were harmed.
        </p>
      </div>
    </main>
  );
}
