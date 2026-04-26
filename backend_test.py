#!/usr/bin/env python3
"""
Backend API Testing for Authentication System
Tests all authentication endpoints
"""

import requests
import sys
import json
from datetime import datetime
import uuid

class AuthAPITester:
    def __init__(self):
        self.base_url = "https://progreso-mobile.preview.emergentagent.com/api"
        self.token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED - {message}")
        else:
            print(f"❌ {test_name}: FAILED - {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })

    def test_register(self):
        """Test user registration"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        test_data = {
            "email": test_email,
            "password": "password123",
            "name": "Test User"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=test_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.test_user_id = data["user"]["id"]
                    self.log_result("User Registration", True, f"User created successfully with ID: {self.test_user_id}", data)
                    return True
                else:
                    self.log_result("User Registration", False, f"Missing token or user in response: {data}")
            else:
                self.log_result("User Registration", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("User Registration", False, f"Request failed: {str(e)}")
        
        return False

    def test_login_existing_user(self):
        """Test login with existing user"""
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]  # Update token for subsequent tests
                    self.log_result("Login Existing User", True, f"Login successful for user: {data['user']['email']}", data)
                    return True
                else:
                    self.log_result("Login Existing User", False, f"Missing token or user in response: {data}")
            else:
                self.log_result("Login Existing User", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Login Existing User", False, f"Request failed: {str(e)}")
        
        return False

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 401:
                self.log_result("Login Invalid Credentials", True, "Correctly rejected invalid credentials")
                return True
            else:
                self.log_result("Login Invalid Credentials", False, f"Expected 401, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Login Invalid Credentials", False, f"Request failed: {str(e)}")
        
        return False

    def test_get_me(self):
        """Test /auth/me endpoint"""
        if not self.token:
            self.log_result("Get User Info", False, "No token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{self.base_url}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "email", "name", "created_at"]
                if all(field in data for field in required_fields):
                    self.log_result("Get User Info", True, f"User info retrieved: {data['email']}", data)
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Get User Info", False, f"Missing fields: {missing}")
            else:
                self.log_result("Get User Info", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Get User Info", False, f"Request failed: {str(e)}")
        
        return False

    def test_get_me_without_token(self):
        """Test /auth/me endpoint without token"""
        try:
            response = requests.get(f"{self.base_url}/auth/me", timeout=10)
            
            if response.status_code == 403:  # FastAPI returns 403 for missing auth
                self.log_result("Get User Info No Token", True, "Correctly rejected request without token")
                return True
            else:
                self.log_result("Get User Info No Token", False, f"Expected 403, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Get User Info No Token", False, f"Request failed: {str(e)}")
        
        return False

    def test_duplicate_registration(self):
        """Test registering with existing email"""
        duplicate_data = {
            "email": "test@example.com",  # This should already exist
            "password": "password123",
            "name": "Duplicate User"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=duplicate_data, timeout=10)
            
            if response.status_code == 400:
                self.log_result("Duplicate Registration", True, "Correctly rejected duplicate email")
                return True
            else:
                self.log_result("Duplicate Registration", False, f"Expected 400, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Duplicate Registration", False, f"Request failed: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all authentication tests"""
        print(f"\n🚀 Starting Authentication API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test registration
        self.test_register()
        
        # Test login with existing user
        self.test_login_existing_user()
        
        # Test invalid credentials
        self.test_login_invalid_credentials()
        
        # Test /me endpoint with token
        self.test_get_me()
        
        # Test /me endpoint without token
        self.test_get_me_without_token()
        
        # Test duplicate registration
        self.test_duplicate_registration()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed!")
            return 1

if __name__ == "__main__":
    tester = AuthAPITester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)