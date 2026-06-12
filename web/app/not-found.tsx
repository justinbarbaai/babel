import Link from "next/link";

// 404 in the house voice — a misprint notice, not an error screen.
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Page 404 · Misprint
      </span>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(34px, 6vw, 56px)", margin: 0 }}>
        The tape moved on.
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
        Whatever was printed here has been pulled from circulation. The market,
        however, is still very much open.
      </p>
      <Link
        href="/"
        style={{
          fontFamily: "var(--mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          border: "1px solid var(--border-2)",
          borderRadius: 999,
          padding: "10px 22px",
          color: "var(--text)",
          textDecoration: "none",
        }}
      >
        ← Back to the floor
      </Link>
    </div>
  );
}
