import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { db } from '../db';
import type { Question } from '../db';

export interface ImportMetadata {
    version: string;
    subjects: Array<{
        id: number;
        parentId: number | null;
        name: string;
        level: string;
        type: string;
        examTerm: string;
    }>;
}

export class ImportService {
    static async importFromZip(file: File, targetSubjectId: number | null): Promise<string> {
        try {
            const zip = await JSZip.loadAsync(file);
            const questionsJson = await zip.file('questions.json')?.async('string');
            const metadataJson = await zip.file('metadata.json')?.async('string');

            if (!questionsJson) throw new Error('Không tìm thấy questions.json');

            const questionsToAdd: any[] = JSON.parse(questionsJson);
            const meta: ImportMetadata | null = metadataJson ? JSON.parse(metadataJson) : null;

            // 1. Xử lý ảnh
            const imageMap = new Map<string, string>();
            const imagesFolder = zip.folder('images');
            if (imagesFolder) {
                const imageFiles = Object.keys(zip.files).filter(path => path.startsWith('images/') && !zip.files[path].dir);
                for (const path of imageFiles) {
                    const blob = await zip.file(path)!.async('blob');
                    const dataUrl = await this.blobToDataUrl(blob);
                    imageMap.set(path, dataUrl);
                }
            }

            // 2. Xử lý Subject và Hierarchy
            const idMapping = new Map<number, number>(); // oldId -> newId

            if (meta && meta.subjects) {
                // Sắp xếp môn root lên trước
                const sortedSubjects = [...meta.subjects].sort((a, _b) => (a.parentId === null ? -1 : 1));

                for (const s of sortedSubjects) {
                    // Check duplicate name in same hierarchy? For now just create new.
                    // Or smart merge? Reference seems to just import.
                    const parentId = s.parentId !== null ? idMapping.get(s.parentId) || null : null;
                    const newId = await db.subjects.add({
                        name: s.name,
                        level: s.level,
                        type: s.type,
                        examTerm: s.examTerm,
                        parentId: parentId,
                        createdAt: Date.now()
                    });
                    idMapping.set(s.id, newId);
                }
            }

            // 3. Import Questions
            const questions = questionsToAdd.map(q => {
                // Logic: If targetSubjectId is provided, FORCE all questions to that subject.
                // Else use idMapping from metadata.
                // Fallback: if no mapping and no target, maybe orphan or error? 
                // Currently `targetSubjectId` = -1 means Auto.

                let finalSid = 0;
                if (targetSubjectId !== null && targetSubjectId !== -1) {
                    finalSid = targetSubjectId;
                } else {
                    finalSid = idMapping.get(q.subjectId) || 0;
                }

                return {
                    ...q,
                    subjectId: finalSid,
                    image: q.image ? imageMap.get(q.image) || q.image : null,
                    explanationImage: q.explanationImage ? imageMap.get(q.explanationImage) || q.explanationImage : null,
                    optionImages: (q.optionImages || []).map((img: string) => img ? imageMap.get(img) || img : null),
                    createdAt: Date.now()
                } as Question;
            });

            await db.questions.bulkAdd(questions);
            return `Thành công! Đã thêm ${questions.length} câu hỏi.`;
        } catch (e: any) {
            console.error(e);
            throw new Error(`Lỗi ZIP: ${e.message} `);
        }
    }

    static async importFromJson(file: File, subjectId: number): Promise<string> {
        // ... (Same as before but handling subjectId correctly)
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            let questions: any[] = [];

            if (Array.isArray(data)) {
                questions = data;
            } else if (data.questions) {
                questions = data.questions;
            } else {
                Object.keys(data).forEach(key => {
                    if (data[key].Q || data[key].content) questions.push(data[key]);
                });
            }

            const questionsToAdd = questions.map(q => ({
                subjectId,
                content: q.Q || q.content,
                questionType: q.type || q.questionType || "MULTIPLE_CHOICE",
                options: q.options || [q['1'], q['2'], q['3'], q['4']].filter(Boolean),
                optionImages: q.optionImages || [q.img1, q.img2, q.img3, q.img4].filter(Boolean),
                correctAnswers: typeof q.A === 'string' ? q.A.split(',') : (Array.isArray(q.correctAnswers) ? q.correctAnswers : ["A"]),
                explanation: q.explain || q.explanation || null,
                image: q.img || q.image || null,
                explanationImage: q.img_explain || q.explanationImage || null,
                subQuestions: q.subQuestions || [],
                subAnswers: q.subAnswers || [],
                status: 0,
                selectedAnswer: null,
                selectedSubAnswers: [],
                createdAt: Date.now()
            } as Question));

            await db.questions.bulkAdd(questionsToAdd);
            return `Đã thêm ${questionsToAdd.length} câu hỏi.`;
        } catch (e: any) {
            throw new Error(`Lỗi JSON: ${e.message} `);
        }
    }

    static async importFromExcel(file: File, subjectId: number): Promise<string> {
        // ... (Keep existing implementation)
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rows.length < 2) throw new Error('File Excel rỗng hoặc không đúng format');

            const questionsToAdd: Question[] = [];
            const headers = rows[0].map((h: any) => String(h).toLowerCase());
            const typeIdx = headers.findIndex((h: string) => h.includes('loại') || h.includes('type'));
            const contentIdx = 0;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[contentIdx]) continue;
                const type = typeIdx !== -1 ? row[typeIdx] : "MULTIPLE_CHOICE";
                // ... (Rest of logic same as original class, just compacted for this rewrite tool)
                if (type === "TRUE_FALSE_TABLE") {
                    const subQs = String(row[18] || "").split('|').filter(Boolean);
                    const subAs = String(row[19] || "").split(',').map(s => s.trim().toUpperCase() === 'T');
                    questionsToAdd.push({
                        subjectId, content: String(row[contentIdx]), questionType: "TRUE_FALSE_TABLE",
                        options: [], optionImages: [], subQuestions: subQs, subAnswers: subAs, correctAnswers: [],
                        explanation: row[11] || null, image: row[12] || null, explanationImage: row[17] || null,
                        status: 0, selectedAnswer: null, selectedSubAnswers: [], createdAt: Date.now()
                    });
                } else {
                    const options = row.slice(2, 10).filter(Boolean).map(String);
                    const correctAnswers = String(row[10] || "A").split(',').map(s => s.trim().toUpperCase());
                    questionsToAdd.push({
                        subjectId, content: String(row[contentIdx]), questionType: type as any,
                        options, optionImages: row.slice(13, 17).map((s: any) => s ? String(s) : null),
                        correctAnswers, explanation: row[11] || null, image: row[12] || null, explanationImage: row[17] || null,
                        subQuestions: [], subAnswers: [], status: 0, selectedAnswer: null, selectedSubAnswers: [], createdAt: Date.now()
                    });
                }
            }
            await db.questions.bulkAdd(questionsToAdd);
            return `Thành công! Đã thêm ${questionsToAdd.length} câu hỏi từ Excel.`;
        } catch (e: any) {
            throw new Error(`Lỗi Excel: ${e.message} `);
        }
    }

    static async importFromDocx(file: File, subjectId: number): Promise<string> {
        // ... (Keep existing implementation)
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

            const questionsToAdd: Question[] = [];
            let currentQ: Partial<Question> | null = null;
            let options: string[] = [];
            const qRegex = /^(Câu\s*\d+[:.)]?|\d+[:.)]?)\s*(.+)/i;
            const optRegex = /^[A-H][.):,]\s*(.+)/i;
            const ansRegex = /^(Đáp án|ĐA|Answer)[:\s]*(.+)/i;

            for (const line of lines) {
                const qMatch = line.match(qRegex);
                if (qMatch) {
                    if (currentQ && options.length >= 2) {
                        questionsToAdd.push({ ...currentQ, options, optionImages: options.map(() => null), explanation: null, image: null, explanationImage: null, createdAt: Date.now() } as Question);
                    }
                    currentQ = { subjectId, content: qMatch[2], questionType: "MULTIPLE_CHOICE", correctAnswers: ["A"], status: 0, subQuestions: [], subAnswers: [], selectedSubAnswers: [] };
                    options = [];
                    continue;
                }
                const optMatch = line.match(optRegex);
                if (optMatch && currentQ) { options.push(optMatch[1]); continue; }
                const ansMatch = line.match(ansRegex);
                if (ansMatch && currentQ) { currentQ.correctAnswers = ansMatch[2].split(/[,\s]+/).filter(Boolean).map(s => s.trim().toUpperCase()); continue; }
            }
            if (currentQ && options.length >= 2) {
                questionsToAdd.push({ ...currentQ, options, optionImages: options.map(() => null), explanation: null, image: null, explanationImage: null, createdAt: Date.now() } as Question);
            }
            await db.questions.bulkAdd(questionsToAdd);
            return `Thành công! Đã thêm ${questionsToAdd.length} câu hỏi từ DOCX.`;
        } catch (e: any) {
            throw new Error(`Lỗi DOCX: ${e.message} `);
        }
    }

    private static blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Wrapper Functions to match imports in components
export const importQuestionsFromJsonFile = async (file: File, subjectId: number) => ImportService.importFromJson(file, subjectId);
export const importQuestionsFromExcel = async (file: File, subjectId: number) => ImportService.importFromExcel(file, subjectId);
export const importQuestionsFromDocx = async (file: File, subjectId: number) => ImportService.importFromDocx(file, subjectId);
export const importQuestionsFromZip = async (file: File, subjectId: number) => ImportService.importFromZip(file, subjectId);
