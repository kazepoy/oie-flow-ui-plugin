// SPDX-License-Identifier: MPL-2.0

/** A centered message for a view with nothing to show. @param {{ title: string, children?: any }} props */
export function EmptyState({ title, children }) {
  return (
    <div className="ofu-empty" role="status">
      <strong>{title}</strong>
      {children}
    </div>
  );
}
