CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_code" varchar(20) NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"ifsc_code" varchar(11) NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_branch_code_unique" UNIQUE("branch_code")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"national_id" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"branch_id" varchar NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"kyc_status" varchar(30) DEFAULT 'PENDING_ADMIN_APPROVAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "customers_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE "pending_registrations" (
	"email" text PRIMARY KEY NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone_number" text NOT NULL,
	"national_id" text NOT NULL,
	"address" text NOT NULL,
	"account_type" text NOT NULL,
	"hashed_otp" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"balance" text DEFAULT '0.00' NOT NULL,
	"customer_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_branches_branch_code_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;