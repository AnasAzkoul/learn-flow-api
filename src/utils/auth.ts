import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.ts";
import { openAPI } from "better-auth/plugins";
import * as authSchema from "../schemas/auth.schema.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:5173"],
  plugins: [openAPI()],
  advanced: {
    useSecureCookies: true,
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    // Map BetterAuth's "name" to your "fullName" column
    fields: {
      name: "fullName",
    },
    // Define your additional custom fields

    additionalFields: {
      gender: {
        type: ["male", "female", "other", "prefer_not_to_say"],
        required: true,
      },
      birthDate: {
        type: "date",
        required: true,
      },
      educationalLevel: {
        type: [
          "primary",
          "secondary",
          "tertiary",
          "diploma",
          "degree",
          "master",
          "phd",
        ],
        required: true,
      },
      occupation: {
        type: "string",
        required: true,
      },
      learningStyle: {
        type: ["conversational", "academic", "example_driven"],
        required: true,
      },
      termsAndConditions: {
        type: "boolean",
        required: true,
      },
    },
  },
});
