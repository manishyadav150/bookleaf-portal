# BookLeaf Author Support & Communication Portal

A full-stack web application for BookLeaf Publishing that helps authors manage their books and support tickets while enabling administrators to classify queries and generate support responses using AI.

## Live Demo

- **Frontend:** https://bookleaf-portal-1.onrender.com
- **Backend:** https://bookleaf-portal-lfvr.onrender.com
- **Repository:** Private GitHub repository

## Features

### Author Portal
- Email and password authentication.
- View published books and their details.
- View royalty earned, paid, and pending.
- Submit support queries and view ticket status.
- Read responses from the support team.

### Admin Portal
- View and manage support tickets.
- Analyze tickets using AI.
- Suggest ticket categories and priorities.
- Generate AI-powered response drafts.
- Review and save public responses.
- Update ticket priority and status.

### AI Integration
The application uses the Groq API for AI-assisted ticket analysis and response generation.

- **Model:** Configurable through `BOOKLEAF_AI_MODEL`.
- **API key:** Stored in the backend environment variable `GROQ_API_KEY`.
- **Classification:** Suggests a relevant category and priority.
- **Response generation:** Creates a draft using the BookLeaf support policies and communication guidelines.
- **Fallback handling:** Uses rule-based analysis when the AI service is unavailable.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, Tailwind CSS |
| Backend | Java 21, Spring Boot |
| Database | MySQL-compatible database (TiDB Cloud in deployment) |
| Data access | Spring Data JPA, Hibernate |
| Authentication | Spring Security, JWT |
| AI | Groq API |
| Frontend API calls | Axios |
| Deployment | Render |

## Architecture

The application follows a frontend–backend architecture:

1. The React frontend provides author and administrator interfaces.
2. The Spring Boot backend exposes REST APIs and handles business logic.
3. Spring Data JPA and Hibernate manage database operations.
4. Spring Security and JWT support authentication and access control.
5. The backend calls the Groq API for ticket analysis and response drafting.

The AI API key remains on the backend and is not intended to be exposed to the frontend.

## Local Setup

### Prerequisites

- Java 21
- Node.js and npm
- MySQL 8 or a compatible database
- Git
- A Groq API key for AI features

### 1. Clone the repository

```bash
git clone https://github.com/manishyadav150/bookleaf-portal.git
cd bookleaf-portal
```

### 2. Configure the backend

Configure the backend environment variables:

```text
DB_URL=jdbc:mysql://localhost:3306/bookleaf_portal
DB_USERNAME=root
DB_PASSWORD=your_database_password
BOOKLEAF_JWT_SECRET=your_secure_jwt_secret
DEMO_ADMIN_PASSWORD=your_admin_password
DEMO_AUTHOR_PASSWORD=your_author_password
GROQ_API_KEY=your_groq_api_key
BOOKLEAF_AI_MODEL=openai/gpt-oss-120b
```

Create the database in MySQL before starting the backend.

Run the backend from the project root:

**Windows PowerShell**
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**macOS/Linux**
```bash
cd backend
./mvnw spring-boot:run
```

The backend uses port `8080` by default unless configured otherwise.

### 3. Start the frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Ensure the frontend API configuration points to the locally running backend when testing locally.

## API Documentation

The frontend communicates with the backend through REST APIs.

The API layer supports the application's authentication, author and book data, support tickets, ticket updates, AI analysis, and response generation.

For exact endpoint paths, request formats, and response schemas, refer to the backend controller classes and service implementations in `backend/src/main/java`.

## AI Prompt Strategy and Error Handling

The AI service uses the ticket subject and description along with BookLeaf's support policies to generate category and priority suggestions and draft an appropriate response.

The response instructions emphasize professional, empathetic communication, relevant policy details, and clear next steps.

If the Groq API request fails, the application can fall back to rule-based classification rather than relying exclusively on the external AI service.

The model is configurable through an environment variable, and the API key is configured on the backend to avoid exposing credentials in frontend code.

## Sample Data

The project includes the supplied BookLeaf sample dataset under the `data` directory. It contains author and book records with publication statuses, sales, and royalty information.

Use the project's configured data-seeding mechanism to load the sample records into the database.

## Test Credentials

The deployed demo was configured with these accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bookleaf.local` | `mk123` |
| Author | `priya.sharma@email.com` | `mk123` |

These are demo credentials only. Change them before using the application with real user data.

## Known Limitations and Future Improvements

- Add comprehensive automated unit, integration, and end-to-end tests.
- Improve API documentation with generated OpenAPI/Swagger documentation.
- Add more detailed audit logging and monitoring.
- Further refine AI response validation, token usage, and rate-limit handling.
- Add stronger production-grade secrets management and deployment security.
- Improve automated verification of ticket updates and cross-role workflows.

## Author

**Manish Kumar Yadav**

Full-Stack Developer | Java, Spring Boot, React, and SQL
