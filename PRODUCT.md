# PRODUCT.md — SalaryWorking

Mô tả sản phẩm ở mức "cái gì / cho ai / vì sao". Chi tiết kỹ thuật xem `CLAUDE.md` và `.claude/docs/`.

---

## 1. Web này là gì?

SalaryWorking là **ứng dụng web một trang để công nhân/nhân viên làm ca tự theo dõi lương của chính mình**.

Người dùng ghi lại ca làm (ngày làm việc + giờ vào/ra), app tự quy đổi thành số giờ thập phân,
tách phần **giờ ngày** và **giờ đêm** theo cửa sổ đêm của riêng họ (mặc định 22:00–06:00),
nhân với đơn giá tương ứng, cộng thêm ca lễ, trừ các khoản bị trừ, cộng thu nhập việc ngoài —
ra con số **"kỳ lương này tôi được bao nhiêu"**.

Nó **không phải** phần mềm chấm công của công ty, **không phải** hệ thống HR, **không phải** app quản lý nhân sự.
Nó đứng về phía **người đi làm**, chạy song song với bảng lương của công ty để đối chiếu.

---

## 2. Production này dùng để làm gì?

Bản chạy thật phục vụ đúng một vòng lặp hằng tháng của người làm ca:

1. **Trong kỳ** — nhập lịch tuần (gõ tay, hoặc chụp ảnh bảng phân ca để app đọc), rồi mỗi ngày đi làm về thì điền giờ vào/ra thực tế.
2. **Cuối kỳ** — xem tổng giờ, tổng lương dự kiến của kỳ (mặc định 26 → 25 hằng tháng, cấu hình được).
3. **Ngày nhận lương** — app nhắc; người dùng đối chiếu số của app với phiếu lương công ty, đánh dấu "đã nhận".
4. **Khi lệch** — dò lại từng ca xem "giờ mất" ở đâu, khoản trừ nào chưa tính.

Nói ngắn: **production này là công cụ đối chiếu lương cá nhân**, không phải nơi lưu trữ chính thức của doanh nghiệp.

---

## 3. Vấn đề chính đang giải quyết

**Người làm ca không kiểm chứng được phiếu lương của mình.**

Cụ thể, những chỗ hay sai và hay bị bỏ qua:

| Vấn đề | SalaryWorking xử lý thế nào |
|---|---|
| Ca vắt qua nửa đêm, không biết phần nào là giờ đêm | Tách phút ngày/đêm bằng công thức chính xác, biên 22:00–06:00 tính 100% đêm |
| Vào sớm / ra muộn tưởng được trả thêm, thực tế thì không | Chỉ trả phần **giao** giữa lịch dự kiến và giờ thực tế; phần chênh hiển thị rõ là "giờ mất" |
| Tính nhẩm hoặc Excel tay, mỗi tháng làm lại từ đầu | Nhập một lần, tổng kỳ tự cộng |
| Đơn giá mỗi người mỗi khác, phụ cấp đêm/lễ tính theo % | Đơn giá + % phụ cấp lưu theo **từng hồ sơ**, không hard-code |
| Kỳ lương vắt qua hai tháng (26 → 25) nên khó gom ca | Gom ca theo kỳ tự động, hiển thị đúng khoảng ngày |
| Trừ tiền, thu nhập việc ngoài nằm ngoài công thức giờ công | Có bảng riêng cho **khoản trừ** và **thu nhập ngoài**, cộng/trừ vào tổng kỳ |
| Bảng phân ca do quản lý dán ở xưởng, chép tay dễ sai | Chụp ảnh → app trích lịch, có **lớp đối chiếu OCR** cảnh báo ô đọc lệch (không tự ghi đè, người dùng xác nhận) |

Ràng buộc nền: **dữ liệu lương là dữ liệu nhạy cảm**. Mỗi người chỉ thấy ca của chính mình,
đảm bảo ở tầng database bằng Row Level Security (`auth.uid() = user_id`) chứ không phải bằng filter ở client.

---

## 4. Đối tượng người dùng

**Chính:** người làm việc theo ca hưởng lương giờ — công nhân nhà máy, nhân viên bán lẻ / F&B,
bảo vệ, điều dưỡng, kho vận. Đặc điểm chung:

- Ca xoay, có ca đêm, có ngày lễ.
- Đơn giá giờ + phụ cấp % đêm/lễ, kỳ lương chốt giữa tháng.
- **Dùng trên điện thoại**, thường là lúc vừa tan ca — mệt, một tay, màn hình ngoài trời hoặc trong xưởng tối.
- Không phải dân kỹ thuật. Không đọc tài liệu. Không có kiên nhẫn cho onboarding 5 bước.

**Bối cảnh ngôn ngữ:** giao diện đa ngữ (vi / en / us / au) — người dùng gồm cả lao động Việt trong nước
và lao động Việt ở nước ngoài, nên tiền tệ và định dạng ngày phải theo cấu hình chứ không mặc định cứng.

**Không nhắm tới:** phòng nhân sự, kế toán tiền lương, quản lý ca của doanh nghiệp.
Nếu một tính năng chỉ có ý nghĩa với người quản lý chứ không với người đi làm — nó không thuộc sản phẩm này.

---

## 5. Key features

**Lõi — tính lương**
- Nhập ca: ngày làm việc + giờ vào/ra. `end <= start` tự hiểu là ca kết thúc hôm sau.
- Tách giờ ngày / giờ đêm theo cửa sổ đêm cấu hình được theo từng người.
- Lịch dự kiến vs giờ thực tế: chỉ trả phần giao, hiển thị "giờ mất" khi vào trễ / ra sớm.
- Ca lễ: đánh dấu `is_holiday`, áp đơn giá lễ theo % trong hồ sơ.
- Đơn giá theo từng người: lương 1 giờ + phụ cấp % đêm / lễ ngày / lễ đêm.

**Kỳ lương & tiền bạc**
- Kỳ lương cấu hình được (mặc định 26 → 25), tự gom ca vào đúng kỳ.
- Khoản trừ (deductions) gắn theo kỳ, có ngày + lý do.
- Thu nhập việc ngoài (extra income) — tách hẳn khỏi công thức giờ công; có trạng thái đã/chưa nhận, khoản chưa nhận treo sang kỳ sau.
- Đánh dấu kỳ đã nhận lương + nhắc ngày nhận lương (payday 1–10).

**Nhập liệu nhanh**
- Nhập lịch tuần thủ công.
- Import lịch từ **ảnh bảng phân ca** (Edge Function `extract-schedule`).
- **Lớp đối chiếu OCR** chạy song song để cảnh báo giá trị đọc có thật xuất hiện trong ảnh không — chỉ cảnh báo, không bao giờ tự ghi đè số.
- Đối chiếu (reconcile) lịch đã nhập với thực tế.

**Trợ lý lương (chatbot)**
- Hỏi bằng ngôn ngữ tự nhiên: *"cần làm bao nhiêu ca để được 3 triệu?"*, *"tuần này tôi được bao nhiêu?"*
- Trả lời tính từ **lịch sử thật của người dùng**, không phải ước lượng chung.
- Nút nổi kéo thả được, vị trí lưu theo tài khoản; lịch sử hội thoại lưu riêng từng người.

**Tài khoản & cá nhân hoá**
- Đăng nhập Supabase Auth, hồ sơ nhân viên (mã NV, họ tên, SĐT), avatar.
- Chuyển nhanh giữa nhiều tài khoản không cần nhập lại mật khẩu.
- 3 phong cách giao diện: `dark` / `glass` / `neumorph`; 3 cỡ chữ; 4 ngôn ngữ — tất cả lưu theo tài khoản, đồng bộ đa thiết bị.
- Popup "Có cập nhật mới" theo changelog phiên bản.

---

## 6. Design note — tránh cái vẻ "AI productivity app"

> Đây là ràng buộc thiết kế, không phải gợi ý. Áp dụng cho mọi UI mới.

### Vì sao

Sản phẩm này nói về **tiền lương của một người lao động cụ thể**. Nó cần tạo cảm giác của một cuốn sổ
ghi công đáng tin, không phải cảm giác của một startup SaaS đang gọi vốn. Ngôn ngữ thị giác mặc định
của mọi công cụ AI hiện nay — và đó chính là thứ sẽ tự động chui vào nếu không ai chặn — làm hỏng
đúng cái cảm giác đó: nó nói "demo", "beta", "sẽ đổi tháng sau", trong khi người dùng cần "con số này đúng".

### Cụ thể phải tránh

| Đừng | Thay bằng |
|---|---|
| Gradient tím–xanh, glow, viền phát sáng | Màu nền phẳng, một màu nhấn duy nhất, tương phản đến từ độ đậm chứ không từ ánh sáng |
| Sparkle ✨ / robot 🤖 / "Powered by AI" | Không gắn nhãn AI ở đâu cả. Tính năng đọc ảnh chỉ là "nhập từ ảnh", chatbot chỉ là "trợ lý lương" |
| Icon-set Lucide/Heroicons mặc định rải khắp nơi | Ít icon. Chỗ nào chữ nói rõ hơn thì dùng chữ |
| Card bo 16px + shadow mềm + padding rộng, lặp lại vô tận | Mật độ cao hơn. Đây là bảng công — người dùng cần thấy nhiều ca cùng lúc, không cần khoảng trắng thẩm mỹ |
| Inter/Geist + tracking-tight + heading nửa trong suốt | Chữ số phải là **tabular / monospace** để các cột tiền thẳng hàng và so sánh được bằng mắt |
| Empty state vẽ minh hoạ dễ thương + "Let's get started!" | Empty state nói thẳng việc cần làm tiếp theo |
| Microcopy kiểu trợ lý ("Great! I've added that for you 🎉") | Câu trần thuật, ngắn, không ngôi thứ nhất |
| Skeleton shimmer chạy khắp trang | Loading tối giản, ưu tiên giữ layout không nhảy |

### Nguyên tắc dương

1. **Con số là nhân vật chính.** Tiền và giờ được ưu tiên về cỡ, độ đậm, vị trí. Nhãn phụ trợ lùi lại.
2. **Rõ ràng hơn là mượt mà.** Một chỗ hiển thị "giờ mất" thẳng thắn có giá trị hơn một transition đẹp.
3. **Ngón cái, một tay, vừa tan ca.** Thao tác chính nằm trong tầm với dưới màn hình. Vùng chạm rộng.
4. **Không bao giờ giả vờ chắc chắn.** Số do máy đọc từ ảnh phải trông khác số do người nhập, và luôn cần xác nhận.
5. **Ba theme là ba tính cách khác nhau, không phải ba bảng màu.** `dark` = mặc định, gọn và tối; `glass` = kính mờ; `neumorph` = nền sáng, bóng mềm. Tính năng mới phải trông đúng trong cả ba.
6. **Thà quen thuộc còn hơn mới lạ.** Người dùng đã quen bảng công giấy và Excel. Mượn ẩn dụ đó, đừng phát minh lại.

### Bài kiểm tra một câu

> *Nếu chụp màn hình này rồi dán vào một thread "AI app UI" trên Twitter mà không ai nhận ra nó khác biệt — làm lại.*
