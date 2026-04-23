import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "rounded-3xl border border-slate-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
