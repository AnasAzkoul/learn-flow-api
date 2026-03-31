import { Hono } from "hono";
import { triage } from "./triage.js";
import { outline } from "./outline.js";

const generations = new Hono();

generations.route("/triage", triage);
generations.route("/outline", outline);

export { generations };
