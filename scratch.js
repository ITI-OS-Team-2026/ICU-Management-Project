const fs = require('fs');

let data = fs.readFileSync('docs/Database-Schema.md', 'utf8');
data = data.replace(
  '- 5.5 lab_results',
  '- 5.5 investigation_orders\n   - 5.6 lab_results'
);

data = data.replace(
  '1. vital_signs\n2. fluid_records\n3. medications\n4. medication_administrations\n5. lab_results',
  '1. vital_signs\n2. fluid_records\n3. medications\n4. medication_administrations\n5. investigation_orders\n6. lab_results'
);

data = data.replace(
  '# 5.5 lab_results',
  `# 5.5 investigation_orders

## Purpose

Stores investigation orders (e.g., Lab, Radiology) prescribed during an ICU admission.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Investigation order |
| admission_id | UUID | FK | Admission |
| ordered_by | UUID | FK → users | Physician |
| order_name | VARCHAR(255) | NOT NULL | Name of the order |
| type | VARCHAR(50) | NOT NULL | Type (Lab, Radiology) |
| status | VARCHAR(50) | DEFAULT 'Pending' | Order status |
| order_date | TIMESTAMPTZ | DEFAULT NOW() | Time ordered |

---

## Foreign Keys

\`\`\`sql
admission_id → admissions(id)

ordered_by → users(id)
\`\`\`

---

## Business Rules

- Tracks pending and completed investigations.
- Linked to the admission.

---

# 5.6 lab_results`
);

fs.writeFileSync('docs/Database-Schema.md', data);

// Update API Documentation
let apiDocs = fs.readFileSync('docs/API-Documenation.md', 'utf8');

if (!apiDocs.includes('Investigation Orders')) {
  apiDocs = apiDocs.replace(
    '9. Lab Results',
    '9. Investigation Orders\n10. Lab Results'
  );
  
  const investigationSection = `
# 9. Investigation Orders

## \`POST /admissions/:id/investigation-orders\`
- **Tags:** Clinical Recording
- **Auth:** Resident, Specialist
- **Request Body:** \`{ order_name, type }\`
- **Responses:** \`201 Created\`

## \`GET /admissions/:id/investigation-orders\`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Responses:** \`200 OK\`

---

# 10. Lab Results`;
  
  apiDocs = apiDocs.replace('# 9. Lab Results', investigationSection);
  
  // shift the following section numbers
  apiDocs = apiDocs.replace('10. Clinical & Nursing Notes', '11. Clinical & Nursing Notes');
  apiDocs = apiDocs.replace('# 10. Clinical & Nursing Notes', '# 11. Clinical & Nursing Notes');
  apiDocs = apiDocs.replace('11. Medical Documents', '12. Medical Documents');
  apiDocs = apiDocs.replace('# 11. Medical Documents', '# 12. Medical Documents');
  apiDocs = apiDocs.replace('12. AI Services', '13. AI Services');
  apiDocs = apiDocs.replace('# 12. AI Services (Summaries & RAG Query)', '# 13. AI Services (Summaries & RAG Query)');
  apiDocs = apiDocs.replace('13. Alerts', '14. Alerts');
  apiDocs = apiDocs.replace('# 13. Alerts', '# 14. Alerts');
  apiDocs = apiDocs.replace('14. Notifications', '15. Notifications');
  apiDocs = apiDocs.replace('# 14. Notifications', '# 15. Notifications');
  apiDocs = apiDocs.replace('15. Treatment Approvals', '16. Treatment Approvals');
  apiDocs = apiDocs.replace('# 15. Treatment Approvals', '# 16. Treatment Approvals');
  apiDocs = apiDocs.replace('16. Audit Logs', '17. Audit Logs');
  apiDocs = apiDocs.replace('# 16. Audit Logs', '# 17. Audit Logs');
  apiDocs = apiDocs.replace('17. Summary', '18. Summary');
  apiDocs = apiDocs.replace('# 17. Summary', '# 18. Summary');
  
  fs.writeFileSync('docs/API-Documenation.md', apiDocs);
}

