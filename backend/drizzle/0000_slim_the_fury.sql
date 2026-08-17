CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_code" varchar(20) NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"ifsc_code" varchar(11) NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_branch_code_unique" UNIQUE("branch_code"),
	CONSTRAINT "branches_ifsc_code_unique" UNIQUE("ifsc_code")
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
	"branch_id" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"kyc_status" varchar(30) DEFAULT 'PENDING_ADMIN_APPROVAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
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
	"account_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"available_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"customer_id" integer NOT NULL,
	"branch_id" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"nickname" varchar(50),
	"account_number" varchar(20) NOT NULL,
	"ifsc_code" varchar(11) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"daily_limit" numeric(15, 2),
	"is_verified" boolean DEFAULT false NOT NULL,
	"cooling_period_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" integer NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(50) NOT NULL,
	"idempotency_key" varchar(100),
	"sender_account_id" integer,
	"receiver_account_id" integer,
	"external_account_number" varchar(50),
	"external_routing_code" varchar(20),
	"external_bank_name" varchar(100),
	"amount" numeric(15, 2) NOT NULL,
	"fee_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"failure_reason" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "transactions_reference_number_unique" UNIQUE("reference_number"),
	CONSTRAINT "transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_branches_branch_code_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_branch_id_branches_branch_code_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_account_id_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_account_id_accounts_id_fk" FOREIGN KEY ("receiver_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;