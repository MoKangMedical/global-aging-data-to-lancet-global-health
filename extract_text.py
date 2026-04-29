#!/usr/bin/env python3.11
"""
Text extraction script for PDF and Word documents.
Uses Python 3.11 to avoid SRE module mismatch issues.
"""
import sys
import base64

def extract_text_from_pdf(file_data):
    """Extract text from PDF file."""
    try:
        import pdfplumber
        import io
        
        with pdfplumber.open(io.BytesIO(file_data)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
    except Exception as e:
        raise Exception(f"PDF extraction failed: {str(e)}")

def extract_text_from_docx(file_data):
    """Extract text from Word document."""
    try:
        from docx import Document
        import io
        
        doc = Document(io.BytesIO(file_data))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except Exception as e:
        raise Exception(f"DOCX extraction failed: {str(e)}")

def main():
    if len(sys.argv) != 3:
        print("Usage: extract_text.py <file_type> <base64_data>", file=sys.stderr)
        sys.exit(1)
    
    file_type = sys.argv[1]
    base64_data = sys.argv[2]
    
    try:
        # Decode base64 data
        file_data = base64.b64decode(base64_data)
        
        # Extract text based on file type
        if file_type == "pdf":
            text = extract_text_from_pdf(file_data)
        elif file_type == "docx":
            text = extract_text_from_docx(file_data)
        else:
            raise Exception(f"Unsupported file type: {file_type}")
        
        # Print extracted text
        print(text)
    except Exception as e:
        print(f"Error extracting text: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
