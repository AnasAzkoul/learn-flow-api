import { Hono } from "hono";
import { triage } from "./triage.js";

const generations = new Hono();

generations.route("/triage", triage);

export { generations };
