from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import asyncio
import logging
from typing import Optional, Dict, Any
import uuid
from datetime import datetime
import pdfplumber
import docx
from io import BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Hey Sera API", description="AI Assistant for Policy Document Analysis")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyDyCUnQumkU9-_mGegPo-bGgp6AeMO2gic"  # Consider moving this to an environment variable
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel('gemini-1.5-flash')

# In-memory storage for chat sessions and documents
chat_sessions: Dict[str, Dict[str, Any]] = {}
uploaded_documents: Dict[str, Dict[str, Any]] = {}

# Pydantic models for request/response
class ChatMessage(BaseModel):
    message: str
    chatId: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    chatId: str
    timestamp: str

class DocumentUpload(BaseModel):
    filename: str
    content: str
    chatId: Optional[str] = None

# System prompt for Sera
SYSTEM_PROMPT = """
You are Sera, an AI assistant specialized in policy document analysis. Your role is to:

1. Analyze policy documents with precision and clarity
2. Answer questions about policy content, implications, and recommendations
3. Provide summaries, key points, and actionable insights
4. Help users understand complex policy language in simple terms
5. Identify potential issues, gaps, or contradictions in policies
6. Suggest improvements or alternatives when appropriate

Always maintain a professional yet friendly tone. Be concise but thorough in your responses. 
When analyzing documents, focus on:
- Key objectives and goals
- Implementation requirements
- Potential challenges or risks
- Stakeholder impacts
- Compliance requirements
- Financial implications

If you don't have enough context or information, ask clarifying questions.
"""

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using pdfplumber for better accuracy"""
    try:
        text = ""
        with pdfplumber.open(BytesIO(file_content)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num} ---\n"
                        text += page_text + "\n"
                    
                    # Also extract text from tables if present
                    tables = page.extract_tables()
                    if tables:
                        for table_num, table in enumerate(tables, 1):
                            text += f"\n--- Table {table_num} on Page {page_num} ---\n"
                            for row in table:
                                if row and any(cell for cell in row if cell):  # Skip empty rows
                                    text += " | ".join(str(cell) if cell else "" for cell in row) + "\n"
                            text += "\n"
                            
                except Exception as page_error:
                    logger.warning(f"Error extracting from page {page_num}: {page_error}")
                    continue
                    
        # Clean up the text
        text = text.strip()
        if not text:
            logger.warning("No text extracted from PDF")
            return ""
            
        logger.info(f"Successfully extracted {len(text)} characters from PDF")
        return text
        
    except Exception as e:
        logger.error(f"Error extracting PDF text with pdfplumber: {e}")
        # Fallback to basic text extraction if pdfplumber fails
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as fallback_error:
            logger.error(f"Fallback PDF extraction also failed: {fallback_error}")
            return ""

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(BytesIO(file_content))
        text = ""
        
        # Extract text from paragraphs
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text += paragraph.text + "\n"
        
        # Extract text from tables
        for table in doc.tables:
            text += "\n--- Table ---\n"
            for row in table.rows:
                row_text = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text:
                        row_text.append(cell_text)
                if row_text:
                    text += " | ".join(row_text) + "\n"
            text += "\n"
        
        logger.info(f"Successfully extracted {len(text)} characters from DOCX")
        return text
        
    except Exception as e:
        logger.error(f"Error extracting DOCX text: {e}")
        return ""

def get_or_create_chat_session(chat_id: Optional[str] = None) -> str:
    """Get existing chat session or create a new one"""
    if not chat_id or chat_id not in chat_sessions:
        chat_id = str(uuid.uuid4())
        chat_sessions[chat_id] = {
            "id": chat_id,
            "messages": [],
            "documents": [],
            "created_at": datetime.now().isoformat()
        }
    return chat_id

async def generate_response(prompt: str, chat_id: str, context: str = "") -> str:
    """Generate response using Gemini API"""
    try:
        # Prepare the full prompt with context
        full_prompt = f"{SYSTEM_PROMPT}\n\n"
        
        # Add document context if available
        if context:
            full_prompt += f"Document Context:\n{context}\n\n"
        
        # Add chat history for context
        if chat_id in chat_sessions:
            recent_messages = chat_sessions[chat_id]["messages"][-10:]  # Last 10 messages
            if recent_messages:
                full_prompt += "Recent conversation:\n"
                for msg in recent_messages:
                    role = "User" if msg["role"] == "user" else "Sera"
                    full_prompt += f"{role}: {msg['content']}\n"
                full_prompt += "\n"
        
        full_prompt += f"User: {prompt}\nSera:"
        
        # Generate response
        response = await asyncio.to_thread(model.generate_content, full_prompt)
        return response.text
    
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return "I apologize, but I encountered an error processing your request. Please try again."

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(message: ChatMessage):
    """Main chat endpoint"""
    try:
        # Get or create chat session
        chat_id = get_or_create_chat_session(message.chatId)
        
        # Get document context if available
        context = ""
        if chat_id in chat_sessions and chat_sessions[chat_id]["documents"]:
            # Combine all document content for context
            doc_texts = []
            for doc_id in chat_sessions[chat_id]["documents"]:
                if doc_id in uploaded_documents:
                    doc_texts.append(uploaded_documents[doc_id]["content"])
            context = "\n\n".join(doc_texts)
        
        # Generate response
        response_text = await generate_response(message.message, chat_id, context)
        
        # Store messages in session
        chat_sessions[chat_id]["messages"].extend([
            {"role": "user", "content": message.message, "timestamp": datetime.now().isoformat()},
            {"role": "assistant", "content": response_text, "timestamp": datetime.now().isoformat()}
        ])
        
        return ChatResponse(
            response=response_text,
            chatId=chat_id,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), chatId: Optional[str] = None):
    """Upload and process document"""
    try:
        # Validate file type
        allowed_types = [".pdf", ".docx", ".txt"]
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(allowed_types)}"
            )
        
        # Validate file size (10MB limit)
        file_content = await file.read()
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_content) > max_size:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
        
        logger.info(f"Processing file: {file.filename} ({len(file_content)} bytes)")
        
        # Extract text based on file type
        if file_extension == ".pdf":
            text_content = extract_text_from_pdf(file_content)
        elif file_extension == ".docx":
            text_content = extract_text_from_docx(file_content)
        else:  # .txt
            try:
                text_content = file_content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    text_content = file_content.decode('latin-1')
                except UnicodeDecodeError:
                    text_content = file_content.decode('utf-8', errors='ignore')
        
        if not text_content or not text_content.strip():
            raise HTTPException(
                status_code=400, 
                detail="Could not extract text from document. The file might be empty or corrupted."
            )
        
        # Store document
        doc_id = str(uuid.uuid4())
        uploaded_documents[doc_id] = {
            "id": doc_id,
            "filename": file.filename,
            "content": text_content,
            "uploaded_at": datetime.now().isoformat(),
            "file_type": file_extension,
            "file_size": len(file_content),
            "text_length": len(text_content)
        }
        
        # Associate with chat session
        chat_id = get_or_create_chat_session(chatId)
        chat_sessions[chat_id]["documents"].append(doc_id)
        
        # Generate initial analysis
        analysis_prompt = f"I've uploaded a document titled '{file.filename}'. Please provide a brief summary and key insights from this policy document."
        analysis = await generate_response(analysis_prompt, chat_id, text_content)
        
        logger.info(f"Successfully processed document: {file.filename}")
        
        return {
            "success": True,
            "documentId": doc_id,
            "chatId": chat_id,
            "filename": file.filename,
            "fileSize": len(file_content),
            "textLength": len(text_content),
            "analysis": analysis
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.get("/api/chat/{chat_id}/history")
async def get_chat_history(chat_id: str):
    """Get chat history for a session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return chat_sessions[chat_id]

@app.get("/api/chat/{chat_id}/documents")
async def get_chat_documents(chat_id: str):
    """Get documents associated with a chat session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    documents = []
    for doc_id in chat_sessions[chat_id]["documents"]:
        if doc_id in uploaded_documents:
            doc = uploaded_documents[doc_id].copy()
            # Don't return the full content, just metadata
            doc.pop("content", None)
            documents.append(doc)
    
    return {"documents": documents}

@app.delete("/api/chat/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat session"""
    if chat_id in chat_sessions:
        # Also remove associated documents
        for doc_id in chat_sessions[chat_id]["documents"]:
            uploaded_documents.pop(doc_id, None)
        
        chat_sessions.pop(chat_id, None)
        return {"success": True, "message": "Chat session deleted"}
    
    raise HTTPException(status_code=404, detail="Chat session not found")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Hey Sera API",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(chat_sessions),
        "uploaded_documents": len(uploaded_documents)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)