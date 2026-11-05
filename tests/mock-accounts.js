// The accounts Worker for the TV, phone and desktop tests: the real Worker code (worker/src) over node:sqlite on
// 127.0.0.1:8790, a fresh database each start (ACCT_DB=<file> keeps one). Its test owner code is
// "copper kettle quiet harbour". The apps point at it with store 'acctHost' = http://127.0.0.1:8790.
import('../worker/test/server.js').then(({ serve, localEnv }) => {
  const port = +process.env.ACCT_PORT || 8790;
  serve(port, localEnv({ file: process.env.ACCT_DB || ':memory:' })).then(() => console.log(`fake accounts Worker :${port}`));
});
