import { redirect } from "next/navigation";

// The moderation queue is now part of the full admin dashboard.
export default function AdminReviewRedirect() {
  redirect("/admin");
}
