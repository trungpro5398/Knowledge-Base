-- Seed: TET ProSys space + page_templates with ready content
-- Run after RLS; space and page_templates are inserted for "tet-prosys" space.

INSERT INTO spaces (name, slug, description)
VALUES (
  'TET ProSys – Operation Manual',
  'tet-prosys',
  'Official ProSys operation manual. Single source of truth for workflow, automation, and audit.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Remove existing ProSys templates so re-run is idempotent
DELETE FROM page_templates
WHERE space_id = (SELECT id FROM spaces WHERE slug = 'tet-prosys' LIMIT 1);

-- Page templates: one row per ProSys page. content_md = ready-to-paste markdown.
-- space_id is resolved from slug so seed works with any existing tet-prosys space.

INSERT INTO page_templates (space_id, name, content_md)
SELECT s.id, t.name, t.content_md
FROM (SELECT id FROM spaces WHERE slug = 'tet-prosys' LIMIT 1) s
CROSS JOIN (VALUES
  (
    'Overview',
    $overview$
# TET ProSys – Overview

## 🇬🇧 What is TET ProSys?

TET ProSys is TET's internal procurement and service lifecycle management system, built on top of Jira.

It is designed to manage: Service requests, Vendor quotations, Approval flows (PM / FM), Service delivery tracking, Invoices and payments, Audit trail and compliance.

ProSys provides a single, auditable, end-to-end workflow for all non-core operational spending and service procurement.

## 🇻🇳 TET ProSys là gì?

TET ProSys là hệ thống quản lý vòng đời mua sắm và dịch vụ nội bộ của TET, được xây dựng trên nền Jira. Hệ thống này dùng để quản lý: Yêu cầu dịch vụ / mua sắm, Báo giá từ nhà cung cấp, Quy trình duyệt (PM / FM), Theo dõi quá trình thực hiện dịch vụ, Hóa đơn và thanh toán, Dấu vết audit và tuân thủ.

ProSys cung cấp một luồng xử lý thống nhất, có thể audit từ đầu đến cuối cho mọi chi tiêu vận hành không thuộc core business.

---

## 🇬🇧 What ProSys is NOT

ProSys is NOT: A general task management system, A product development board, A personal to-do list. Only procurement and service-related work should live in ProSys.

## 🇻🇳 ProSys KHÔNG dùng để làm gì?

ProSys KHÔNG phải: Board quản lý task chung, Board phát triển sản phẩm, To-do list cá nhân. Chỉ những việc liên quan tới mua sắm, thuê dịch vụ, chi phí vận hành mới được đưa vào ProSys.

---

## 🇬🇧 Who should use ProSys?

Staff / PO, PM, FM, Admin. Anyone who creates, reviews, approves, or audits procurement tasks must follow this manual.

## 🇻🇳 Ai sử dụng ProSys?

Staff / PO, PM, FM, Admin. Mọi thay đổi về workflow hoặc automation trong Jira phải được cập nhật vào bộ tài liệu này trước.

---

## 🇬🇧 What problems does ProSys solve?

No more approval via chat/email, lost invoices, unclear responsibility, unauditable spending. Everything is Tracked, Approved, Documented, Auditable.

## 🇻🇳 ProSys giải quyết vấn đề gì?

Không còn duyệt qua chat/email, thất lạc hóa đơn, mập mờ trách nhiệm, chi tiêu không audit được. Mọi thứ đều có theo dõi, duyệt, lưu vết, có thể audit.

---

## 🇬🇧 Relationship to other systems

Jira = execution engine. Confluence = rulebook & documentation. ProSys = operational governance layer on top of Jira.

## 🇻🇳 Quan hệ với các hệ thống khác

Jira = công cụ thực thi. Confluence = luật chơi / tài liệu. ProSys = lớp quản trị vận hành nằm trên Jira.
$overview$
  ),
  (
    'ProSys Core Design & Operating Model',
    $core$
# ProSys Core Design & Operating Model

## 🇬🇧 A. Core Design Principles

1. **Service-centric workflow**: Parent issue = Service (procurement item). Sub-task = Evidence only (Quote / Invoice). All approvals happen on parent issue. Sub-tasks never participate in approval or rejection.
2. **Audit-ready & non-spam**: Automation uses comments for guidance, not email spam. Entity properties guarantee one-time notification per event. Do not use automatic watchers in automation.
3. **Simple & debug-friendly**: All automation triggers must be FROM → TO transitions. Each rule handles exactly one transition. Never use generic "issue updated" triggers.

## 🇻🇳 A. Nguyên lý thiết kế cốt lõi

1. Lấy Service làm trung tâm. Task cha = 1 dịch vụ / hạng mục mua sắm. Sub-task chỉ để lưu bằng chứng (Quote / Invoice). Approval chỉ xảy ra ở task cha. Sub-task không bao giờ có approve / reject.
2. Sẵn sàng audit & không spam. Automation dùng comment để hướng dẫn, không spam email. Dùng entity property để đảm bảo mỗi sự kiện chỉ notify 1 lần. Không dùng watcher tự động trong automation.
3. Đơn giản, dễ debug. Mọi automation chỉ trigger theo FROM → TO status. Mỗi rule chỉ xử lý đúng 1 transition. Tuyệt đối không dùng "issue updated" chung chung.

---

## 🇬🇧 B. Issue Structure

1. **Parent – Service**: Represents one procurement or service item. Owns workflow, approval lifecycle, and audit trail. Contains labels, business context, dates, owner, and status.
2. **Sub-task – Evidence**: Purpose: store evidence only. Types: Quote, Invoice. Status: OPEN → DONE only. Never participates in approval or controls workflow. Only for file upload and metadata.

## 🇻🇳 B. Cấu trúc Issue

1. Task cha – Service: Đại diện cho 1 hạng mục dịch vụ / mua sắm. Chịu trách nhiệm workflow, approval, audit. Chứa labels, ngữ cảnh nghiệp vụ, ngày tháng, owner, status.
2. Sub-task – Evidence: Mục đích chỉ để lưu bằng chứng. Loại Quote, Invoice. Status OPEN → DONE. Không bao giờ tham gia approval hay điều khiển workflow. Chỉ dùng để upload file và metadata.

---

## 🇬🇧 C. Workflow – Parent (Service)

SERVICES TO PROCURE → QUOTES → PM APPROVE QUOTE → FM APPROVE QUOTE → SERVICES BEING DELIVERED → INVOICE → FM APPROVE TO PAY → DONE.

Rules: Reject is a transition, not a status. Only parent issue moves in this workflow. Sub-tasks never move in this chain.

## 🇻🇳 C. Workflow – Task cha (Service)

Chuỗi trạng thái chuẩn như trên. Luật: Reject là transition, không phải status. Chỉ task cha chạy trong workflow này. Sub-task không bao giờ tham gia.

---

## 🇬🇧 D. Transition Map

| From | Action | To |
|------|--------|-----|
| SERVICES TO PROCURE | Start collecting quotes | QUOTES |
| QUOTES | Submit for PM approval | PM APPROVE QUOTE |
| PM APPROVE QUOTE | Approve | FM APPROVE QUOTE |
| PM APPROVE QUOTE | Reject | QUOTES |
| FM APPROVE QUOTE | Approve | SERVICES BEING DELIVERED |
| FM APPROVE QUOTE | Reject | QUOTES |
| SERVICES BEING DELIVERED | Submit invoice | INVOICE |
| INVOICE | Submit for payment | FM APPROVE TO PAY |
| FM APPROVE TO PAY | Approve payment | DONE |
| FM APPROVE TO PAY | Reject | INVOICE |

---

## 🇬🇧 E. Automation Principles

Transition-triggered only. One rule = one transition. Every notify rule must have entity property guard.

## 🇻🇳 E. Nguyên tắc Automation

Chỉ trigger theo FROM → TO. Một rule = một transition. Mọi rule notify phải có entity property guard.

---

## 🇬🇧 F. Approval Logic

Parent status = single source of truth. PM approves quotes. FM approves quotes and payment. Jira records status, decision, audit history. Sub-tasks are never approved or rejected.

## 🇻🇳 F. Logic Approval

Status task cha = nguồn sự thật duy nhất. PM duyệt báo giá. FM duyệt báo giá và thanh toán. Sub-task không bao giờ được duyệt hoặc reject.

---

## 🇬🇧 G. Commission (Invoice)

Fields: Invoice Amount, Commission %, Commission Amount. Formula: Commission Amount = Invoice Amount × Commission % / 100. Trigger: When status becomes DONE.

## 🇻🇳 G. Hoa hồng (Invoice)

Các field và công thức như trên. Trigger khi status sang DONE.

---

## 🇬🇧 H. Uploaded At (Attachments)

Trigger: Attachment added. Action: Set Uploaded At = now. Never use generic issue updated trigger.

## 🇻🇳 H. Uploaded At (Đính kèm)

Trigger: Attachment added. Action: Set Uploaded At = now. Không dùng issue updated.

---

## 🇬🇧 I–P. Phase/Program, Visibility, Governance, Notification, Free vs Standard, Metadata, Summary

Use labels (phase-x, cohort-xxxx, loc-xxx). Saved filters = virtual folders. Parent status + watchers for approval visibility. ProSys provides end-to-end procurement lifecycle, clear role separation, auditable trail, predictable automation, zero-spam governance, scalable structure.

## 🇻🇳 I–P. Lọc Phase/Program, Hiển thị, Kỷ luật, Notification, Free vs Standard, Metadata, Tóm tắt

Dùng labels, filter ảo, status task cha + watchers. ProSys mang lại quản lý mua sắm end-to-end, phân quyền rõ ràng, audit đầy đủ, automation dễ đoán, không spam, mở rộng được.
$core$
  ),
  (
    'Workflow & Status',
    $workflow$
# Workflow & Status

## 🇬🇧 Purpose

This section defines the official operational workflow of ProSys as implemented in the Jira Kanban board. Only parent issues (Service) participate in this workflow. Sub-tasks are evidence only and never move across these statuses.

## 🇻🇳 Mục đích

Phần này định nghĩa workflow vận hành chính thức của ProSys. Chỉ task cha (Service) tham gia workflow này. Sub-task chỉ để lưu bằng chứng và không bao giờ chạy qua các status này.

---

## 🇬🇧 Standard Status Chain

SERVICES TO PROCURE → QUOTES → PM APPROVE QUOTE → FM APPROVE QUOTE → SERVICES BEING DELIVERED → INVOICE → FM APPROVE TO PAY → DONE.

Rules: Reject is a transition, not a status. Only parent issues move in this chain. Sub-tasks never enter this workflow.

## 🇻🇳 Chuỗi trạng thái chuẩn

Như trên. Luật: Reject là transition, không phải status. Chỉ task cha chạy trong chuỗi này. Sub-task không bao giờ tham gia.

---

## Status Index

- Services to Procure
- Quotes
- PM Approve Quote
- FM Approve Quote
- Services Being Delivered
- Invoice
- FM Approve To Pay
- Done

**Governance:** No status should be added, removed, or renamed without updating Core Design and this section. Jira board = execution. This documentation = rules.
$workflow$
  ),
  (
    'Services to Procure',
    $s1$
# Services to Procure

## 🇬🇧 Meaning

A new service or procurement request is created and logged into the system. This is the starting point of every ProSys case.

**Who handles:** Staff / PO, Service owner.

**Must contain:** Clear business title, Description, Business justification, Initial estimation (if available), Proper labels (phase, cohort, etc.).

**Exit condition:** Move to QUOTES when ready to collect quotations.

## 🇻🇳 Ý nghĩa

Một yêu cầu dịch vụ / mua sắm mới được tạo và đưa vào hệ thống. Đây là điểm bắt đầu của mọi case trong ProSys.

**Ai xử lý:** Staff / PO, Owner của dịch vụ. **Phải có:** Tên task rõ nghĩa, Mô tả, Lý do nghiệp vụ, Labels đúng chuẩn. **Khi nào chuyển tiếp:** Chuyển sang QUOTES khi bắt đầu đi lấy báo giá.
$s1$
  ),
  (
    'Quotes',
    $s2$
# Quotes

## 🇬🇧 Meaning

The team is collecting quotations from vendors.

**Who handles:** Staff / Procurement.

**Must contain:** At least 1 quote (preferably 2–3). Each quote uploaded as a sub-task or attachment.

**Exit condition:** Move to PM APPROVE QUOTE when ready for PM review.

## 🇻🇳 Ý nghĩa

Đang trong giai đoạn đi lấy báo giá từ nhà cung cấp. **Ai xử lý:** Staff / Procurement. **Phải có:** Ít nhất 1 báo giá (tốt nhất 2–3). **Khi nào chuyển tiếp:** Chuyển sang PM APPROVE QUOTE khi sẵn sàng cho PM duyệt.
$s2$
  ),
  (
    'PM Approve Quote',
    $s3$
# PM Approve Quote

## 🇬🇧 Meaning

PM reviews and approves the selected quotation. **PM checks:** Business necessity, Cost reasonableness, Vendor suitability.

**Exit condition:** Approve → FM APPROVE QUOTE. Reject → QUOTES.

## 🇻🇳 Ý nghĩa

PM duyệt báo giá được chọn. **Khi nào chuyển tiếp:** Approve → FM APPROVE QUOTE. Reject → quay lại QUOTES.
$s3$
  ),
  (
    'FM Approve Quote',
    $s4$
# FM Approve Quote

## 🇬🇧 Meaning

FM approves budget and financial feasibility. **FM checks:** Budget availability, Compliance, Financial justification.

**Exit condition:** Approve → SERVICES BEING DELIVERED. Reject → QUOTES.

## 🇻🇳 Ý nghĩa

FM duyệt về mặt ngân sách và tài chính. **Khi nào chuyển tiếp:** Approve → SERVICES BEING DELIVERED. Reject → quay lại QUOTES.
$s4$
  ),
  (
    'Services Being Delivered',
    $s5$
# Services Being Delivered

## 🇬🇧 Meaning

The vendor is delivering the service or product. **Must contain:** Contract/agreement (if any), Delivery progress tracking.

**Exit condition:** When service is completed and invoice is received → INVOICE.

## 🇻🇳 Ý nghĩa

Nhà cung cấp đang thực hiện dịch vụ / giao hàng. **Khi nào chuyển tiếp:** Khi dịch vụ xong và nhận được hoá đơn → INVOICE.
$s5$
  ),
  (
    'Invoice',
    $s6$
# Invoice

## 🇬🇧 Meaning

Invoice has been received from vendor. **Must contain:** Invoice file. Must match approved quote.

**Exit condition:** Move to FM APPROVE TO PAY.

## 🇻🇳 Ý nghĩa

Đã nhận hoá đơn từ nhà cung cấp. **Khi nào chuyển tiếp:** Chuyển sang FM APPROVE TO PAY.
$s6$
  ),
  (
    'FM Approve To Pay',
    $s7$
# FM Approve To Pay

## 🇬🇧 Meaning

Final finance approval before payment execution. **FM checks:** Service delivered, Invoice matches quote, Documents complete.

**Exit condition:** Approve → DONE. Reject → INVOICE or SERVICES BEING DELIVERED.

## 🇻🇳 Ý nghĩa

FM duyệt lần cuối trước khi thanh toán. **Khi nào chuyển tiếp:** Approve → DONE. Reject → quay lại INVOICE hoặc SERVICES BEING DELIVERED.
$s7$
  ),
  (
    'Done',
    $s8$
# Done

## 🇬🇧 Meaning

Payment completed. Case closed.

**Rules:** Nothing moves out of DONE. Case is finished and archived.

## 🇻🇳 Ý nghĩa

Đã thanh toán xong. Case kết thúc. **Luật:** Không có gì đi ra khỏi DONE. Case được coi là hoàn tất.
$s8$
  ),
  (
    'Task Rules',
    $task$
# Task Rules

## 🇬🇧 Purpose

Defines how tasks must be created, structured, named, and operated in ProSys. Ensures consistent workflow, clean audit trail, predictable automation, zero ambiguity in responsibility.

## 🇻🇳 Mục đích

Định nghĩa cách tạo, tổ chức, đặt tên và vận hành task trong ProSys.

---

**1. Parent vs Sub-task:** Parent = Service (one service/procurement item; owns workflow, approval, audit). Sub-task = Evidence only (Quote, Invoice; OPEN → DONE; never participates in approval or workflow).

**2. When to create Parent:** When any money will be spent, any vendor is involved, any approval is required, any invoice will exist.

**3. When to create sub-tasks:** When you receive a quote → create Quote sub-task. When you receive an invoice → create Invoice sub-task. One sub-task per document (recommended). Attach file to sub-task. Mark sub-task DONE when document is final.

**4. Naming:** Parent: [Service] &lt;clear business description&gt;. Sub-task: [Quote] / [Invoice] &lt;vendor name&gt;.

**5. Assignment:** Parent assignee = service owner. Sub-task assignee = person who uploads/manages the document.

**6. Labels:** Must follow phase-x, cohort-xxxx, loc-xxx.

**7. Do NOT:** Create sub-task without parent; use sub-task to request approval; put invoice directly on parent without sub-task; use ProSys for non-procurement work.

**8. Audit:** If it is not in ProSys → it does not exist. If it is not attached → it is not auditable. If it is not approved in workflow → it is not valid.
$task$
  ),
  (
    'Labels & Batch System',
    $labels$
# Labels & Batch System

## 🇬🇧 Purpose

Defines how ProSys uses labels as a virtual folder and batching system: group tasks by phase/cohort/location/program, filter and build dashboards, avoid sub-folders or multiple projects. Labels are a core structural mechanism.

## 🇻🇳 Mục đích

Định nghĩa cách ProSys dùng labels như hệ thống thư mục ảo và batch.

---

**Label patterns (MANDATORY):** phase-1, phase-2, phase-3; cohort-2026, cohort-2027; loc-australia, loc-thailand, loc-vietnam; program-visa, program-onboarding (if needed).

**Per task:** Each parent should have exactly 1 phase-xxx, exactly 1 cohort-xxxx, zero or one loc-xxx, zero or more program-xxx. Sub-tasks inherit from parent or no labels.

**Labels = Virtual folders:** JQL e.g. project = TET AND labels = phase-2. Saved filters = navigation. Board: Swimlanes by Phase, Quick filters by phase/cohort/loc.

**Discipline:** Do not create ad-hoc labels. Only use approved patterns. Admin may rename/delete wrong labels, reject tasks with wrong labels.

**Core rule:** If a task has no phase and cohort label → it is structurally invalid.
$labels$
  ),
  (
    'Roles & Responsibilities',
    $roles$
# Roles & Responsibilities

## 🇬🇧 Purpose

Defines who does what in ProSys across the full lifecycle. Clear role separation ensures accountability, auditability, no decision ambiguity.

## 🇻🇳 Mục đích

Định nghĩa ai làm gì trong ProSys suốt vòng đời case.

---

**1. Staff / PO:** Create parent Service, describe need, apply labels, collect quotes, create Quote sub-tasks, track delivery, create Invoice sub-task. Can move SERVICES TO PROCURE → QUOTES, SERVICES BEING DELIVERED → INVOICE. Cannot approve quotes or payment.

**2. PM:** Review and approve quotations. Evaluate business necessity, cost reasonableness, vendor suitability. Approve or reject at PM APPROVE QUOTE. Cannot approve payment.

**3. FM:** Approve budget at quote stage; approve payment at invoice stage. Verify budget, compliance, invoice matches quote, service delivered. Approve/reject at FM APPROVE QUOTE and FM APPROVE TO PAY.

**4. Admin:** Maintain workflow, automation, fields, labels, board. Enforce process discipline. Audit violations and automation correctness. Can modify workflow, roll back tasks, enforce rules.

**RACI:** Create Service (Staff R); Collect Quotes (Staff R); Approve Quote (PM A, FM A); Deliver Service (Staff R); Upload Invoice (Staff R); Approve Payment (FM A); Maintain System (Admin R/A). No role may approve their own request.
$roles$
  ),
  (
    'Finance & Audit',
    $finance$
# Finance & Audit

## 🇬🇧 Purpose

Defines financial control, invoice handling, commission calculation, and audit trail. Goals: Every dollar justified, approved, traceable, auditable. No payment without proper workflow, documents, and approvals.

## 🇻🇳 Mục đích

Định nghĩa kiểm soát tài chính, xử lý hoá đơn, tính hoa hồng và audit.

---

**1. Quote Control:** Every service that costs money must have at least 1 quote, be approved by PM and FM. Approved quote = financial baseline. All quotes must be attached (preferably sub-tasks). Audit: see which quote was chosen, who approved, when.

**2. Invoice Control:** Every payment must have an invoice in an Invoice sub-task. Invoice must match approved quote. FM must approve before payment. Audit: invoice document, approval history, link to approved quote.

**3. Payment Approval (FM APPROVE TO PAY):** FM must verify service delivered, invoice exists and correct, matches quote, documents complete. Approval = financial commitment finalized.

**4. Commission:** Fields Invoice Amount, Commission %, Commission Amount. Formula: Commission Amount = Invoice Amount × Commission % / 100. Trigger when status → DONE. Audit: value reproducible from formula, traceable to invoice.

**5. Audit Trail:** Who created, approved quote, approved payment; when each approval happened; which quote used, which invoice paid. ProSys ensures this via Jira status/comment/change log, attachments in sub-tasks, workflow enforcing approval order.

**Core rule:** If not approved in workflow → must not be paid. If not in ProSys → it does not exist.
$finance$
  ),
  (
    'Board Usage Guide',
    $board$
# Board Usage Guide

## 🇬🇧 Purpose

How to use the Jira board effectively for daily operations. Goals: Everyone sees the same reality, no hidden work, no forgotten cases, clear operational visibility.

## 🇻🇳 Mục đích

Hướng dẫn dùng Jira board đúng cách trong ProSys.

---

**1. One board only.** Segmentation by labels, filters, swimlanes. Do not create multiple boards per phase/program.

**2. Columns = Workflow.** Each column = one status. Follow the defined workflow; do not drag randomly or skip columns.

**3. Swimlanes = Phase.** Configure swimlanes by Labels (Phase). Phase 1, 2, 3 appear as horizontal lanes. See which phase is overloaded or blocked.

**4. Quick Filters:** phase-1, phase-2, phase-3, cohort-2026, cohort-2027, loc-australia. One click to focus on one batch.

**5. Saved Filters = Navigation.** Use as left-menu "virtual folders" (e.g. Phase 2, Cohort 2026, Australia Program).

**6. Dashboards:** Filter Results, Pie Chart status by Phase, Two-Dimensional Phase × Status. For management overview, weekly review, bottleneck detection.

**7. Watchers:** PM/FM manually watch issues they care about. Do not add watchers automatically by automation.

**8. Discipline:** Do not use board as personal to-do, hide work outside ProSys, or bypass workflow. Everything procurement-related must appear on this board.
$board$
  ),
  (
    'Automation Rules',
    $auto$
# Automation Rules

## 🇬🇧 Purpose

Defines how automation is used in ProSys and the exact design principles every rule must follow. Goals: No spam, no duplicated execution, no hidden side-effects, fully debuggable and auditable.

## 🇻🇳 Mục đích

Định nghĩa cách ProSys dùng automation và nguyên tắc bắt buộc cho mọi rule.

---

**1. Core principles:** Transition-triggered only (FROM → TO; never "Issue updated" or "Field changed"). One rule = one transition. Guard by entity property for any notify/calculate/write. Prefer comment over email; email only at decision points.

**2. Categories:** Guidance comments (when entering stage); Decision notifications (QUOTES → PM APPROVE QUOTE, INVOICE → FM APPROVE TO PAY); Data consistency (Uploaded At, Commission); Governance (future: missing labels/attachments).

**3. Entity property convention:** Naming e.g. pmApprovalNotified, fmQuoteApprovalNotified, fmPaymentApprovalNotified, commissionCalculated, uploadedAtSet. If property does NOT exist → run; after run → set property = true.

**4. Standard rules (summary):** (1) Comment when entering QUOTES – guide collect quotes. (2) Notify PM when QUOTES → PM APPROVE QUOTE (guard pmApprovalNotified). (3) Notify FM when PM APPROVE QUOTE → FM APPROVE QUOTE (guard fmQuoteApprovalNotified). (4) Comment when entering SERVICES BEING DELIVERED – track delivery. (5) Comment when entering INVOICE – upload invoice. (6) Notify FM when INVOICE → FM APPROVE TO PAY (guard fmPaymentApprovalNotified). (7) Set Uploaded At when attachment added (guard uploadedAtSet). (8) Calculate Commission when FM APPROVE TO PAY → DONE (guard commissionCalculated).

**5. Forbidden:** "Issue updated" trigger; chaining multiple transitions in one rule; automation that changes status implicitly; automation as hidden workflow.

**6. Debugging:** Check rule audit log and entity properties on issue. Most bugs = missing guard or wrong trigger.

**Final rule:** If a behavior is not defined here → it must not exist in automation.
$auto$
  )
) AS t(name, content_md)
WHERE EXISTS (SELECT 1 FROM spaces WHERE slug = 'tet-prosys');
