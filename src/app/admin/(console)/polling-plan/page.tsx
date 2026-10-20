import { redirect } from "next/navigation";

/** The polling plan became the Premium page (every plan, its end date and its history). The old address keeps working. */
export default function PollingPlanRedirect() {
  redirect("/admin/premium");
}
