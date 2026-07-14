# Contributing Guidelines

## Audit Logging Standard

Any service method that performs a database write requiring an audit trail MUST use `auditedTransaction` from `src/middlewares/auditLog.js`. Do not write ad-hoc `prisma.$transaction` blocks for this purpose.

### Usage Example
```javascript
const { auditedTransaction } = require("../../middlewares/auditLog");

const createItem = async (req, itemData) => {
  return auditedTransaction(req, { action: "CREATE", targetTable: "Item" }, async (tx) => {
    // 1. Perform database write using the transactional 'tx' client
    const newItem = await tx.item.create({
      data: itemData,
    });

    // 2. Return transaction outcome containing target ID, old/new values, and returned result
    return {
      userId: req.user?.id || null, // optional override
      targetId: newItem.id,
      oldValues: null,
      newValues: newItem,
      result: newItem,
    };
  });
};
```
