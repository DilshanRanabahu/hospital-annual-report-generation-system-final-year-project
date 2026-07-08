-- =====================================================================
-- Hospital Management System - Clinic Management Dummy Data
-- =====================================================================
-- Run this script to populate the database with realistic data for 
-- the Clinic Management dashboard (Registrations, Appointments, Prescriptions).
-- Command to run inside docker:
-- docker exec -i hms-mysql mysql -u root -p'my_secure_password' hms < fix_clinic_data.sql
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Make some patients appear as "Registered Today" for the Analytics & Overview
UPDATE patient SET registration_date = NOW() WHERE national_id IN ('851234567V', '921234567V', '781234567V');

-- 2. Ensure some appointments are exactly for today
UPDATE appointments SET appointment_date = CURDATE() WHERE appointment_id IN (1, 2, 3);
UPDATE appointments SET appointment_date = CURDATE() + INTERVAL 1 DAY WHERE appointment_id IN (4, 5);

-- 3. Insert Clinic Prescriptions
INSERT IGNORE INTO clinic_prescriptions (id, prescription_id, patient_national_id, prescribed_by, start_date, end_date, prescribed_date, status, clinic_name, visit_type, total_medications, prescription_notes, created_at, last_modified) VALUES
(1, 'CP-2024-001', '851234567V', 'Dr. Anil Peiris', CURDATE(), CURDATE() + INTERVAL 7 DAY, NOW(), 'ACTIVE', 'Cardiology Clinic', 'Consultation', 2, 'Follow up in 1 week if symptoms persist', NOW(), NOW()),
(2, 'CP-2024-002', '921234567V', 'Dr. Mahendra Silva', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 5 DAY, NOW() - INTERVAL 1 DAY, 'COMPLETED', 'General Clinic', 'Follow-up', 3, 'Patient has allergies to penicillin', NOW(), NOW()),
(3, 'CP-2024-003', '781234567V', 'Dr. Sujani Fernando', CURDATE(), CURDATE() + INTERVAL 30 DAY, NOW(), 'PENDING', 'Endocrinology Clinic', 'Consultation', 1, 'Regular diabetes checkup', NOW(), NOW()),
(4, 'CP-2024-004', '881234567V', 'Dr. Chamari Perera', CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 28 DAY, NOW() - INTERVAL 2 DAY, 'READY', 'Cardiology Clinic', 'Consultation', 2, 'Hypertension management', NOW(), NOW());

-- 4. Insert Clinic Prescription Items
INSERT IGNORE INTO clinic_prescription_items (id, clinic_prescription_id, medication_id, dose, frequency, quantity, quantity_unit, instructions, route, is_urgent, item_status, dispensed_quantity, remaining_quantity, created_at, last_modified) VALUES
(1, 1, 1, '500mg', 'Three times daily', 21, 'tablets', 'Take with food', 'Oral', 0, 'PENDING', 0, 21, NOW(), NOW()),
(2, 1, 3, '200mg', 'As needed', 10, 'tablets', 'Take for pain relief', 'Oral', 0, 'PENDING', 0, 10, NOW(), NOW()),
(3, 2, 2, '250mg', 'Once daily', 5, 'tablets', 'Take on empty stomach', 'Oral', 1, 'COMPLETED', 5, 0, NOW(), NOW()),
(4, 2, 6, '10ml', 'Three times daily', 1, 'bottles', 'Shake well before use', 'Oral', 0, 'COMPLETED', 1, 0, NOW(), NOW()),
(5, 2, 8, '1 lozenge', 'Every 4 hours', 20, 'tablets', 'Dissolve slowly in mouth', 'Oral', 0, 'COMPLETED', 20, 0, NOW(), NOW()),
(6, 3, 5, '500mg', 'Twice daily', 60, 'tablets', 'Take with meals', 'Oral', 0, 'PENDING', 0, 60, NOW(), NOW()),
(7, 4, 3, '10mg', 'Once daily', 30, 'tablets', 'Take in the morning', 'Oral', 0, 'READY', 0, 30, NOW(), NOW()),
(8, 4, 1, '5mg', 'Once daily', 30, 'tablets', 'Take at the same time daily', 'Oral', 0, 'READY', 0, 30, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
