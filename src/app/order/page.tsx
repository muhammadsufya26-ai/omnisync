import { redirect } from "next/navigation";

export default function OrderSingularRedirect() {
  redirect("/orders");
}
