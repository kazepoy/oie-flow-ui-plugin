// SPDX-License-Identifier: MPL-2.0
import { Icon } from "./Icon.jsx";

/** Joins class names, skipping empty ones. */
export const cx = (...names) => names.filter(Boolean).join(" ");

/**
 * A plain button. `icon` adds a leading icon; without children the button is
 * square and `label` names it for screen readers and the tooltip.
 */
export function Button({ icon, label, variant, className, children, ...rest }) {
  const iconOnly = icon && children == null;
  return (
    <button type="button" className={cx("ofu-button", variant && `ofu-button--${variant}`, iconOnly && "ofu-button--icon", className)}
      aria-label={iconOnly ? label : undefined} title={label} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/**
 * One choice among a few, shown side by side.
 * @param {{ label: string, value: string, options: { value: string, label: string, title?: string }[],
 *           onChange: (value: string) => void }} props
 */
export function SegmentedControl({ label, value, options, onChange }) {
  return (
    <div className="ofu-segmented" role="group" aria-label={label}>
      {options.map(option => (
        <button key={option.value} type="button" aria-pressed={option.value === value}
          title={option.title} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
