import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Knowledge Base</h1>
      <p className="text-muted-foreground mb-8">Internal documentation - Confluence alternative</p>
      <div className="flex gap-4">
        <Link
          href="/kb"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Browse KB
        </Link>
        <Link
          href="/admin"
          className="px-4 py-2 border rounded-md hover:bg-muted"
        >
          Admin
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 border rounded-md hover:bg-muted"
        >
          Login
        </Link>
      </div>
    </main>
  );
}
