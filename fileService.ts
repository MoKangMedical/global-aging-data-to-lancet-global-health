import { spawn } from "child_process";
import { storagePut } from "./storage";

/**
 * Extract text content from PDF or Word document
 */
export async function extractTextFromFile(
  fileData: Buffer | string,
  mimeType: string
): Promise<string> {
  // Convert Buffer to base64 string if needed
  const base64Data = Buffer.isBuffer(fileData) ? fileData.toString('base64') : fileData;
  return new Promise<string>((resolve, reject) => {
    // Use standalone Python script with python3.11
    // Set PYTHONPATH to system Python 3.11 paths only, avoiding UV Python
    const scriptPath = "/home/ubuntu/epi-research-platform/server/extract_text.py";
    const fileType = mimeType === "application/pdf" ? "pdf" : "docx";
    const python = spawn("/usr/bin/python3.11", [scriptPath, fileType, base64Data], {
      env: {
        ...process.env,
        PYTHONPATH: "/usr/lib/python3.11:/usr/lib/python3.11/lib-dynload:/usr/local/lib/python3.11/dist-packages:/usr/lib/python3/dist-packages",
        PYTHONHOME: "/usr"
      }
    });

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Failed to extract text: ${errorOutput}`));
      } else {
        resolve(output.trim());
      }
    });

    python.on("error", (err: Error) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
  });
}

/**
 * Upload file to S3 storage
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: number
): Promise<{ fileKey: string; fileUrl: string }> {
  // Generate unique file key
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const fileExtension = fileName.split(".").pop();
  const fileKey = `user-${userId}/uploads/${timestamp}-${randomSuffix}.${fileExtension}`;

  // Upload to S3
  const result = await storagePut(fileKey, fileBuffer, mimeType);

  return {
    fileKey,
    fileUrl: result.url,
  };
}
