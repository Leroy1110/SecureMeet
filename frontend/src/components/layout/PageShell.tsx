import React from "react";

type PageShellProps = {
  children: React.ReactNode;
};

function PageShell({ children }: PageShellProps) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      {children}
    </div>
  );
}

export default PageShell