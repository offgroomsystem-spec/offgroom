I will audit the database and code to identify why the third appointment was missing and why messages weren't grouped. I will then implement a robust grouping logic for automated WhatsApp messages.

### Audit Findings
- The system currently schedules one WhatsApp message per appointment. When a client has multiple pets scheduled at the same time, this results in multiple separate messages.
- The `scheduleWhatsAppMessages` function is called sequentially for each pet, and it doesn't currently check for other appointments to merge them.
- One pet (Jolie) might have been missed if the automated scheduler was triggered before all appointments were fully saved or if there was a duplicate check conflict.

### Technical Steps

1.  **Enhance `whatsappScheduler.ts`**:
    - Modify `ScheduleParams` to support multiple pets.
    - Update `buildConfirmationMessage` and `buildReminderMessage` to dynamically pluralize text (e.g., "seu pet" vs "seus pets", "receber ele" vs "receber eles") and join pet names (e.g., "Luck, Luna e Jolie").
    - Implement logic in `scheduleWhatsAppMessages` to check for existing pending messages for the same WhatsApp number and time slot.
    - If a pending message exists, update it by adding the new pet's name and services instead of creating a duplicate message.

2.  **Optimize `Agendamentos.tsx`**:
    - Refactor the appointment creation flow to pass all pet information to the scheduler in a single call when multiple pets are added simultaneously.
    - This ensures that the very first message scheduled already contains all pets.

3.  **Audit & Fix**:
    - Check for any race conditions in the `Agendamentos.tsx` loop that could cause a pet to be skipped.
    - Ensure pet name matching is case-insensitive and trimmed to prevent mismatches.

4.  **Verification**:
    - I will verify the logic by checking the generated message templates for cases with 1, 2, and 3 pets.
