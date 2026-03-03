import JSZip from 'jszip';
import { db } from '../db';
import type { Question } from '../db';

/**
 * Danh sách các file zip bộ đề được bundle sẵn trong public/
 * Khi app khởi động lần đầu, tự động nạp tất cả vào IndexedDB.
 */
const BUNDLED_DATASETS = [
  'GiaiPhau_3tier.zip',
  'NgoaiChung_3tier.zip',
  'NhanThucChinhTri_3tier.zip',
  'NoiKhoa_3tier.zip',
  'SieuAmTongQuat_3tier.zip',
  'SinhLy_3tier.zip',
];

export interface PreloadProgress {
  current: number;
  total: number;
  currentFile: string;
  message: string;
}

type ProgressCallback = (progress: PreloadProgress) => void;

/**
 * Blobbed version of ImportService.importFromZip — không cần File object,
 * nhận ArrayBuffer trực tiếp để tránh phụ thuộc File API khi fetch.
 */
async function importZipBuffer(buffer: ArrayBuffer): Promise<number> {
  const zip = await JSZip.loadAsync(buffer);

  const questionsJson = await zip.file('questions.json')?.async('string');
  const metadataJson = await zip.file('metadata.json')?.async('string');

  if (!questionsJson) throw new Error('Không tìm thấy questions.json trong zip');

  const questionsRaw: any[] = JSON.parse(questionsJson);
  const meta = metadataJson ? JSON.parse(metadataJson) : null;

  // 1. Xử lý ảnh
  const imageMap = new Map<string, string>();
  const imageFiles = Object.keys(zip.files).filter(
    (path) => path.startsWith('images/') && !zip.files[path].dir
  );
  for (const path of imageFiles) {
    const blob = await zip.file(path)!.async('blob');
    const dataUrl = await blobToDataUrl(blob);
    imageMap.set(path, dataUrl);
  }

  // 2. Tạo Subject hierarchy từ metadata
  const idMapping = new Map<number, number>();

  if (meta?.subjects) {
    const sortedSubjects = [...meta.subjects].sort((a: any) =>
      a.parentId === null ? -1 : 1
    );
    for (const s of sortedSubjects) {
      const parentId =
        s.parentId !== null ? idMapping.get(s.parentId) || null : null;
      const newId = await db.subjects.add({
        name: s.name,
        level: s.level,
        type: s.type,
        examTerm: s.examTerm,
        parentId,
        createdAt: Date.now(),
      });
      idMapping.set(s.id, newId);
    }
  }

  // 3. Map & insert questions
  const questions: Question[] = questionsRaw.map((q) => ({
    ...q,
    subjectId: idMapping.get(q.subjectId) || 0,
    image: q.image ? imageMap.get(q.image) || q.image : null,
    explanationImage: q.explanationImage
      ? imageMap.get(q.explanationImage) || q.explanationImage
      : null,
    optionImages: (q.optionImages || []).map((img: string) =>
      img ? imageMap.get(img) || img : null
    ),
    createdAt: Date.now(),
  }));

  await db.questions.bulkAdd(questions);
  return questions.length;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Nạp tất cả bộ đề từ public/ vào IndexedDB.
 * Chỉ chạy 1 lần duy nhất khi app chưa initialized.
 */
export async function preloadBundledData(
  onProgress?: ProgressCallback
): Promise<string> {
  const total = BUNDLED_DATASETS.length;
  let totalQuestions = 0;

  for (let i = 0; i < total; i++) {
    const fileName = BUNDLED_DATASETS[i];
    const label = fileName.replace('_3tier.zip', '');

    onProgress?.({
      current: i + 1,
      total,
      currentFile: label,
      message: `Đang nạp ${label}... (${i + 1}/${total})`,
    });

    try {
      const response = await fetch(`/${fileName}`);
      if (!response.ok) {
        console.warn(`Không tải được ${fileName}: ${response.status}`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      const count = await importZipBuffer(buffer);
      totalQuestions += count;
    } catch (err) {
      console.error(`Lỗi nạp ${fileName}:`, err);
    }
  }

  return `Đã nạp ${totalQuestions} câu hỏi từ ${total} bộ đề.`;
}
