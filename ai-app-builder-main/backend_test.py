#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Optional

class MetaBuilderAPITester:
    def __init__(self, base_url="https://code-from-chat-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_project_id = None
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None) -> tuple:
        """Make HTTP request and return success, response_data, status_code"""
        url = f"{self.api_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            request_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            request_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=request_headers)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=request_headers)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=request_headers)
            else:
                return False, {}, 500
            
            try:
                response_data = response.json()
            except:
                response_data = {"message": "No JSON response"}
            
            return response.status_code < 400, response_data, response.status_code
        
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test if the backend server is running"""
        try:
            response = requests.get(f"{self.base_url}/")
            return self.log_test("Health Check", response.status_code == 200, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Health Check", False, f"Error: {str(e)}")

    def test_email_register(self):
        """Test email registration"""
        timestamp = int(datetime.now().timestamp())
        test_user = {
            "email": f"test.{timestamp}@example.com",
            "password": "testpass123",
            "name": f"Test User {timestamp}"
        }
        
        success, data, status = self.make_request('POST', 'auth/register', test_user)
        
        if success and 'session_token' in data:
            self.session_token = data['session_token']
            self.user_id = data['user']['user_id']
            return self.log_test("Email Registration", True, f"User: {data['user']['email']}")
        else:
            return self.log_test("Email Registration", False, f"Status: {status}, Response: {data}")

    def test_auth_me(self):
        """Test getting current user"""
        if not self.session_token:
            return self.log_test("Auth Me", False, "No session token available")
        
        success, data, status = self.make_request('GET', 'auth/me')
        
        if success and 'user_id' in data:
            return self.log_test("Auth Me", True, f"User: {data.get('name', 'Unknown')}")
        else:
            return self.log_test("Auth Me", False, f"Status: {status}, Response: {data}")

    def test_create_project(self):
        """Test creating a project"""
        if not self.session_token:
            return self.log_test("Create Project", False, "Not authenticated")
        
        project_data = {
            "name": "Test AI App",
            "description": "A test project for MetaBuilder",
            "llm_provider": "openai",
            "llm_model": "gpt-5.2"
        }
        
        success, data, status = self.make_request('POST', 'projects', project_data)
        
        if success and 'project_id' in data:
            self.test_project_id = data['project_id']
            return self.log_test("Create Project", True, f"Project ID: {data['project_id']}")
        else:
            return self.log_test("Create Project", False, f"Status: {status}, Response: {data}")

    def test_get_projects(self):
        """Test getting user projects"""
        if not self.session_token:
            return self.log_test("Get Projects", False, "Not authenticated")
        
        success, data, status = self.make_request('GET', 'projects')
        
        if success and isinstance(data, list):
            return self.log_test("Get Projects", True, f"Found {len(data)} projects")
        else:
            return self.log_test("Get Projects", False, f"Status: {status}, Response: {data}")

    def test_get_project_details(self):
        """Test getting specific project details"""
        if not self.test_project_id:
            return self.log_test("Get Project Details", False, "No test project available")
        
        success, data, status = self.make_request('GET', f'projects/{self.test_project_id}')
        
        if success and data.get('project_id') == self.test_project_id:
            return self.log_test("Get Project Details", True, f"Name: {data.get('name')}")
        else:
            return self.log_test("Get Project Details", False, f"Status: {status}, Response: {data}")

    def test_generate_code(self):
        """Test AI code generation"""
        if not self.test_project_id:
            return self.log_test("Generate Code", False, "No test project available")
        
        generate_data = {
            "project_id": self.test_project_id,
            "prompt": "Create a simple React counter component with increment and decrement buttons"
        }
        
        success, data, status = self.make_request('POST', 'generate', generate_data)
        
        if success and 'message' in data:
            return self.log_test("Generate Code", True, "AI generated response")
        else:
            return self.log_test("Generate Code", False, f"Status: {status}, Response: {data}")

    def test_get_messages(self):
        """Test getting project messages"""
        if not self.test_project_id:
            return self.log_test("Get Messages", False, "No test project available")
        
        success, data, status = self.make_request('GET', f'projects/{self.test_project_id}/messages')
        
        if success and isinstance(data, list):
            return self.log_test("Get Messages", True, f"Found {len(data)} messages")
        else:
            return self.log_test("Get Messages", False, f"Status: {status}, Response: {data}")

    def test_get_files(self):
        """Test getting project files"""
        if not self.test_project_id:
            return self.log_test("Get Files", False, "No test project available")
        
        success, data, status = self.make_request('GET', f'projects/{self.test_project_id}/files')
        
        if success and isinstance(data, list):
            return self.log_test("Get Files", True, f"Found {len(data)} files")
        else:
            return self.log_test("Get Files", False, f"Status: {status}, Response: {data}")

    def test_get_templates(self):
        """Test getting templates"""
        success, data, status = self.make_request('GET', 'templates')
        
        if success and isinstance(data, list) and len(data) > 0:
            return self.log_test("Get Templates", True, f"Found {len(data)} templates")
        else:
            return self.log_test("Get Templates", False, f"Status: {status}, Response: {data}")

    def test_delete_project(self):
        """Test deleting a project"""
        if not self.test_project_id:
            return self.log_test("Delete Project", False, "No test project available")
        
        success, data, status = self.make_request('DELETE', f'projects/{self.test_project_id}')
        
        if success:
            return self.log_test("Delete Project", True, "Project deleted")
        else:
            return self.log_test("Delete Project", False, f"Status: {status}, Response: {data}")

    def test_logout(self):
        """Test logout"""
        if not self.session_token:
            return self.log_test("Logout", False, "Not authenticated")
        
        success, data, status = self.make_request('POST', 'auth/logout')
        
        if success:
            self.session_token = None
            return self.log_test("Logout", True, "Logged out successfully")
        else:
            return self.log_test("Logout", False, f"Status: {status}, Response: {data}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting MetaBuilder Backend API Tests")
        print("=" * 50)
        
        # Basic connectivity
        self.test_health_check()
        
        # Authentication flow
        self.test_email_register()
        self.test_auth_me()
        
        # Project management
        self.test_create_project()
        self.test_get_projects()
        self.test_get_project_details()
        
        # AI Generation (this might take longer)
        print("\n🧠 Testing AI Code Generation (may take 10-30 seconds)...")
        self.test_generate_code()
        
        # Project data
        self.test_get_messages()
        self.test_get_files()
        
        # Templates
        self.test_get_templates()
        
        # Cleanup
        self.test_delete_project()
        self.test_logout()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

def main():
    """Main function"""
    tester = MetaBuilderAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())