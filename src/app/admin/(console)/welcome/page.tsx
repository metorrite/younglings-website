import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { saveWelcomeAction, testWelcomeAction } from "./actions";

export const metadata = { title: "Welcome message — Younglings" };

export default async function WelcomePage() {
  const admin = await requireAdmin("/admin/welcome");
  const [welcome, structure] = await Promise.all([adminApi.welcome(admin).then(unwrap), adminApi.structure(admin).then(unwrap)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome message</h1>
        <p className="mt-1 text-sm text-muted">
          Greets each new member in a channel, as text, an embed, or both. It can also send them a copy by DM when their DMs are open. Bots are never welcomed.
        </p>
      </div>
      <WelcomeEditor initial={welcome} channels={structure.channels} actions={{ save: saveWelcomeAction, test: testWelcomeAction }} />
    </div>
  );
}
