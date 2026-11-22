/** The look of an on/off switch, as on Android. The control around it handles the click. */
export function SwitchTrack({
  checked,
  className = "",
}: {
  checked: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
        checked ? "bg-primary" : "bg-line"
      } ${className}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </span>
  );
}
