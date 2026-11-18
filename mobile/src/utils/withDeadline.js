// A last-resort UI deadline, independent of the HTTP adapter's timeout.
// Promise.race observes late rejection as well, so a stalled request cannot
// keep a list or dashboard spinner on screen indefinitely.
export async function withDeadline(task, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
