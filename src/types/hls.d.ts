declare module "hls.js" {
  export default class Hls {
    static isSupported(): boolean;
    constructor(config?: any);
    attachMedia(video: HTMLVideoElement): void;
    loadSource(url: string): void;
    startLoad(startPosition?: number): void; // ✅ добавлено
    stopLoad(): void; // ✅ полезно для паузы
    destroy(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    recoverMediaError(): void;
    currentLevel: number;
    levels: any[];
    static Events: Record<string, string>;
  }
}
