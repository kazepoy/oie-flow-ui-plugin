// SPDX-License-Identifier: MPL-2.0
// Start, pause, resume and stop buttons of a channel or a connector. Only the
// commands the state allows and the user's role grants are shown.
import { t } from "../i18n/index.js";
import { Icon } from "../shared/ui/Icon.jsx";

const ICON = { start: "play", resume: "play", startConnector: "play", pause: "pause", stop: "stop", stopConnector: "stop" };

/**
 * @param {{ commands: string[], target: { channelId: string, metaDataId?: number, name: string }, actions: any }} props
 */
export function ControlButtons({ commands, target, actions }) {
  const allowed = commands.filter(actions.canControl);
  if (!allowed.length) return null;
  const busy = actions.isBusy(target);
  return (
    <span className="ofu-controls" role="group" aria-label={t("flows.control.group", { name: target.name })}>
      {allowed.map(command => {
        const label = t(`flows.control.${command}`, { name: target.name });
        return (
          <button key={command} type="button" className={`ofu-control ofu-control--${ICON[command]}`}
            title={label} aria-label={label} disabled={busy} onClick={() => actions.control(command, target)}>
            <Icon name={ICON[command]} />
          </button>
        );
      })}
    </span>
  );
}
