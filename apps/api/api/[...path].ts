// The API build emits JavaScript without declaration files; Vercel compiles
// this serverless entrypoint separately from the TypeScript API source.
// @ts-ignore -- the runtime module is produced by the buildCommand above.
import app from "../dist/index.js";

export default async function handler(request: any, response: any) {
  await app.ready();
  app.server.emit("request", request, response);
}
