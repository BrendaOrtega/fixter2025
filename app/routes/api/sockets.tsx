// import { startSocketsServer } from "~/.server/socket";
import type { Route } from "./+types/sockets";

// export function headers(_: Route.HeadersArgs) {
//   return {
//     "Cache-Control": "max-age=3600, s-maxage=86400",
//     "Access-Control-Allow-Origin": "*",
//   };
// }

export const action = ({ request }: Route.ActionArgs) => {
  console.log("Starting sockets");
  //   startSocketsServer(request);
  return new Response(null, {
    headers: {
      //   "Access-Control-Allow-Origin": "*",
    },
  });
};
