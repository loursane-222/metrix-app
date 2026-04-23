"use client";

export default function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={\`px-2 py-1 text-xs rounded-full \${color}\`}>
      {text}
    </span>
  );
}
