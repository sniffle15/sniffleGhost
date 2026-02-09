export declare function encryptToken(token: string, secret: string): string;
export declare function decryptToken(payload: string, secret: string): string;
export declare function decryptTokenWithFallback(payload: string, secrets: string[]): {
    token: string;
    usedSecret: string;
};
