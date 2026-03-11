import React from "react";

type PageShellProps = {
  children: React.ReactNode;
};

function PageShell({ children }: PageShellProps) {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      {children}
    </div>
  );
}

export default PageShell