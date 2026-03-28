import { auth } from "./auth.ts";

export type User = typeof auth.$Infer.Session.user;

export type Session = typeof auth.$Infer.Session.session;
