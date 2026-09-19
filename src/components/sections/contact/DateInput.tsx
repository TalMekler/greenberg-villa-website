import { Icon } from "../../ui/Icon";

interface DateInputProps {
  id: string;
  name: string;
  value: string;
  min?: string;
  placeholder: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedBy?: string;
  /** The form's shared field styling; sizing and the date fixes are added here. */
  className: string;
}

/**
 * A native date input that looks the same on every phone. iOS Safari draws no
 * calendar icon and shows an empty box until a date is picked, and gives the
 * field an intrinsic width that ignores `w-full` — so the icon and placeholder
 * are ours, and the native value is only shown once there is one (or while
 * a desktop visitor is typing into it). Chrome lays the date out left-to-right
 * even in Hebrew, so it is pushed to the start edge to line up with the rest.
 * iOS Safari also pins the value to the top of a styled date field, so the
 * line height fills the field (52px less the borders) to centre it vertically.
 */
export function DateInput({
  id,
  name,
  value,
  min,
  placeholder,
  onChange,
  invalid,
  describedBy,
  className,
}: DateInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="date"
        aria-required="true"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // Open the picker from anywhere in the field, not just the icon.
        onClick={(event) => {
          try {
            event.currentTarget.showPicker?.();
          } catch {
            // Not allowed here (e.g. in a cross-origin frame); the native field still works.
          }
        }}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`peer ${className} block h-[52px] min-w-0 leading-[50px] cursor-pointer appearance-none pe-12 text-start [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:block rtl:[&::-webkit-datetime-edit]:text-right [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-date-and-time-value]:text-start ${
          value ? "" : "not-focus:text-transparent"
        }`}
      />
      {!value && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-4 flex items-center font-sans text-[14px] text-cream/70 peer-focus:hidden"
        >
          {placeholder}
        </span>
      )}
      <span className="pointer-events-none absolute top-1/2 end-4 -translate-y-1/2">
        <Icon name="calendar" size={16} />
      </span>
    </div>
  );
}
