import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="font-serif text-5xl font-semibold text-ink">404</div>
      <p className="mt-2 text-sm text-ink-muted">This page does not exist.</p>
      <Link to="/" className="btn-primary mt-5">
        Back to home
      </Link>
    </div>
  );
}
