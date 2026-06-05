import { redirect } from "next/navigation";

// The watch room is now the home page (the editorial live room). Keep this path
// working for old links by redirecting.
export default function WatchRedirect() {
  redirect("/");
}
