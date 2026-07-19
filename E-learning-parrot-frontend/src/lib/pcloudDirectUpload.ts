export type PCloudDirectUploadConfig = {
  upload_mode?: "api" | "direct";
  upload_url: string;
  folderid: number;
  root_folderid?: number;
  access_token?: string;
  folder_path: string;
};

export type PCloudUploadedFile = {
  fileid: number;
  name: string;
  size: number;
  contenttype?: string | null;
};

type PCloudApiResponse = {
  result: number;
  error?: string;
  uploadid?: number;
  metadata?: PCloudUploadedFile | PCloudUploadedFile[];
};

function normalizePCloudFile(meta: PCloudUploadedFile | PCloudUploadedFile[] | undefined): PCloudUploadedFile {
  if (!meta) {
    throw new Error("pCloud returned no file metadata");
  }
  const file = Array.isArray(meta) ? meta[0] : meta;
  if (!file?.fileid) {
    throw new Error("pCloud returned invalid file metadata");
  }
  return {
    fileid: Number(file.fileid),
    name: String(file.name ?? "file"),
    size: Number(file.size ?? 0),
    contenttype: file.contenttype ?? null,
  };
}

function uploadChunkWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  loadedBase = 0,
  totalSize = 0
): Promise<PCloudApiResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    if (onProgress && totalSize > 0) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const loaded = loadedBase + event.loaded;
          onProgress(Math.min(100, Math.round((loaded * 100) / totalSize)));
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as PCloudApiResponse;
        if (json.result !== 0) {
          reject(new Error(json.error || "pCloud upload failed"));
          return;
        }
        resolve(json);
      } catch {
        reject(new Error("Invalid pCloud response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading to pCloud"));
    xhr.send(formData);
  });
}

/** Upload a file straight from the browser to pCloud (never touches cPanel). */
export async function uploadFileDirectToPCloud(
  file: File,
  config: PCloudDirectUploadConfig,
  onProgress?: (percent: number) => void
): Promise<PCloudUploadedFile> {
  const chunkThreshold = 50 * 1024 * 1024;
  const chunkSize = 10 * 1024 * 1024;

  if (file.size < chunkThreshold) {
    const params = new URLSearchParams({
      folderid: String(config.folderid),
      access_token: config.access_token ?? "",
      renameifexists: "1",
      nopartial: "1",
    });

    if (!config.access_token) {
      throw new Error(
        "Direct pCloud upload is disabled. Hard-refresh the page (Ctrl+F5) or ask admin to redeploy the latest frontend."
      );
    }

    const form = new FormData();
    form.append("file", file, file.name);

    const json = await uploadChunkWithProgress(
      `${config.upload_url}?${params.toString()}`,
      form,
      onProgress,
      0,
      file.size
    );

    return normalizePCloudFile(json.metadata);
  }

  let uploadId: number | null = null;
  let offset = 0;

  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const isFinal = offset + slice.size >= file.size;

    const params = new URLSearchParams({
      folderid: String(config.folderid),
      access_token: config.access_token,
      uploadoffset: String(offset),
      renameifexists: "1",
    });

    if (uploadId !== null) {
      params.set("uploadid", String(uploadId));
    }

    const form = new FormData();
    form.append("file", slice, isFinal ? file.name : "chunk.bin");

    const json = await uploadChunkWithProgress(
      `${config.upload_url}?${params.toString()}`,
      form,
      onProgress,
      offset,
      file.size
    );

    if (json.uploadid) {
      uploadId = Number(json.uploadid);
    }

    offset += slice.size;

    if (json.metadata) {
      onProgress?.(100);
      return normalizePCloudFile(json.metadata);
    }
  }

  throw new Error("pCloud chunked upload did not return file metadata");
}
