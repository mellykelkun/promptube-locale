declare module "yauzl" {
  import type { Readable } from "node:stream";

  export type Entry = {
    fileName: string;
    compressedSize: number;
    uncompressedSize: number;
    compressionMethod: number;
    generalPurposeBitFlag: number;
    externalFileAttributes: number;
  };

  export interface ZipFile {
    readEntry(): void;
    close(): void;
    openReadStream(entry: Entry, callback: (error: Error | null, stream: Readable) => void): void;
    on(event: "entry", listener: (entry: Entry) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export function fromBuffer(
    buffer: Buffer,
    options: {
      lazyEntries: true;
      validateEntrySizes: true;
      strictFileNames: true;
    },
    callback: (error: Error | null, zipFile: ZipFile) => void,
  ): void;
}

declare module "yazl" {
  import type { Readable } from "node:stream";

  export class ZipFile {
    outputStream: Readable;
    addBuffer(
      buffer: Buffer,
      metadataPath: string,
      options: {
        mtime: Date;
        mode: number;
        compress: boolean;
        compressionLevel: number;
        forceDosTimestamp: boolean;
      },
    ): void;
    end(): void;
  }
}
