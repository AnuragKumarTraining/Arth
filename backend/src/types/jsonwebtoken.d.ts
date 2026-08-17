declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    algorithm?: string;
    [key: string]: any;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: any
  ): any;

  export type Secret = string | Buffer;
}
