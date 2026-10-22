import webpush from 'web-push';
import {randomBytes} from 'node:crypto';
const keys=webpush.generateVAPIDKeys();
// Run privately in a local/Codespaces terminal. Do not paste these values into chats or Git.
process.stdout.write(`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nPUSH_WEBHOOK_SECRET=${randomBytes(32).toString('hex')}\n`);
