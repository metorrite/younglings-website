import { requireAdmin } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";
import { authFailure, receiveImage } from "@/lib/uploadRoute";

/** A picture for one place in the clan server's welcome embed, from the clan admin console. */
export async function POST(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  let admin;
  try {
    admin = await requireAdmin("/admin/welcome");
  } catch (error) {
    const response = authFailure(error);
    if (response) return response;
    throw error;
  }
  return receiveImage(request, slot, admin.actorId, (base64) => adminApi.uploadWelcomeImage(admin, slot, base64));
}
