// HEXY.PRO App - /app/src/utils/debug.js - Utility function to log messages to the console.
 

export function say(message, data) {
  console.log(`%c${message}`, 'color: #bada55; font-weight: bold;', data);
}
