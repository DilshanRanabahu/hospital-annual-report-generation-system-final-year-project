-- =====================================================================
-- Hospital Management System - Fix Analytics & Add Test Results
-- =====================================================================
-- Run this script to update the dates for Admissions so they appear 
-- on the "Last 30 Days" and Monthly Analytics charts.
-- Also adds dummy data for Test Results.
-- Command:
-- docker exec -i hms-mysql mysql -u root -p'my_secure_password' hms < fix_analytics_data.sql
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Update Admission Dates for Analytics (Last 30 days)
-- --------------------------------------------------------
UPDATE admission SET admission_date = NOW() - INTERVAL 5 DAY, discharge_date = NOW() - INTERVAL 1 DAY, status = 'DISCHARGED' WHERE admission_id = 1;
UPDATE admission SET admission_date = NOW() - INTERVAL 15 DAY, discharge_date = NULL, status = 'ACTIVE' WHERE admission_id = 2;
UPDATE admission SET admission_date = NOW() - INTERVAL 2 DAY, discharge_date = NULL, status = 'ACTIVE' WHERE admission_id = 3;
UPDATE admission SET admission_date = NOW() - INTERVAL 20 DAY, discharge_date = NOW() - INTERVAL 10 DAY, status = 'DISCHARGED' WHERE admission_id = 4;
UPDATE admission SET admission_date = NOW() - INTERVAL 1 DAY, discharge_date = NULL, status = 'ACTIVE' WHERE admission_id = 5;
UPDATE admission SET admission_date = NOW(), discharge_date = NULL, status = 'ACTIVE' WHERE admission_id = 6;

-- Adding a few more recent admissions/discharges for better charts
INSERT IGNORE INTO admission (admission_id, patient_national_id, ward_id, bed_number, admission_date, discharge_date, status) VALUES
(7, '801234567V', 3, 'ICU-3', NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 2 DAY, 'DISCHARGED'),
(8, '881234567V', 1, 'B-15', NOW() - INTERVAL 3 DAY, NULL, 'ACTIVE');

-- --------------------------------------------------------
-- 2. Add Dummy Test Results
-- --------------------------------------------------------
-- Test Result 1: Complete Blood Count for LAB-REQ-003
INSERT IGNORE INTO test_results (id, request_id, test_name, patient_national_id, patient_name, ward_name, completed_by, completed_at, notes, created_at, updated_at) VALUES 
(1, 'LAB-REQ-003', 'Complete Blood Count', '921234567V', 'Ruwan Fernando', 'ICU', 'LAB01', NOW(), 'Slightly elevated WBC, monitoring recommended.', NOW(), NOW());

-- Associated CBC details for Test Result 1
INSERT IGNORE INTO complete_blood_count_results (id, test_result_id, wbc, rbc, hemoglobin, platelets) VALUES 
(1, 1, 11.5, 4.8, 14.2, 250);

-- Test Result 2: Urinalysis for LAB-REQ-004
INSERT IGNORE INTO test_results (id, request_id, test_name, patient_national_id, patient_name, ward_name, completed_by, completed_at, notes, created_at, updated_at) VALUES 
(2, 'LAB-REQ-004', 'Urinalysis', '781234567V', 'Sunethra Kumari', 'General Ward - Female', 'LAB01', NOW() - INTERVAL 1 DAY, 'Normal findings. No sign of infection.', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY);

-- Test Result 3: Lipid Profile for another patient
INSERT IGNORE INTO test_results (id, request_id, test_name, patient_national_id, patient_name, ward_name, completed_by, completed_at, notes, created_at, updated_at) VALUES 
(3, 'LAB-REQ-007', 'Lipid Profile', '801234567V', 'Amara Jayasinghe', 'ICU', 'LAB01', NOW() - INTERVAL 2 DAY, 'High cholesterol detected.', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY);

-- Test Result 4: Basic Metabolic Panel
INSERT IGNORE INTO test_results (id, request_id, test_name, patient_national_id, patient_name, ward_name, completed_by, completed_at, notes, created_at, updated_at) VALUES 
(4, 'LAB-REQ-001', 'Basic Metabolic Panel', '901234567V', 'Kamal Perera', 'General Ward - Male', 'LAB01', NOW() - INTERVAL 3 DAY, 'All electrolytes are within normal limits.', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY);

SET FOREIGN_KEY_CHECKS = 1;
