import { createWorker } from 'tesseract.js'

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i

export function isImageFile(name: string): boolean {
  return IMAGE_EXT.test(name)
}

export async function ocrImageText(file: File, langs = 'fra+eng'): Promise<string> {
  const worker = await createWorker(langs)
  try {
    const { data } = await worker.recognize(file)
    return data.text?.trim() ?? ''
  } finally {
    await worker.terminate()
  }
}