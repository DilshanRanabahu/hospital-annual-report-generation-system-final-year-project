-- =====================================================================
-- Hospital Management System - Prescriptions & Transfers Dummy Data
-- =====================================================================
-- Run this script to populate the database with realistic data for 
-- the Prescriptions and Transfers tabs in the Ward Management dashboard.
-- Command to run inside docker:
-- docker exec -i hms-mysql mysql -u root -p'my_secure_password' hms < fix_prescriptions_transfers.sql
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Prescriptions Data
-- --------------------------------------------------------
INSERT IGNORE INTO prescriptions (id, prescription_id, patient_national_id, admission_id, prescribed_by, start_date, end_date, prescribed_date, status, ward_name, bed_number, total_medications, prescription_notes, created_at, last_modified) VALUES
(1, 'RX-001', '851234567V', 2, 'Dr. Sujani Fernando', CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY, NOW() - INTERVAL 2 DAY, 'ACTIVE', 'General Ward - Female', 'B-05', 2, 'Take after meals.', NOW(), NOW()),
(2, 'RX-002', '921234567V', 3, 'Dr. Mahendra Silva', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 3 DAY, NOW() - INTERVAL 1 DAY, 'ACTIVE', 'ICU', 'ICU-1', 1, 'Urgent medication required.', NOW(), NOW()),
(3, 'RX-003', '781234567V', 4, 'Dr. Chamari Perera', CURDATE() - INTERVAL 10 DAY, CURDATE() - INTERVAL 3 DAY, NOW() - INTERVAL 10 DAY, 'COMPLETED', 'General Ward - Female', 'B-08', 1, 'Completed course.', NOW(), NOW()),
(4, 'RX-004', '881234567V', 8, 'Dr. Anil Peiris', CURDATE(), CURDATE() + INTERVAL 7 DAY, NOW(), 'ACTIVE', 'General Ward - Male', 'B-15', 3, 'Patient complaining of pain.', NOW(), NOW());

-- --------------------------------------------------------
-- 2. Prescription Items Data
-- --------------------------------------------------------
INSERT IGNORE INTO prescription_items (id, prescription_id, medication_id, dose, frequency, quantity, quantity_unit, instructions, route, is_urgent, item_status, created_at, last_modified) VALUES
(1, 1, 1, '500mg', 'Twice a day', 14, 'Tablets', 'Take after meals', 'Oral', 0, 'ACTIVE', NOW(), NOW()),
(2, 1, 2, '250mg', 'Three times a day', 21, 'Capsules', 'Complete the course', 'Oral', 0, 'ACTIVE', NOW(), NOW()),
(3, 2, 6, '40mg', 'Once a day', 5, 'Tablets', 'Take in the morning', 'Oral', 1, 'ACTIVE', NOW(), NOW()),
(4, 3, 1, '500mg', 'When needed', 10, 'Tablets', 'For pain relief', 'Oral', 0, 'COMPLETED', NOW(), NOW()),
(5, 4, 3, '20mg', 'Once a day', 7, 'Tablets', 'Take at night', 'Oral', 0, 'ACTIVE', NOW(), NOW()),
(6, 4, 4, '500mg', 'Twice a day', 14, 'Tablets', 'With food', 'Oral', 0, 'ACTIVE', NOW(), NOW()),
(7, 4, 8, '5mg', 'Once a day', 7, 'Tablets', 'Morning dose', 'Oral', 1, 'ACTIVE', NOW(), NOW());

-- --------------------------------------------------------
-- 3. Transfers Data
-- --------------------------------------------------------
-- Insert a couple of older admissions to represent "before transfer" states
INSERT IGNORE INTO admission (admission_id, patient_national_id, ward_id, bed_number, admission_date, discharge_date, status) VALUES
(9, '921234567V', 1, 'B-02', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 2 DAY, 'TRANSFERRED'),
(10, '881234567V', 3, 'ICU-2', NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 3 DAY, 'TRANSFERRED');

-- Now insert the transfer records tying the old and new admissions
INSERT IGNORE INTO transfer (transfer_id, patient_national_id, from_ward_id, to_ward_id, old_admission_id, new_admission_id, from_bed_number, to_bed_number, transfer_date, transfer_reason) VALUES
(1, '921234567V', 1, 3, 9, 3, 'B-02', 'ICU-1', NOW() - INTERVAL 2 DAY, 'Condition worsened, moved to ICU.'),
(2, '881234567V', 3, 1, 10, 8, 'ICU-2', 'B-15', NOW() - INTERVAL 3 DAY, 'Patient stabilized, moved to General Ward.');

SET FOREIGN_KEY_CHECKS = 1;
