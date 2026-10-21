import { notFound } from "next/navigation";

/** Any other path on a clan site: not a page. */
export default function NoSuchPage() {
  notFound();
}
