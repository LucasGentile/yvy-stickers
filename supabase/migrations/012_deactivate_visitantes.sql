-- Deactivate guest/visitor accounts whose name contains "visitante" (case-insensitive).
UPDATE users
SET approved = false
WHERE LOWER(name) LIKE '%visitante%';
