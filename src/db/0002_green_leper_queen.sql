CREATE TYPE "public"."course_depth" AS ENUM('primer', 'deep_dive', 'monolith');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."knowledge_level" AS ENUM('novis', 'adept', 'expert');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('theory', 'hands_on', 'project', 'quiz');--> statement-breakpoint
CREATE TABLE "course" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"subject" text NOT NULL,
	"knowledge" "knowledge_level" NOT NULL,
	"depth" "course_depth" NOT NULL,
	"learning_objectives" text[] NOT NULL,
	"prerequisites" text[] NOT NULL,
	"status" "course_status" DEFAULT 'generating' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" "lesson_type" NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_userId_idx" ON "course" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lesson_moduleId_idx" ON "lesson" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "module_courseId_idx" ON "module" USING btree ("course_id");