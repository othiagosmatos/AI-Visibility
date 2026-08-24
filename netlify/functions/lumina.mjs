import worker from "../../dist/server/index.js";

export default async function lumina(request, context) {
  return worker.fetch(request, {}, {
    waitUntil(promise) {
      context.waitUntil(promise);
    },
    passThroughOnException() {},
  });
}

export const config = {
  path: "/*",
  preferStatic: true,
};
