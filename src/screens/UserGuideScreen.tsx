import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Download, Share2, Database } from 'lucide-react';
import JSZip from 'jszip';

export const UserGuideScreen: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-bold">Hướng dẫn sử dụng</h2>
                    <p className="text-xs text-gray-400">DrDucQY95</p>
                </div>
            </div>

            <div className="prose dark:prose-invert max-w-none space-y-8">
                {/* 1. Giới thiệu */}
                <section className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4 text-primary">
                        <BookOpen size={24} />
                        <h3 className="text-lg font-bold m-0">Giới thiệu</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Chào mừng bạn đến với ứng dụng <b>Ôn Thi Trắc Nghiệm DrDucQY95</b>.
                        Đây là ứng dụng web hỗ trợ ôn tập kiến thức y khoa (và các lĩnh vực khác) một cách hiệu quả, mọi lúc mọi nơi.
                        Ứng dụng hoạt động theo cơ chế <b>Offline First</b> (PWA), cho phép bạn sử dụng ngay cả khi không có mạng internet sau lần tải đầu tiên.
                        Khi sử dụng lần đầu, bạn hãy vào Cài Đặt => lướt xuống cuối, chọn bộ đề có sẵn cần học để tải về. Hoặc bạn có thể import bộ đề của mình theo hướng dẫn ở dưới.
                    </p>
                </section>

                {/* 2. Chức năng chính */}
                <section className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4 text-green-500">
                        <Database size={24} />
                        <h3 className="text-lg font-bold m-0">Chức năng chính</h3>
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <li className="flex gap-2">
                            <span className="font-bold text-gray-800 dark:text-gray-100">• Ngân hàng câu hỏi:</span>
                            Quản lý các bộ đề thi, môn học theo cấu trúc cây thư mục đa cấp (Bộ đề gốc - Bộ đề con - Câu hỏi). Các bạn có thể chỉnh sửa nội dung câu hỏi, đáp án để chính xác hơn nếu thấy sai (nút chỉnh sửa ở mỗi câu hỏi). Truy cập tại Home => Ngân hàng
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold text-gray-800 dark:text-gray-100">• Thi thử & Luyện tập:</span>
                            Chế độ thi mô phỏng thời gian thực (Thi thử) hoặc luyện tập từng câu, có đánh giá đáp án và bổ sung giải thích đáp án nếu có (Ôn tập).
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold text-gray-800 dark:text-gray-100">• Thống kê & Lịch sử:</span>
                            Xem lại lịch sử các bài thi, biểu đồ tiến độ học tập và các câu hay sai (Lịch sử).
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold text-gray-800 dark:text-gray-100">• Cá nhân hóa:</span>
                            Tùy chỉnh giao diện (Sáng/Tối), cỡ chữ, hình nền và các thông tin cá nhân.
                        </li>
                    </ul>
                </section>

                {/* 3. Import / Export */}
                <section className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4 text-blue-500">
                        <Share2 size={24} />
                        <h3 className="text-lg font-bold m-0">Import & Export dữ liệu</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">📥 Nhập dữ liệu (Import)</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                Bạn có thể thêm câu hỏi từ nhiều định dạng khác nhau tại màn hình <b>Cài đặt</b> hoặc chi tiết bộ đề:
                            </p>
                            <ul className="pl-4 list-disc space-y-1 text-xs text-gray-500">
                                <li><b>Excel (.xlsx)</b>: Dữ liệu dạng bảng.</li>
                                <li><b>Word (.docx)</b>: Dữ liệu văn bản thô (cần đúng format).</li>
                                <li><b>JSON (.json)</b>: Định dạng dữ liệu chuẩn.</li>
                                <li><b>ZIP (.zip)</b>: Gói dữ liệu đầy đủ bao gồm cả hình ảnh và cấu trúc thư mục.</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">📤 Xuất dữ liệu (Export)</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Tại màn hình chi tiết môn học, bạn có thể nhấn nút <b>Export</b> (biểu tượng tải xuống) để sao lưu bộ đề hiện tại ra file <b>.zip</b>. File này chứa đầy đủ câu hỏi và hình ảnh, có thể dùng để chia sẻ hoặc import lại sau này.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. Template */}
                <section className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4 text-orange-500">
                        <FileText size={24} />
                        <h3 className="text-lg font-bold m-0">Cấu trúc Template</h3>
                    </div>
                    <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                        <p>Để import thành công, file dữ liệu cần tuân thủ cấu trúc nhất định:</p>

                        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl">
                            <h5 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Excel (.xlsx)</h5>
                            <p className="text-xs mb-2">Hàng 1 là tiêu đề cột. Các cột quan trọng:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>• <b>Content/Nội dung</b>: Câu hỏi</div>
                                <div>• <b>A, B, C, D</b>: Các đáp án</div>
                                <div>• <b>Correct Answer/Đáp án đúng</b>: Ví dụ "A" hoặc "A,B"</div>
                                <div>• <b>Type/Loại</b>: MULTIPLE_CHOICE, TRUE_FALSE...</div>
                                <div>• <b>Image/Ảnh</b>: Link ảnh hoặc tên file</div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl">
                            <h5 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Word (.docx)</h5>
                            <p className="text-xs">
                                Soạn thảo thủ công theo quy tắc:
                                <br />- Câu 1: Nội dung câu hỏi...
                                <br />- A. Đáp án A
                                <br />- B. Đáp án B
                                <br />- ...
                                <br />- Đáp án: A
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl">
                            <h5 className="font-bold text-gray-800 dark:text-gray-100 mb-2">ZIP Package (Standard)</h5>
                            <p className="text-xs mb-3">
                                Cấu trúc chuẩn cho tính năng Backup/Restore:
                                <br />📦 filename.zip
                                <br /> ┣ 📜 metadata.json (Thông tin môn học)
                                <br /> ┣ 📜 questions.json (Danh sách câu hỏi)
                                <br /> ┗ 📂 images/ (Thư mục chứa toàn bộ ảnh)
                            </p>

                            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-zinc-700">
                                <div>
                                    <h6 className="font-bold text-xs text-gray-700 dark:text-gray-200">1. metadata.json</h6>
                                    <p className="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-zinc-900 p-2 rounded mt-1">
                                        {`{
  "version": "1.0",
  "subjects": [
    {
      "id": 1,
      "name": "Tên Môn Học",
      "parentId": null, // ID cha nếu có
      "level": "Đại học",
      "type": "Lý thuyết"
    }
  ]
}`}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">Dùng để xác định cấu trúc môn học, ID môn để map với câu hỏi.</p>
                                </div>

                                <div>
                                    <h6 className="font-bold text-xs text-gray-700 dark:text-gray-200">2. questions.json</h6>
                                    <p className="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-zinc-900 p-2 rounded mt-1">
                                        {`[
  {
    "subjectId": 1, // Khớp với ID trong metadata
    "content": "Nội dung câu hỏi...",
    "questionType": "MULTIPLE_CHOICE",
    "options": ["A. Đúng", "B. Sai"],
    "correctAnswers": ["A"],
    "image": "images/q1.png", // Đường dẫn tương đối
    "optionImages": [null, "images/q1_b.png"]
  }
]`}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        <b>image</b>: Đường dẫn tương đối đến file trong folder images.<br />
                                        <b>questionType</b>: MULTIPLE_CHOICE (Trắc nghiệm), TRUE_FALSE (Đúng sai), TRUE_FALSE_TABLE (Chùm câu hỏi).
                                    </p>
                                </div>

                                <div>
                                    <h6 className="font-bold text-xs text-gray-700 dark:text-gray-200">3. Thư mục images/</h6>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Chứa toàn bộ file ảnh (png, jpg, jpeg).<br />
                                        <b>Quy tắc đặt tên</b>: Không bắt buộc, nhưng nên đặt theo mã câu hỏi để dễ quản lý (VD: q1.png, q1_optA.png).<br />
                                        <b>Lưu ý</b>: Trong file JSON phải trỏ đúng đường dẫn `images/filename.ext`.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={async () => {
                                    try {
                                        const zip = new JSZip();

                                        // metadata.json
                                        const metadata = {
                                            version: "1.0",
                                            subjects: [{
                                                id: 1,
                                                name: "Môn Học Mẫu",
                                                parentId: null,
                                                level: "Đại học",
                                                type: "Lý thuyết",
                                                examTerm: "Kỳ 1"
                                            }]
                                        };
                                        zip.file("metadata.json", JSON.stringify(metadata, null, 2));

                                        // questions.json
                                        const questions = [{
                                            subjectId: 1,
                                            content: "Đây là câu hỏi mẫu 1 (Trắc nghiệm)?",
                                            questionType: "MULTIPLE_CHOICE",
                                            options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                                            correctAnswers: ["A"],
                                            image: null,
                                            optionImages: [null, null, null, null],
                                            explanation: "Giải thích chi tiết cho câu hỏi 1."
                                        }, {
                                            subjectId: 1,
                                            content: "Đây là câu hỏi mẫu 2 (Đúng / Sai)?",
                                            questionType: "TRUE_FALSE",
                                            options: ["Đúng", "Sai"],
                                            correctAnswers: ["A"],
                                            image: "images/example.png",
                                            optionImages: [null, null]
                                        }];
                                        zip.file("questions.json", JSON.stringify(questions, null, 2));

                                        // images folder
                                        const img = zip.folder("images");
                                        img?.file("readme.txt", "Đặt các file ảnh vào thư mục này và tham chiếu trong questions.json (VD: images/hinh1.png)");

                                        // Generate and Download
                                        const content = await zip.generateAsync({ type: "blob" });
                                        const url = URL.createObjectURL(content);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = "OnThi_Template_Sample.zip";
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    } catch (e) {
                                        console.error(e);
                                        alert('Lỗi tạo file mẫu!');
                                    }
                                }}
                                className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                Tải Template ZIP
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
