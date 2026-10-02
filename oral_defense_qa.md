# 🎓 Oral Defense Q&A Guide — Financial Management System (Transaction Core)

> **Para kanino**: Oral defense preparation guide.
> **System Name**: Financial Management System — Transaction Core
> **Tech Stack**: Laravel 13 (PHP) + React 18 (TypeScript) + PostgreSQL (Neon Cloud)

---

## 📋 PART 1: INTRODUCTION SCRIPT (Pang-opening ng presentation)

> Ito yung sasabihin mo sa simula ng defense. I-adjust mo lang depende sa flow ninyo.

---

**"Good morning/afternoon, members of the panel. I am [Pangalan Mo], and today I will be presenting our system — the Financial Management System, specifically the Transaction Core module.**

**Our system is designed for a hardware store business. It serves as the central financial processing engine that handles all incoming revenue and outgoing disbursement transactions from other departments of the company — such as HR for payroll, Supply Chain for supplier payments, E-Commerce for online sales, and Fleet for logistics expenses.**

**The core problem we are solving is this: in a traditional hardware store, financial transactions from different departments are processed manually, which is slow, error-prone, and lacks proper audit trails. Our system automates this through three key innovations:**

1. **Machine-to-Machine (M2M) API Integration** — ibang departments or subsystems ng company ang nagpa-padala ng transactions sa system namin through a secured REST API. Hindi na kailangan mag-encode manually.

2. **Rule-Based AI Risk Engine** — bago i-approve ang isang transaction, dumadaan muna ito sa isang AI expert system na nag-e-evaluate kung may anomaly o risk — tulad ng suspiciously high amounts, duplicate invoices, o fraudulent keywords. Nag-a-assign din ito ng confidence score at nag-su-suggest ng tamang General Ledger account code.

3. **Maker-Checker Approval Workflow** — walang transaction ang dumeretso sa General Ledger nang hindi dumaan sa human approval. Ang nag-create (Maker) ay hindi pwedeng maging approver (Checker) ng sarili niyang transaction — para sa internal control at segregation of duties.

**After approval, the transaction is atomically posted to the General Ledger with a sequential journal entry number, and every action is logged in our Audit Trail for full transparency and accountability.**

**Thank you, and I'm ready for your questions."**

---

## 📋 PART 2: MODULE-BY-MODULE EXPLANATION

### ✅ Mga Module na FULLY FUNCTIONAL (Backend + Frontend)

| # | Module | Paano gumagana |
|---|--------|---------------|
| 1 | **Dashboard** | Overview ng buong system — KPIs (total transactions, flagged count, pending count), quick access cards to all modules, at module health indicators. |
| 2 | **Transaction Approval (Approvals Page)** | Dito lumalabas lahat ng transactions na `pending_approval` o `ai_flagged`. Pwedeng i-Approve o i-Reject ng Finance Manager o Super Admin. May Maker-Checker enforcement — hindi mo ma-approve ang sarili mong transaction. |
| 3 | **General Ledger** | Kapag na-approve ang isang transaction, automatic na ipo-post dito with a journal entry number (e.g., JE-202607-0001). Ito ang official book of accounts ng company. |
| 4 | **M2M API Simulator** | Dahil wala pang actual na ibang departments/subsystems na naka-connect (kasi ibang grupo yung gumagawa nila), gumawa kami ng built-in simulator para ma-demo ang buong flow — mula sa pagpa-padala ng transaction hanggang sa AI evaluation at approval. |
| 5 | **Audit Trail / Audit Logs** | Every AI evaluation, every approval, every rejection — naka-log lahat dito. Para sa accountability at compliance. |
| 6 | **Login / Authentication** | Token-based auth gamit ang Laravel Sanctum. May tatlong user roles: Super Admin, Finance Manager, at Department Viewer. |

### ⏳ Mga Module na UI PLACEHOLDERS (Ibang team ang gagawa)

| # | Module | Explanation (para sa panel) |
|---|--------|----------------------------|
| 7 | **Accounts Payable (AP)** | Manages supplier invoices at trade payables. Nasa UI na ang page pero ang data nito ay manggagaling sa ibang team na mag-i-integrate sa Transaction Core namin. |
| 8 | **Accounts Receivable (AR)** | Manages customer receivables. Same — placeholder, pending integration. |
| 9 | **Disbursement Management** | Tracks outbound cash disbursements (payroll, supplier payments). Placeholder. |
| 10 | **Collection Management** | Tracks inbound cash collections. Placeholder. |
| 11 | **Budget Management** | Budget planning at tracking. Placeholder. |
| 12 | **Cash Management** | Cash position monitoring. Placeholder. |
| 13 | **Financial Reporting & Analytics** | P&L statement, balance sheet summary, at AI insights. May static demo data na nakalagay. |
| 14 | **Tax Management** | VAT/tax computation and filing. Placeholder. |

---

## 📋 PART 3: EXPECTED QUESTIONS & ANSWERS

---

### 🔴 Q1: "Ano ang system ninyo at para saan ito?"

**A:** *"Ang system namin ay isang Financial Management System, specifically ang Transaction Core module nito. Ito ang sentral na engine na tumatanggap, nag-e-evaluate, at nag-po-process ng lahat ng financial transactions ng isang hardware store business — mula sa pagpasok ng revenue (galing e-commerce sales) hanggang sa pagbayad ng expenses (payroll, supplier payments, fleet costs). Ang layunin nito ay i-automate at i-secure ang financial processing para mabawasan ang human error, maka-detect ng anomalies gamit ang AI, at magkaroon ng complete audit trail para sa compliance."*

---

### 🔴 Q2: "Bakit Transaction Core lang ang ginawa ninyo at hindi kumpleto lahat ng modules?"

**A:** *"The Financial Management System is designed as a modular, multi-team project. Ang scope namin ay ang Transaction Core — yung pinakakritikal na bahagi: transaction ingestion, AI risk evaluation, approval workflow, at General Ledger posting. Ang ibang modules tulad ng AP, AR, Budget, at Tax ay assigned sa ibang development teams. Ang ginawa namin ay nag-provide kami ng secure M2M API endpoints na pwede nilang i-integrate. Para i-demo ang buong flow kahit wala pa yung ibang modules, gumawa kami ng M2M API Simulator na nag-a-act as dummy external systems."*

---

### 🔴 Q3: "Paano gumagana yung AI ninyo? Machine Learning ba yan?"

**A:** *"Hindi po siya Machine Learning or LLM. Ang AI namin ay isang Rule-Based Expert System — isang deterministic decision engine na nag-e-evaluate ng transactions base sa configurable rules. Tatlong main checks ang ginagawa niya:*

1. ***Keyword Risk Detection** — nag-i-scan ng transaction description para sa mga suspicious keywords tulad ng "DUPLICATE INVOICE," "OFFSHORE," "SUSPICIOUS," "UNAUTHORIZED." Naka-configure ito sa `config/ai.php` na may severity levels: CRITICAL, HIGH, MEDIUM, at REVIEW.*

2. ***High-Value Threshold Check** — kung lumampas ang amount sa PHP 500,000, automatic na i-flag for mandatory human review.*

3. ***GL Account Categorization** — nag-su-suggest ng tamang General Ledger account code base sa category type ng transaction (e.g., PAYROLL_SALARY → 5100-EXP Salaries and Compensation Expense) with a confidence score.*

*Kung may anomaly na na-detect, ibababa niya ang confidence score sa 0.45 at ise-set ang status sa `ai_flagged`. Kung walang issue, `pending_approval` ang status — kailangan pa rin ng human approval bago pumasok sa General Ledger."*

---

### 🔴 Q4: "Bakit hindi nag-auto-approve yung mga normal/small transactions? Bakit kailangan pa ng human approval?"

**A:** *"By design po ito. Ang system namin ay naka-implement ng strict Maker-Checker workflow, which is a standard internal control mechanism sa financial institutions. Kahit normal at maliit ang transaction, dumadaan pa rin ito sa human approval bago ma-post sa General Ledger. Ito ay para ma-ensure ang proper segregation of duties at accountability — walang transaction ang pumapasok sa official books nang walang human decision. Ang AI ay nagse-serve as Decision Support System — nag-a-assist sa tao, hindi pumapalit sa tao."*

---

### 🔴 Q5: "Ano yung Maker-Checker? Paano ito gumagana sa system ninyo?"

**A:** *"Ang Maker-Checker ay isang internal control pattern na karaniwan sa banking at finance:*

- ***Maker** = yung nag-create ng transaction (in our case, ang external system o ang M2M simulator na naka-assign sa System User account).*
- ***Checker** = yung mag-a-approve o mag-re-reject (Finance Manager o Super Admin).*

*Ang rule ay: hindi pwedeng pareho ang Maker at Checker. Sa code namin, enforced ito sa dalawang level:*
1. *Sa `TransactionPolicy` (Laravel authorization)*
2. *Sa `FinancialService` na nag-che-check kung `created_by === approvedByUserId` — kung pareho, magbi-bisita ang error na 'Maker cannot be Checker.'*

*Ganito ang flow: External System (Maker) → AI Evaluation → Pending → Human Approval/Rejection (Checker) → GL Posting."*

---

### 🔴 Q6: "Paano gumagana yung M2M Simulator? Bakit kailangan nito?"

**A:** *"Ang M2M Simulator ay isang built-in testing tool sa system namin na nag-a-act as mga external subsystems — tulad ng HRMS, Supply Chain, E-Commerce, at Fleet Management. Kailangan namin ito dahil ang ibang department modules ay ginagawa ng ibang teams at hindi pa na-integrate. Para ma-demonstrate ang complete flow ng Transaction Core — mula sa pagpasok ng transaction hanggang sa AI evaluation at approval — ginawa namin itong simulator.*

*May 8 pre-built scenarios ito:*
- *Normal transactions (Cement Purchase, Online Sales, Payroll)*
- *Suspicious transactions (SUSPICIOUS employee claim, OFFSHORE steel import)*
- *Routine expenses (Fleet Diesel, Warehouse Rent, Customer Refund)*

*May Idempotency testing din — pwede mag-resend ng same request para i-demo na hindi ma-do-double process ang isang transaction."*

---

### 🔴 Q7: "Ano yung Idempotency at bakit ito importante?"

**A:** *"Ang Idempotency ay isang safeguard para sa duplicate transactions. Kapag nag-send ng transaction ang isang external system, may kasama itong Idempotency Key — isang unique identifier. Kung na-timeout o na-retry ang request at na-send ulit with the same key, hindi gagawa ang system ng bagong transaction. Ire-return niya lang yung existing one.*

*Importante ito sa financial systems dahil kung ma-double process ang isang payroll o supplier payment, malaking pera ang maaapektuhan. Sa code namin, may unique constraint sa database para sa `idempotency_key` column, at may pre-check din bago mag-insert."*

---

### 🔴 Q8: "Ano yung tech stack ninyo at bakit ninyo ito pinili?"

**A:** *"Ang tech stack namin ay:*

| Layer | Technology | Bakit |
|-------|-----------|-------|
| **Backend** | Laravel 13 (PHP 8.3+) | Mature framework na may built-in support para sa API development, authentication (Sanctum), database migrations, at testing (PHPUnit) |
| **Frontend** | React 18 + TypeScript + Vite | Modern SPA framework na type-safe at performant. Vite para sa fast build times |
| **Database** | PostgreSQL (Neon Cloud) | Production-grade relational DB na may support para sa row locking, ACID transactions, at unique constraints — important para sa financial data integrity |
| **Deployment** | Vercel (Frontend) + Local Laravel with Cloudflare Tunnel (Backend) | Vercel para sa free static hosting. Cloudflare Tunnel para i-expose ang localhost sa internet for demo purposes |
| **Styling** | Tailwind CSS | Utility-first CSS framework para sa rapid UI development |

---

### 🔴 Q9: "Paano nag-cocommunicate yung frontend at backend?"

**A:** *"Ang frontend (React) at backend (Laravel) ay nag-co-communicate through REST API calls over HTTPS.*

- *Ang frontend ay nagse-send ng HTTP requests sa backend gamit ang `fetch` API.*
- *Ang authentication ay token-based gamit ang Laravel Sanctum — kapag nag-login ka, may matatanggap kang Bearer Token na kasama sa every subsequent request.*
- *Para sa M2M integration endpoints (`/api/v1/integration/*`), gumagamit kami ng API Key authentication through `X-API-KEY` header. Ibang security layer ito kumpara sa user login.*
- *Ang CORS ay properly configured para tanggapin lang ang requests mula sa verified frontend origins."*

---

### 🔴 Q10: "Ano yung mga user roles sa system ninyo?"

**A:** *"May tatlong user roles sa system namin, na naka-implement through Role-Based Access Control (RBAC):*

| Role | Permissions | Description |
|------|------------|-------------|
| **Super Admin** | Approve, Reject, View Reports, Manage Users, View Transactions | Full access sa lahat ng features |
| **Finance Manager** | Approve, Reject, View Reports, View Transactions | Pwedeng mag-approve/reject ng transactions at mag-view ng reports |
| **Department Viewer** | View Transactions only | Read-only access — pwede lang mag-view pero hindi mag-approve |

*Ang role enforcement ay naka-implement sa backend through `RoleMiddleware` at `TransactionPolicy` — kahit i-manipulate ang frontend, hindi papayagan ng backend ang unauthorized actions."*

---

### 🔴 Q11: "Paano naka-secure yung system ninyo?"

**A:** *"May multiple layers of security ang system namin:*

1. ***Authentication** — Token-based gamit ang Laravel Sanctum. Nag-e-expire ang tokens after 480 minutes by default.*
2. ***API Key Middleware** — Ang M2M integration endpoints ay may separate API key na hindi pwedeng i-bypass.*
3. ***Role-Based Access Control** — Hindi lahat ng users ay pwedeng mag-approve ng transactions. Enforced sa backend, hindi lang sa frontend.*
4. ***Maker-Checker Enforcement** — Self-approval prevention sa both Policy at Service layer.*
5. ***Database-Level Security** — Row locking (`lockForUpdate`) para sa concurrent transaction approval, unique constraints para sa idempotency, at ACID compliance para sa data integrity.*
6. ***CORS Configuration** — Tanging verified frontend origins lang ang pinapayagan.*
7. ***Input Validation** — Lahat ng incoming data ay vini-validate ng Laravel bago i-process."*

---

### 🔴 Q12: "Paano yung database design ninyo? Ano ang mga important tables?"

**A:** *"Ang key database tables namin ay:*

| Table | Purpose |
|-------|---------|
| `users` | User accounts with UUID primary keys, linked to roles |
| `roles` | Role definitions (super_admin, finance_manager, department_viewer) |
| `transactions` | Central transaction table — stores amount, AI scores, status, maker/checker info |
| `journal_entries` | General Ledger entries — created only after approval, with sequential entry numbers |
| `journal_entry_sequences` | Concurrency-safe counter para sa sequential journal numbering per period |
| `ai_logs` | Audit trail ng every AI evaluation — decision, score, flag reason |
| `subsystems` | Registry ng internal modules (GL, AP, AR, Disbursement, etc.) |

*Ang `transactions` table ang pinaka-sentral — nandito ang buong lifecycle ng isang transaction, mula `pending_approval` → `ai_flagged` → `approved` → `posted` (o `rejected`)."*

---

### 🔴 Q13: "Paano kung dalawang tao sabay-sabay nag-approve ng isang transaction?"

**A:** *"Handled na namin ito through database-level concurrency control. Sa `FinancialService`, gumagamit kami ng `DB::transaction()` (ACID compliance) combined with `lockForUpdate()` (pessimistic row locking). Ibig sabihin, kapag nag-start ng approval ang isang user, naka-lock ang transaction row sa database — ang pangalawang user na mag-a-attempt ay kailangang maghintay o mag-e-error dahil naka-lock na ang row. Hindi pwedeng ma-double-approve."*

---

### 🔴 Q14: "Paano kung nag-down yung server ninyo sa gitna ng approval?"

**A:** *"Ang approval at GL posting ay naka-wrap sa iisang `DB::transaction()` — ang tinatawag na atomic operation. Kung mag-fail ang kahit anong step sa gitna (halimbawa, nag-crash ang server habang ginagawa ang journal entry), ang buong operation ay magro-rollback. Hindi maiiwan ang transaction sa 'approved' status na walang journal entry. Ito ang ibig sabihin ng ACID compliance — either lahat ng steps ay successful, o wala."*

---

### 🔴 Q15: "Nag-test ba kayo? Paano?"

**A:** *"Opo. May automated test suite kami gamit ang PHPUnit na tumatakbo against an in-memory SQLite database — hindi gumagalaw sa production data. Ang mga na-test namin ay:*

- ***AIService tests** — risk scoring, keyword detection, high-value threshold flagging, GL categorization*
- ***FinancialService tests** — approve, reject, GL posting, self-approval prevention, sequential journal numbering*
- ***IntegrationController tests** — API key enforcement, idempotency duplicate handling, validation rules*
- ***RBAC tests** — RoleMiddleware at TransactionPolicy enforcement*

*Pwede ninyong i-run ang `php artisan test` sa backend folder para ma-verify."*

---

### 🔴 Q16: "Ano ang pinaka-challenging na part ng development?"

**A:** *(Piliin mo ang isa o dalawa na comfortable ka i-explain)*

- *"Ang concurrency handling — pag-ensure na hindi ma-double-approve o ma-double-post ang isang transaction kahit maraming users ang sabay-sabay. Kailangan naming mag-implement ng database row locking at atomic transactions."*
- *"Ang AI Risk Engine design — paano mag-design ng rule-based system na flexible at configurable nang hindi nago-over-flag ng normal transactions, pero hindi rin nami-miss ng suspicious ones."*
- *"Ang Idempotency implementation — paano i-handle ang duplicate requests nang safe, kasama ang edge case na dalawang request ang dumating sa exact same time (race condition)."*

---

### 🔴 Q17: "Bakit rule-based lang ang AI ninyo at hindi Machine Learning?"

**A:** *"Pinili naming ang rule-based expert system dahil sa tatlong dahilan:*

1. ***Transparency at Explainability** — Sa financial systems, kailangan natin ma-explain bakit na-flag ang isang transaction. Sa rule-based system, alam natin ang exact reason (e.g., 'High-value transaction exceeds PHP 500,000 threshold'). Sa ML black-box model, mahirap i-explain.*
2. ***Auditability** — Para sa financial compliance, kailangan ng clear audit trail kung bakit ginawa ang isang decision. Ang rules namin ay naka-configure sa `config/ai.php` at pwedeng i-review ng auditors.*
3. ***Practicality** — Para sa scope ng capstone at sa dami ng training data na available (wala pa talaga kasi bago pa ang system), mas practical ang rule-based approach kaysa sa ML na nangangailangan ng malaking dataset."*

---

### 🔴 Q18: "Scalable ba yung system ninyo? Paano kung dumami ang transactions?"

**A:** *"Opo. Ang system namin ay designed with scalability in mind:*

- *Ang database namin ay PostgreSQL (hosted on Neon Cloud) na supports concurrent connections at heavy read/write loads.*
- *Ang transactions table ay may proper indexing at pagination (50 items per page).*
- *Ang journal entry numbering system ay concurrency-safe — gumagamit ng per-period sequence counter with row locking, kaya safe kahit sabay-sabay ang maraming approvals.*
- *Ang backend API ay stateless (token-based auth), kaya pwedeng mag-add ng multiple server instances kapag kinailangan.*
- *Ang frontend ay deployed sa Vercel na may automatic CDN distribution."*

---

### 🔴 Q19: "Ano ang future improvements na pwede ninyong gawin?"

**A:** *"Marami pa kaming pwedeng i-improve:*

1. *Full integration ng ibang modules (AP, AR, Disbursement, etc.) kapag natapos na ng ibang teams.*
2. *Real ML-based anomaly detection gamit ang historical transaction data — once may enough data na para mag-train ng model.*
3. *Real-time notifications (WebSocket/Push) kapag may naka-flag na transaction.*
4. *Deploy ang backend sa cloud server (Railway, AWS, etc.) para hindi na kailangan ng local laptop.*
5. *Multi-currency support at real-time exchange rate integration.*
6. *Dashboard analytics na naka-pull ng real data mula sa database, hindi static values."*

---

## 📋 PART 4: DEMO FLOW (Suggested order kapag nagde-demo ka)

> Kung hihilingin nila na i-demo ang system, ito ang suggested flow:

| Step | Action | Pag-uusapan |
|------|--------|------------|
| 1 | **Login** as `admin@hw.com` | I-demo ang authentication at user roles |
| 2 | **Dashboard** | Show overview — KPI cards, module health, quick access |
| 3 | **M2M Simulator** → Send a normal transaction (e.g., "Cement Purchase") | I-demo ang M2M API integration at AI evaluation — makikita na `pending_approval` ang status |
| 4 | **M2M Simulator** → Send a suspicious transaction (e.g., "OFFSHORE Steel Import") | I-demo ang AI risk detection — makikita na `ai_flagged` ang status at mababa ang confidence score |
| 5 | **Approvals Page** | I-show ang mga pending at flagged transactions, i-approve yung normal, i-reject yung flagged |
| 6 | **General Ledger** | I-show na automatic na lumabas ang approved transaction dito with journal entry number |
| 7 | **Audit Trail** | I-show ang complete log ng lahat ng AI evaluations |
| 8 | Balik sa **Simulator** → Resend Last Request (same idempotency key) | I-demo ang idempotency — hindi gagawa ng duplicate transaction |
| 9 | Click **Same Key + Modified Payload** | I-demo ang 409 Conflict — na-catch ang attempt na gumamit ng same key sa ibang data |

---

## 📋 PART 5: QUICK CHEAT SHEET (Mga terminong kailangan mo malaman)

| Term | Meaning (Simple explanation) |
|------|------------------------------|
| **Transaction Core** | Ang sentro ng financial system — dito dumadaan lahat ng transactions |
| **M2M (Machine-to-Machine)** | Automatic na pag-send ng data mula sa isang system papunta sa isa pa, walang tao na nag-e-encode |
| **API (Application Programming Interface)** | Ang "pinto" ng backend kung saan pumapasok ang mga request mula sa frontend o ibang systems |
| **REST API** | Isang architectural style para sa web services — gumagamit ng HTTP methods (GET, POST) |
| **Maker-Checker** | Internal control na nag-re-require ng dalawang tao — isa gumawa, isa mag-approve |
| **ACID** | Atomicity, Consistency, Isolation, Durability — properties ng reliable database transactions |
| **Idempotency** | Property na kahit paulit-ulit mong i-send ang same request, iisang result lang ang mangyayari |
| **Expert System** | AI na gumagamit ng pre-defined rules para gumawa ng decisions — hindi ML |
| **Confidence Score** | Percentage na nagsasabi kung gaano ka-sure ang AI sa categorization niya (0.0 to 1.0) |
| **GL (General Ledger)** | Ang official book of accounts — lahat ng approved transactions dito nakarecord |
| **Journal Entry** | Ang official entry sa GL — may sequential number (e.g., JE-202607-0001) |
| **RBAC** | Role-Based Access Control — permissions base sa role ng user |
| **Sanctum** | Laravel package para sa token-based API authentication |
| **Row Locking** | Database technique na nag-lo-lock ng isang row para hindi ma-access ng iba habang ginagamit |
| **Segregation of Duties** | Accounting principle na ang nag-create ay hindi pwedeng mag-approve |

---

> [!TIP]
> **Pro Tip sa Defense**: Kapag tinanong ka ng hindi mo alam, sabihin mo:
> *"That's a great question. Based on our current implementation, [sasabihin mo ang alam mo]. However, for future iterations, we plan to [improvement]."*
> Huwag magsinungaling — mas okay ang honest na "we plan to improve that" kaysa sa gawa-gawa na sagot.

> [!IMPORTANT]
> **Key Talking Points na laging i-highlight mo:**
> 1. Ang AI natin ay **Rule-Based Expert System**, hindi Machine Learning.
> 2. Lahat ng transaction ay dumadaan sa **human approval (Maker-Checker)** — walang auto-approve.
> 3. Ang ibang modules ay **placeholder kasi ibang team ang assigned** — pero yung Transaction Core natin ay fully functional.
> 4. May **M2M Simulator** tayo para i-demo kahit wala pa yung ibang subsystems.
> 5. **ACID compliant** at may **row locking** para sa data integrity.
