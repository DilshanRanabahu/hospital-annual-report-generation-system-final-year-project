-- =====================================================================
-- Hospital Management System - Lab Requests Dummy Data Seeder
-- =====================================================================
-- Run this script to populate the database with realistic data for 
-- the Lab Requests tab in the Ward Management dashboard.
-- Command to run inside docker:
-- docker exec -i hms-mysql mysql -u root -p'my_secure_password' hms < lab_data.sql
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Lab Requests Data
-- --------------------------------------------------------
INSERT IGNORE INTO lab_requests (id, request_id, patient_national_id, patient_name, ward_name, bed_number, priority, requested_by, request_date, status, created_at, updated_at) VALUES
(1, 'LAB-REQ-001', '901234567V', 'Kamal Perera', 'General Ward - Male', 'B-01', 'normal', 'Dr. Anil Peiris', CURDATE(), 'PENDING', NOW(), NOW()),
(2, 'LAB-REQ-002', '851234567V', 'Nimali Silva', 'General Ward - Female', 'B-05', 'normal', 'Dr. Sujani Fernando', CURDATE(), 'IN_PROGRESS', NOW(), NOW()),
(3, 'LAB-REQ-003', '921234567V', 'Ruwan Fernando', 'ICU', 'ICU-1', 'urgent', 'Dr. Mahendra Silva', CURDATE(), 'COMPLETED', NOW(), NOW()),
(4, 'LAB-REQ-004', '781234567V', 'Sunethra Kumari', 'General Ward - Female', 'B-08', 'normal', 'Dr. Chamari Perera', CURDATE() - INTERVAL 1 DAY, 'COMPLETED', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(5, 'LAB-REQ-005', '951234567V', 'Kasun Bandara', 'General Ward - Male', 'B-12', 'normal', 'Dr. Roshan Bandara', CURDATE(), 'PENDING', NOW(), NOW()),
(6, 'LAB-REQ-006', '911234567V', 'Tharushi Weerasinghe', 'Maternity Ward', 'M-02', 'normal', 'Dr. Sujani Fernando', CURDATE() - INTERVAL 2 DAY, 'CANCELLED', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY),
(7, 'LAB-REQ-007', '801234567V', 'Amara Jayasinghe', 'ICU', 'ICU-3', 'urgent', 'Dr. Anil Peiris', CURDATE(), 'IN_PROGRESS', NOW(), NOW()),
(8, 'LAB-REQ-008', '881234567V', 'Chathura Ratnayake', 'General Ward - Male', 'B-15', 'normal', 'Dr. Mahendra Silva', CURDATE(), 'PENDING', NOW(), NOW());

-- --------------------------------------------------------
-- 2. Lab Tests Data (Associated with the requests)
-- --------------------------------------------------------
INSERT IGNORE INTO lab_tests (id, test_id, test_name, category, urgent, lab_request_id) VALUES
(1, 'TEST-CBC', 'Complete Blood Count', 'Hematology', 0, 1),
(2, 'TEST-BMP', 'Basic Metabolic Panel', 'Biochemistry', 0, 1),
(3, 'TEST-LIPID', 'Lipid Profile', 'Biochemistry', 0, 2),
(4, 'TEST-GLU', 'Fasting Blood Glucose', 'Biochemistry', 1, 3),
(5, 'TEST-LFT', 'Liver Function Test', 'Biochemistry', 1, 3),
(6, 'TEST-UA', 'Urinalysis', 'Microbiology', 0, 4),
(7, 'TEST-TSH', 'Thyroid Stimulating Hormone', 'Endocrinology', 0, 5),
(8, 'TEST-CBC', 'Complete Blood Count', 'Hematology', 0, 6),
(9, 'TEST-TROP', 'Troponin I', 'Cardiac Markers', 1, 7),
(10, 'TEST-ABG', 'Arterial Blood Gas', 'Hematology', 1, 7),
(11, 'TEST-CRP', 'C-Reactive Protein', 'Immunology', 0, 8);

SET FOREIGN_KEY_CHECKS = 1;
