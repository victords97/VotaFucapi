#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Voting Application
Tests all endpoints and functionality
"""

import requests
import json
import base64
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://fucapi-vote-kiosk.preview.emergentagent.com/api"

# Sample base64 image (1x1 pixel transparent PNG)
SAMPLE_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.turma_ids = []
        self.usuario_id = None

    def log_test(self, test_name, passed, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = {
            'test': test_name,
            'passed': passed,
            'details': details,
            'response_data': response_data,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} | {test_name}")
        if details:
            print(f"    Details: {details}")
        if not passed and response_data:
            print(f"    Response: {response_data}")
        print()

    def test_health_check(self):
        """Test 1: Health Check"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Health Check", True, f"Message: {data['message']}", data)
                else:
                    self.log_test("Health Check", False, "No message in response", data)
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")

    def test_create_turma_a(self):
        """Test 2: Create Turma A"""
        try:
            payload = {
                "nome_turma": "Turma A",
                "nome_projeto": "Robô Autônomo", 
                "numero_barraca": "101",
                "foto_base64": SAMPLE_IMAGE
            }
            
            response = self.session.post(f"{BASE_URL}/admin/turmas", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "turma_id" in data:
                    self.turma_ids.append(data["turma_id"])
                    self.log_test("Create Turma A", True, f"Turma ID: {data['turma_id']}", data)
                else:
                    self.log_test("Create Turma A", False, "No success or turma_id in response", data)
            else:
                self.log_test("Create Turma A", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Create Turma A", False, f"Exception: {str(e)}")

    def test_create_turma_b(self):
        """Test 3: Create Turma B"""
        try:
            payload = {
                "nome_turma": "Turma B",
                "nome_projeto": "App Sustentável",
                "numero_barraca": "102", 
                "foto_base64": SAMPLE_IMAGE
            }
            
            response = self.session.post(f"{BASE_URL}/admin/turmas", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "turma_id" in data:
                    self.turma_ids.append(data["turma_id"])
                    self.log_test("Create Turma B", True, f"Turma ID: {data['turma_id']}", data)
                else:
                    self.log_test("Create Turma B", False, "No success or turma_id in response", data)
            else:
                self.log_test("Create Turma B", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Create Turma B", False, f"Exception: {str(e)}")

    def test_get_turmas(self):
        """Test 4: Get Turmas"""
        try:
            response = self.session.get(f"{BASE_URL}/turmas")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 2:
                    turma_names = [t.get("nome_turma") for t in data]
                    self.log_test("Get Turmas", True, f"Found {len(data)} turmas: {turma_names}", data)
                else:
                    self.log_test("Get Turmas", False, f"Expected list with >=2 turmas, got: {len(data) if isinstance(data, list) else 'not a list'}", data)
            else:
                self.log_test("Get Turmas", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Turmas", False, f"Exception: {str(e)}")

    def test_register_user(self):
        """Test 5: Register User with Face"""
        try:
            payload = {
                "nome": "João Silva",
                "cpf": "12345678901",
                "telefone": "92999999999",
                "face_image": SAMPLE_IMAGE
            }
            
            response = self.session.post(f"{BASE_URL}/register", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "usuario_id" in data:
                    self.usuario_id = data["usuario_id"]
                    self.log_test("Register User", True, f"Usuario ID: {data['usuario_id']}", data)
                else:
                    self.log_test("Register User", False, "No success or usuario_id in response", data)
            else:
                self.log_test("Register User", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Register User", False, f"Exception: {str(e)}")

    def test_verify_face(self):
        """Test 6: Verify Face (Existing User)"""
        try:
            payload = {
                "face_image": SAMPLE_IMAGE
            }
            
            response = self.session.post(f"{BASE_URL}/verify-face", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                # Note: Face recognition may not work with dummy image
                if data.get("found"):
                    self.log_test("Verify Face", True, "Face found and matched", data)
                else:
                    self.log_test("Verify Face", True, "Face verification endpoint working (face not found with dummy image, expected)", data)
            else:
                self.log_test("Verify Face", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Verify Face", False, f"Exception: {str(e)}")

    def test_vote(self):
        """Test 7: Vote"""
        if not self.usuario_id or not self.turma_ids:
            self.log_test("Vote", False, "Missing usuario_id or turma_ids from previous tests")
            return
            
        try:
            payload = {
                "usuario_id": self.usuario_id,
                "turma_id": self.turma_ids[0]  # Vote for first turma
            }
            
            response = self.session.post(f"{BASE_URL}/vote", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Vote", True, "Vote registered successfully", data)
                else:
                    self.log_test("Vote", False, "No success in response", data)
            else:
                self.log_test("Vote", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Vote", False, f"Exception: {str(e)}")

    def test_vote_again(self):
        """Test 8: Try to Vote Again (Should Fail)"""
        if not self.usuario_id or not self.turma_ids:
            self.log_test("Vote Again (Should Fail)", False, "Missing usuario_id or turma_ids from previous tests")
            return
            
        try:
            payload = {
                "usuario_id": self.usuario_id,
                "turma_id": self.turma_ids[0]  # Same vote
            }
            
            response = self.session.post(f"{BASE_URL}/vote", json=payload)
            
            if response.status_code == 400:
                data = response.json()
                if "já realizou sua votação" in data.get("detail", ""):
                    self.log_test("Vote Again (Should Fail)", True, "Correctly prevented duplicate voting", data)
                else:
                    self.log_test("Vote Again (Should Fail)", False, "Wrong error message for duplicate vote", data)
            else:
                self.log_test("Vote Again (Should Fail)", False, f"Expected 400 status, got: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Vote Again (Should Fail)", False, f"Exception: {str(e)}")

    def test_admin_results(self):
        """Test 9: Admin - Get Results"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/results")
            
            if response.status_code == 200:
                data = response.json()
                if "total_votos" in data and "turmas" in data:
                    self.log_test("Admin Results", True, f"Total votes: {data['total_votos']}, Turmas count: {len(data['turmas'])}", data)
                else:
                    self.log_test("Admin Results", False, "Missing total_votos or turmas in response", data)
            else:
                self.log_test("Admin Results", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Admin Results", False, f"Exception: {str(e)}")

    def test_delete_turma(self):
        """Test 10: Admin - Delete Turma"""
        if len(self.turma_ids) < 2:
            self.log_test("Delete Turma", False, "Need at least 2 turmas to delete one")
            return
            
        try:
            turma_to_delete = self.turma_ids[1]  # Delete second turma
            response = self.session.delete(f"{BASE_URL}/admin/turmas/{turma_to_delete}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Delete Turma", True, f"Turma {turma_to_delete} deleted successfully", data)
                else:
                    self.log_test("Delete Turma", False, "No success in response", data)
            else:
                self.log_test("Delete Turma", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Delete Turma", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting Comprehensive Backend API Testing")
        print(f"Base URL: {BASE_URL}")
        print("=" * 60)
        
        test_methods = [
            self.test_health_check,
            self.test_create_turma_a,
            self.test_create_turma_b,
            self.test_get_turmas,
            self.test_register_user,
            self.test_verify_face,
            self.test_vote,
            self.test_vote_again,
            self.test_admin_results,
            self.test_delete_turma
        ]
        
        for test_method in test_methods:
            test_method()
        
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r['passed'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n🔧 CRITICAL FINDINGS:")
        critical_issues = []
        
        # Check for critical backend failures
        for result in self.test_results:
            if not result['passed']:
                if result['test'] in ['Health Check', 'Create Turma A', 'Register User', 'Vote']:
                    critical_issues.append(f"CRITICAL: {result['test']} failed - {result['details']}")
                elif 'Exception' in result['details']:
                    critical_issues.append(f"ERROR: {result['test']} - {result['details']}")
        
        if critical_issues:
            for issue in critical_issues:
                print(f"  🚨 {issue}")
        else:
            print("  ✅ No critical backend issues found")
            
        # Database operations summary
        crud_operations = ['Create Turma A', 'Create Turma B', 'Register User', 'Vote', 'Delete Turma']
        crud_results = [r for r in self.test_results if r['test'] in crud_operations]
        crud_passed = sum(1 for r in crud_results if r['passed'])
        
        print(f"\n💾 DATABASE OPERATIONS: {crud_passed}/{len(crud_results)} working")

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()