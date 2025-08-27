import { Form } from "react-router";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import type { Route } from "../+types/cursos";
import { db } from "~/.server/db";
// import { db } from "~/.server/db";

export const action = async () => {
  const csv = fs.readFileSync(path.resolve("./suppression.csv"), "utf8");
  //   const csv = fs.readFileSync(path.resolve("./suppression.csv"), "utf8");
  const list = await new Promise((res) => {
    let records = [];
    const parser = parse(csv, { columns: true, trim: true });
    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
      res(records);
    });
  });
  const emails = list.map((e) => e.email);

  const count = await db.subscriber.count({
    where: {
      email: {
        in: emails,
      },
    },
  });
  await db.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
  return count;
};

export default function Page({ actionData }: Route.ComponentProps) {
  return (
    <>
      <Form method="post" className="py-20 text-white">
        <button>Limpiale!</button>
      </Form>
      <p className="text-white">Borrados: {actionData}</p>
    </>
  );
}
