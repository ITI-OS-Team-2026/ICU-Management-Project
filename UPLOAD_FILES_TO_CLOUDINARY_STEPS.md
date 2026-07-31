# How to Upload New Files to Cloudinary & Embed Them

## Quick Steps

### Step 1: Prepare Your Files
- Place all your medical documents (PDFs, Word docs, etc.) in this folder:
  ```
  server/uploads/documents/
  ```

### Step 2: Update the Script
- Edit this file: `server/scripts/seedKnowledgeBase.js`
- Add your files to the `KNOWLEDGE_DOCS` array:

```javascript
const KNOWLEDGE_DOCS = [
  {
    filename: "your_document.pdf",        // Exact filename in server/uploads/documents/
    displayName: "Your Document Title",   // Display name for users
    docType: "clinical",                  // Type: clinical, research, protocol, etc.
  },
  {
    filename: "another_file.pdf",
    displayName: "Another Document",
    docType: "clinical",
  },
  // Add more files here
];
```

### Step 3: Run the Upload Script
```bash
cd server
node scripts/seedKnowledgeBase.js
```

**What happens:**
- ✅ Files upload to Cloudinary
- ✅ Files register in database
- ✅ Files automatically extract text and embed
- ✅ Files become searchable in AI chat

### Step 4: Check the Output
You'll see something like this:
```
🔄 Seeding knowledge base to Cloudinary...

⬆️  Uploading your_document.pdf to Cloudinary...
   → URL: https://res.cloudinary.com/...
✓ Registered: Your Document Title (2.5MB)
   🧠 Embedding...
   → COMPLETED: 45 chunks

⬆️  Uploading another_file.pdf to Cloudinary...
   → URL: https://res.cloudinary.com/...
✓ Registered: Another Document (1.8MB)
   🧠 Embedding...
   → COMPLETED: 32 chunks

📊 Knowledge Base Seeding Summary:
   ✓ Uploaded & embedded: 2
   ⊘ Skipped: 0
```

---

## What Each Line Means

| Output | Meaning |
|--------|---------|
| `⬆️ Uploading...` | File is being uploaded to Cloudinary |
| `✓ Registered` | File saved to database |
| `🧠 Embedding...` | System extracting text and creating search indexes |
| `→ COMPLETED: X chunks` | ✅ File is now searchable in AI chat |
| `→ SKIPPED` | File had no readable text (scanned image?) |
| `→ FAILED` | Error during processing - check file is not corrupted |

---

## Troubleshooting

### Script won't run
```bash
# Make sure you're in server directory
cd server

# Check Node.js is installed
node --version

# Run script
node scripts/seedKnowledgeBase.js
```

### "No file uploaded" error
- Check file exists in `server/uploads/documents/`
- Check filename in `KNOWLEDGE_DOCS` array matches EXACTLY
- Check file is not corrupted (try opening it manually)

### "File not found" warning
- File listed in script but not in `server/uploads/documents/` folder
- Either add the file or remove it from the script

### Cloudinary upload fails
- Check `.env` file has these variables set:
  ```
  CLOUDINARY_CLOUD_NAME=...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_API_SECRET=...
  ```

### Files uploaded but not searchable
- Wait a few seconds for embedding to complete
- Check status: Go to Patient > AI Chat > Documents tab
- Status should show "Searchable"

---

## That's It! 🎉

Once the script finishes successfully:
- Files are on Cloudinary ☁️
- Files are in database 💾
- Files are embedded & searchable 🔍
- Doctors can use them in AI chat ✅
