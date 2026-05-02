import type { ReactNode } from "react";
import { SmLogo } from "../sm";

type AuthCardLayoutProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

function AuthCardLayout({
  title,
  description,
  footer,
  children,
}: AuthCardLayoutProps) {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "var(--sm-bg-sunken)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(45% 55% at 50% 20%, rgba(0, 92, 230, 0.05), transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 28,
          padding: "40px 36px",
          boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-md)",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SmLogo size={28} withWordmark={false} />
          </div>
          <h1
            className="sm-h2"
            style={{
              margin: "18px 0 8px",
              fontSize: 30,
              letterSpacing: "-0.025em",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "0 auto",
              maxWidth: 340,
              fontSize: 14.5,
              lineHeight: 1.5,
              color: "var(--sm-fg-muted)",
            }}
          >
            {description}
          </p>
        </header>

        {children}

        {footer ? (
          <footer
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid var(--sm-line)",
              textAlign: "center",
              fontSize: 13.5,
              color: "var(--sm-fg-muted)",
            }}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
}

export default AuthCardLayout;
