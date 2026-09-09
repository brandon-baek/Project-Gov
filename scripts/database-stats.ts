import { openDatabase } from "@/lib/database";

const database = openDatabase();
const tables = database.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
const nodes = database.prepare("SELECT kind, status, COUNT(*) AS count FROM graph_nodes GROUP BY kind, status ORDER BY kind, status").all();
const edges = database.prepare("SELECT relation, COUNT(*) AS count FROM graph_edges GROUP BY relation ORDER BY relation").all();
const integrity = database.pragma("integrity_check");
process.stdout.write(`${JSON.stringify({ database: database.name, integrity, tables, nodes, edges }, null, 2)}\n`);
database.close();
