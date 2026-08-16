import * as schema from "./src/db/schema"; 
import { pgGenerate } from "drizzle-dbml-generator"; // Use pgGenerate, mysqlGenerate, or sqliteGenerate

const out = "./schema.dbml";
const relational = true;

pgGenerate({ schema, out, relational });
console.log("DBML schema generated successfully at:", out);
