// SPDX-License-Identifier: MPL-2.0
// Installs the module hooks of hooks.mjs (node --import ./register.mjs ...).
import { registerHooks } from "node:module";
import { resolve } from "./hooks.mjs";

registerHooks({ resolve });
