import { getAdminOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/dash";
import { db } from "~/.server/db";
import { useEffect, useState } from "react";
import { cn } from "~/utils/cn";
import { Form, useFetcher } from "react-router";
import Spinner from "~/components/common/Spinner";

// @todo cache
// export const clientAction = async ({
//   request,
//   serverAction,
// }: Route.ClientActionArgs) => {
//   const formData = await request.formData();
//   const intent = formData.get("intent");
//   if (intent === "load_all") {
//     return serverAction();
//   }
//   return null;
// };

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const firstUsers = await db.user.findMany({
    select: {
      createdAt: true,
      email: true,
      displayName: true,
      confirmed: true,
    },
    take: 20,
    orderBy: {
      createdAt: "desc",
    },
  });
  const totalAccounts = await db.user.count();
  const from_blog = await db.subscriber.count({
    where: {
      tags: {
        has: "from_blog",
      },
    },
  });
  const from_signup = await db.subscriber.count({
    where: {
      tags: {
        has: "from_signup",
      },
    },
  });
  const other_tags = await db.subscriber.count({
    where: {
      NOT: [
        {
          tags: {
            hasSome: ["from_blog", "from_signup"],
          },
        },
      ],
    },
  });
  const total_subs = await db.subscriber.count();
  const total_confirmed_subs = await db.subscriber.count({
    where: { confirmed: true },
  });

  return {
    other_tags,
    total_confirmed_subs,
    total_subs,
    totalAccounts,
    from_blog,
    from_signup,
    firstUsers,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "load_all") {
    return {
      users: await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          email: true,
          displayName: true,
          confirmed: true,
        },
      }),
    };
  }
};

export default function Page({
  loaderData: {
    total_confirmed_subs,
    total_subs,
    firstUsers,
    totalAccounts,
    from_blog,
    from_signup,
    other_tags,
  },
}: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [users, setUsers] = useState(firstUsers);

  useEffect(() => {
    if (fetcher.data?.users?.length > 0) {
      setUsers(fetcher.data.users);
    }
  }, [fetcher]);

  const nodes = [
    <p className="flex justify-between">
      Cuentas creadas (users): <strong>{totalAccounts}</strong>
    </p>,
    <p className="flex justify-between">
      Total Suscritos: <strong>{total_subs}</strong>
    </p>,
    <p className="flex justify-between">
      Total Suscritos confirmados: <strong>{total_confirmed_subs}</strong>
    </p>,
    <p className="flex justify-between">
      Suscritos con tag "from_blog": <strong>{from_blog}</strong>
    </p>,
    <p className="flex justify-between">
      Suscritos con tag "from_signup": <strong>{from_signup}</strong>
    </p>,
    <p className="flex justify-between">
      Suscritos con otras tags: <strong>{other_tags}</strong>
    </p>,
  ];

  return (
    <article className="py-40 text-white px-4 relative">
      <h2 className="text-4xl mb-8 text-center">Dashboard</h2>
      <section className="mx-auto bg-gray-900 p-10 rounded-3xl max-w-xl grid gap-2 mb-4">
        {nodes.map((n, i) => (
          <div
            key={i}
            className={cn({
              "p-px": true,
              "bg-gray-800": i % 2 === 0,
            })}
          >
            {n}
          </div>
        ))}
      </section>
      <header
        className={cn(
          "max-w-3xl mx-auto px-10 grid gap-px",
          "grid grid-cols-12 sticky top-20 bg-gray-900 py-4 rounded-t-3xl"
        )}
      >
        <h4 className="col-span-6 text-xs">Email</h4>
        <h4 className="col-span-3 text-xs">DisplayName</h4>
        <h4 className="col-span-2 w-max text-xs">Fecha de registro</h4>
        <h4 className="col-span-1 text-xs">Confirmada</h4>
      </header>
      <section className="p-10 max-w-3xl mx-auto bg-gray-800 rounded-b-3xl grid gap-px">
        {users.map((user, i) => (
          <div
            key={i}
            className={cn("grid grid-cols-12 text-gray-400 py-px px-1", {
              "bg-gray-700": i % 2 === 0,
            })}
          >
            <span className="col-span-6 text-gray-200">{user.email}</span>
            <span className="col-span-3 text-xs self-center">
              {user.displayName}
            </span>
            <span className="col-span-2 text-xs">
              {new Date(user.createdAt).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
              })}
            </span>
            <div className="col-span-1 text-center">
              {user.confirmed ? (
                <span className="text-xs bg-green-300 p-1 rounded-full">
                  si
                </span>
              ) : (
                <span className="text-xs bg-orange-300 p-1 rounded-full">
                  no
                </span>
              )}
            </div>
          </div>
        ))}
      </section>
      <fetcher.Form method="post">
        <button
          name="intent"
          value="load_all"
          type="submit"
          className="p-4 bg-brand-700 rounded-2xl mx-auto block my-2"
        >
          {fetcher.state !== "idle" ? <Spinner /> : "Cargar todo"}
        </button>
      </fetcher.Form>
    </article>
  );
}
