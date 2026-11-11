import { pollWarnings } from '../src/lib/server/poll';

const result = await pollWarnings();
console.log(JSON.stringify(result, null, 2));
