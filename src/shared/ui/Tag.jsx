// SPDX-License-Identifier: MPL-2.0
// Channel tag pills, shared by Flows Monitoring (under Details) and Channel Flow's picker.
import { tagStyle } from "../model/tags.js";
import { cx } from "./Button.jsx";

/** @param {{ tags: { id: string, name: string, color: string | null }[], className?: string }} props */
export function TagList({ tags, className }) {
  if (!tags?.length) return null;
  return (
    <span className={cx("ofu-tags", className)}>
      {tags.map(tag => (
        <span key={tag.id} className="ofu-tag" style={tagStyle(tag.color)} title={tag.name}>{tag.name}</span>
      ))}
    </span>
  );
}

