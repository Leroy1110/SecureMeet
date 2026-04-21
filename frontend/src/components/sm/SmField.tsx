import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type SmFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  helper?: string;
  error?: string;
  trailing?: ReactNode;
  className?: string;
};

const SmField = forwardRef<HTMLInputElement, SmFieldProps>(function SmField(
  { label, helper, error, id, trailing, className, ...rest },
  ref,
) {
  const inputClass = error ? "sm-input sm-input-error" : "sm-input";
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column" }}>
      {label && (
        <label htmlFor={id} className="sm-label">
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input ref={ref} id={id} className={inputClass} {...rest} />
        {trailing && (
          <div
            style={{
              position: "absolute",
              right: 10,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              color: "var(--sm-fg-subtle)",
            }}
          >
            {trailing}
          </div>
        )}
      </div>
      {(helper || error) && (
        <span
          style={{
            fontSize: 11.5,
            marginTop: 6,
            color: error ? "var(--sm-danger)" : "var(--sm-fg-subtle)",
          }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
});

export default SmField;
