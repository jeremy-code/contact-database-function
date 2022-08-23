import * as yup from "yup";

const formSchema = yup.object({
	name: yup.string().required().trim().max(30),
	email: yup.string().email().required().trim().max(30),
	message: yup.string().required(),
});

type FormSchema = yup.InferType<typeof formSchema>;

interface Env {
	DB: D1Database;
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		try {
			const [data] = await Promise.all([
				formSchema.validate(await req.json()),
				createTableIfNotExists(env.DB, "messages"),
			]);
			const res = await insertMessage(env.DB, "messages", data);
			if (res.success) {
				return new Response(JSON.stringify(data), { status: 202 });
			}
			return new Response("Internal Server Error", { status: 500 });
		} catch (e) {
			return new Response("Invalid Request", { status: 400 });
		}
	},
};

const createTableIfNotExists = async (db: D1Database, tableName: string) => {
	return await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY, name TEXT, email TEXT, message TEXT, timestamp TIME)`
		)
		.run();
};

const insertMessage = async (
	db: D1Database,
	tableName: string,
	data: FormSchema
) => {
	const { name, email, message } = data;
	return await db
		.prepare(
			`INSERT INTO ${tableName} (name, email, message, timestamp) VALUES (?, ?, ?, datetime())`
		)
		.bind(name, email, message)
		.run();
};
