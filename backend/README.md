# Agentic RAG Backend API

A comprehensive Retr## 🔐 Authentication

The API requires token-based authentication using the `X-API-KEY` header for all endpoints.

### Authentication Requirements

- **API Key Required**: All `/api/*` endpoints require a valid API key
- **Environment Configuration**: Must configure `VALID_API_KEYS` in environment variables
- **Server Error**: Server returns 500 error if no API keys are configuredgmented Generation (RAG) backend service built with Node.js, Express, and PostgreSQL with pgvector for vector similarity search.

### � Security Features

- **Mandatory API Key Authentication**: All endpoints secured with token-based auth🚀 Quick Start

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL with pgvector extension
- Access to microservices for text processing, embedding, and LLM

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Set up environment variables (see Environment Configuration)
cp .env.example .env

# Start the development server
npm run dev

# Or start production server
npm start
```

### Server Commands

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start

# Using nodemon directly
npx nodemon server.js
```

**Server runs on:** `http://localhost:4000`

## � Authentication

The API supports optional token-based authentication using the `X-API-KEY` header.

### Authentication Modes

1. **No Authentication** (Default): If `VALID_API_KEYS` is not set, all requests are allowed
2. **API Key Required**: If `VALID_API_KEYS` is configured, all `/api/*` endpoints require valid API key

### Using API Keys

Add the `X-API-KEY` header to all requests:

```bash
curl -H "X-API-KEY: your-api-key" http://localhost:4000/api/tenants
```

### Endpoints Without Authentication
- `GET /health` - Health check endpoint (always accessible)

## �🔧 Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentic_rag
DB_USER=postgres
DB_PASSWORD=your_password

# Server Configuration
PORT=4000

# Authentication Configuration (REQUIRED)
VALID_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3

# Microservices Configuration
MICROSERVICE_API_URL=http://your-microservice-url
MICROSERVICE_API_TOKEN=your-api-token

# AI Models Configuration
EMBEDDING_MODEL=text-embedding-3-small
AUTOTAG_MODEL=gpt-4o-mini
```

## 📊 Database Schema

The system uses PostgreSQL with the following main tables:
- **Tenants**: Multi-tenant organization management
- **Users**: User management within tenants
- **Corpora**: Document collections/corpuses
- **Documents**: Individual documents with metadata
- **Chunks**: Text chunks with vector embeddings

## 📚 API Documentation

Base URL: `http://localhost:4000/api`

### 🏢 Tenant Management

#### Create Tenant
```http
POST /api/tenant
Content-Type: application/json
X-API-KEY: your-api-key

{
  "name": "Company Name",
  "settings": {
    "defaultEmbeddingModel": "text-embedding-3-small"
  }
}
```

**Response:**
```json
{
  "results": {
    "id": "uuid",
    "name": "Company Name",
    "settings": {...},
    "createdAt": "2025-10-17T...",
    "updatedAt": "2025-10-17T..."
  }
}
```

#### List Tenants
```http
GET /api/tenants?limit=50&page=1
```

#### Get Tenant
```http
GET /api/tenants/{id}
```

#### Update Tenant
```http
PUT /api/tenants/{id}
Content-Type: application/json

{
  "name": "Updated Company Name",
  "settings": {...}
}
```

#### Delete Tenant
```http
DELETE /api/tenants/{id}
```

### 👤 User Management

#### Create User
```http
POST /api/user
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin"
}
```

#### List Users
```http
GET /api/users?limit=50&page=1
```

#### Get User
```http
GET /api/user/{id}
```

#### Update User
```http
PUT /api/user/{id}
```

#### Delete User
```http
DELETE /api/user/{id}
```

### 📁 Corpora Management

#### Create Corpus
```http
POST /api/corpora
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "name": "Knowledge Base",
  "description": "Company knowledge base documents",
  "settings": {
    "embeddingModel": "text-embedding-3-small"
  }
}
```

#### List Corpora
```http
GET /api/corpuses?limit=50&page=1
```

#### Get Corpus
```http
GET /api/corpora/{id}
```

#### Update Corpus
```http
PUT /api/corpora/{id}
```

#### Delete Corpus
```http
DELETE /api/corpora/{id}
```

### 📄 Document Management

#### Create Document (Manual)
```http
POST /api/document
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "corpusId": "corpus-uuid",
  "originalFileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSizeBytes": 1024000,
  "rawText": "Document content...",
  "metadata": {
    "author": "John Doe",
    "department": "Engineering"
  },
  "autotag": {
    "topics": ["technology", "documentation"]
  }
}
```

#### Document Upload (File or URL)
```http
POST /api/document/upload
Content-Type: multipart/form-data

# Form fields:
tenantId: tenant-uuid
userId: user-uuid
corpusId: corpus-uuid
file: [file upload] OR file_path: "https://example.com/document.pdf"
embeddingModel: text-embedding-3-small (optional)
autotagModel: gpt-4o-mini (optional, set to false to disable)
autotagSchema: {"topics": ["string"], "sentiment": "string"} (optional)
metadata: {"key": "value"} (optional)
```

**Supported File Types:**
- PDF: `application/pdf`
- Plain Text: `text/plain`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PowerPoint: `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`

**Response:**
```json
{
  "message": "Document uploaded and processed successfully",
  "document": {
    "id": "document-uuid",
    "tenantId": "tenant-uuid",
    "corpusId": "corpus-uuid",
    "originalFileName": "document.pdf",
    "processingStatus": "COMPLETED",
    "metadata": {...},
    "autotag": {...}
  }
}
```

#### List Documents
```http
GET /api/documents?limit=50&page=1
```

#### Get Document
```http
GET /api/document/{id}
```

#### Check Document Status
```http
GET /api/document/{id}/status
```

#### Update Document
```http
PUT /api/document/{id}
```

#### Delete Document
```http
DELETE /api/document/{id}
```

### 🔍 Vector Search & RAG

#### Search Documents (RAG Pipeline)
```http
POST /api/document/search
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "corpusId": "corpus-uuid",
  "query": "What is machine learning?",
  "embeddingModel": "text-embedding-3-small",
  "rerankModel": "rerank-1",
  "llmModel": "gpt-4o-mini",
  "similarityThreshold": 0.30,
  "filters": {
    "metadata": {
      "department": "Engineering"
    },
    "autotag": {
      "topics": ["technology"]
    }
  },
  "limit": 10,
  "prompt": "Custom prompt for LLM (optional)"
}
```

**Alternative with Pre-computed Embedding:**
```json
{
  "tenantId": "tenant-uuid",
  "corpusId": "corpus-uuid",
  "queryEmbedding": [0.1, 0.2, 0.3, ...], // 1536-dimensional array
  "rerankModel": "rerank-1",
  "llmModel": "gpt-4o-mini",
  "similarityThreshold": 0.30,
  "limit": 10
}
```

**Response:**
```json
{
  "message": "Chunks retrieved successfully",
  "results": {
    "answer": "Machine learning is a subset of artificial intelligence...",
    "list": [
      {
        "id": "chunk-uuid",
        "chunkText": "Machine learning is a method of data analysis...",
        "chunkIndex": 0,
        "documentId": "document-uuid",
        "similarity": 0.95,
        "relevance_score": 0.92,
        "autotag": {
          "topics": ["machine learning", "AI"]
        }
      }
    ]
  },
  "count": 5
}
```

### 🧩 Chunk Management

#### Create Chunk
```http
POST /api/chunk
Content-Type: application/json

{
  "tenantId": "tenant-uuid",
  "corpusId": "corpus-uuid",
  "documentId": "document-uuid",
  "chunkIndex": 0,
  "chunkText": "This is a text chunk...",
  "tokenCount": 50,
  "embedding": [0.1, 0.2, 0.3, ...] // 1536-dimensional array
}
```

#### List Chunks
```http
GET /api/chunks?limit=50&page=1
```

#### Get Chunk
```http
GET /api/chunk/{id}
```

#### Update Chunk
```http
PUT /api/chunk/{id}
```

#### Delete Chunk
```http
DELETE /api/chunk/{id}
```

## 🔧 Search Parameters

### Similarity Threshold
- **Range:** 0.0 to 1.0
- **Default:** 0.30
- **Meaning:** Minimum cosine similarity score for chunks to be considered relevant
- **Examples:**
  - `0.8+`: Very high similarity (exact matches)
  - `0.5-0.7`: Moderate similarity (related content)
  - `0.2-0.4`: Low similarity (broadly related)

### Filters
```json
{
  "metadata": {
    "author": "John Doe",
    "department": "Engineering"
  },
  "autotag": {
    "topics": ["technology"],
    "sentiment": "positive"
  }
}
```

### Models
- **Embedding Models:** `text-embedding-3-small`, `text-embedding-3-large`, `voyage-large-2`
- **Rerank Models:** `rerank-1`, `cohere-rerank-english-v3.0`
- **LLM Models:** `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`, `claude-3-sonnet`

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created successfully
- `204`: Deleted successfully (no content)
- `400`: Bad request (missing/invalid parameters)
- `401`: Unauthorized (missing API key)
- `403`: Forbidden (invalid API key)
- `404`: Resource not found
- `500`: Internal server error

### Authentication Error Examples

**Missing API Key (401):**
```json
{
  "error": "Authentication required",
  "message": "API key is required. Please provide X-API-KEY header."
}
```

**Invalid API Key (403):**
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is not valid."
}
```

**Server Configuration Error (500):**
```json
{
  "error": "Server configuration error",
  "message": "No valid API keys configured on server."
}
```

## 🏗️ Architecture Overview

### RAG Pipeline Flow
1. **Document Upload** → Text extraction via microservice
2. **Text Chunking** → Split into manageable pieces
3. **Embedding Generation** → Convert text to vectors
4. **Vector Storage** → Store in PostgreSQL with pgvector
5. **Similarity Search** → Find relevant chunks using cosine similarity
6. **Reranking** → Improve relevance using rerank models
7. **LLM Generation** → Generate final answer using language models

### Microservice Dependencies
- **Text Extractor:** `/api/text/extractor` - Extract text from files/URLs
- **Text Chunker:** `/api/text/chunk` - Split text into chunks
- **Text Embedder:** `/api/text/embed` - Generate vector embeddings
- **Autotagger:** `/api/structured/autotag` - Generate metadata tags
- **Reranker:** `/api/text/rerank` - Rerank search results
- **LLM Service:** `/api/llm/service` - Generate final answers

## Testing Examples

### Health Check
```bash
curl http://localhost:4000/health
```

### Upload a Document
```bash
curl -X POST http://localhost:4000/api/document/upload \
  -H "X-API-KEY: your-api-key" \
  -F "tenantId=your-tenant-uuid" \
  -F "userId=your-user-uuid" \
  -F "corpusId=your-corpus-uuid" \
  -F "file=@document.pdf" \
  -F "embeddingModel=text-embedding-3-small"
```

### Search Documents
```bash
curl -X POST http://localhost:4000/api/document/search \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "tenantId": "your-tenant-uuid",
    "corpusId": "your-corpus-uuid",
    "query": "What is artificial intelligence?",
    "embeddingModel": "text-embedding-3-small",
    "limit": 5
  }'
```

## � Security Features

- **Optional API Key Authentication**: Secure all endpoints with token-based auth
- **Multi-tenant Data Isolation**: Proper tenant-based data separation
- **Input Validation**: Request validation for all endpoints
- **File Type Restrictions**: Limited to specific document types
- **File Size Limits**: 100MB maximum file upload size
- **Environment-based Configuration**: Secure credential management

### API Key Management

1. **Generate Strong Keys**: Use cryptographically secure random strings
2. **Environment Variables**: Store keys securely in environment variables
3. **Key Rotation**: Regularly rotate API keys for security
4. **Multiple Keys**: Support multiple valid keys for different clients/environments

```bash
# Generate secure API keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## �📝 Development Notes

- Vector embeddings are stored as PostgreSQL vector type with cosine distance
- Similarity scores are calculated as `1 - cosine_distance` for intuitive 0-1 range
- File uploads limited to 100MB
- Automatic chunking preserves document structure
- Metadata and autotags stored as JSONB for flexible querying
- Multi-tenant architecture with proper data isolation
- Optional authentication allows development without API keys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.