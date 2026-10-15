import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2">
        Check the link you were given, or go back to the start.
      </p>
      <Link className="mt-4 inline-block underline" href="/">
        Go to Trybe
      </Link>
    </main>
  );
}
