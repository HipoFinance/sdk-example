import { Buffer } from 'buffer'

// @types/node declares Buffer on globalThis, so the type system is sure this guard is dead code.
// It is not: in a browser there is no global Buffer until this assignment runs, which is the whole
// point of the polyfill the TON libraries need.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!globalThis.Buffer) {
    globalThis.Buffer = Buffer
}
