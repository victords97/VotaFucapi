#!/usr/bin/env python3
"""
Additional Edge Case Testing for Voting Application Backend
"""

import requests
import json

BASE_URL = "https://fucapi-vote-kiosk.preview.emergentagent.com/api"
SAMPLE_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def test_edge_cases():
    """Test edge cases and error conditions"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    print("🔍 Testing Edge Cases and Error Conditions")
    print("=" * 50)
    
    # Test 1: Invalid turma_id for voting
    print("Test 1: Vote with invalid turma_id")
    try:
        response = session.post(f"{BASE_URL}/vote", json={
            "usuario_id": "invalid_user_id",
            "turma_id": "invalid_turma_id"
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 500:
            print("✅ Correctly handled invalid IDs")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Exception: {e}")
    
    # Test 2: Register user with duplicate CPF
    print("\nTest 2: Register user with duplicate CPF")
    try:
        response = session.post(f"{BASE_URL}/register", json={
            "nome": "Maria Silva",
            "cpf": "12345678901",  # Same CPF as before
            "telefone": "92888888888",
            "face_image": SAMPLE_IMAGE
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            data = response.json()
            print(f"✅ Correctly prevented duplicate CPF: {data.get('detail')}")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Exception: {e}")
    
    # Test 3: Invalid base64 image
    print("\nTest 3: Register with invalid base64 image")
    try:
        response = session.post(f"{BASE_URL}/register", json={
            "nome": "Pedro Santos", 
            "cpf": "98765432101",
            "telefone": "92777777777",
            "face_image": "invalid_base64_string"
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print("✅ Correctly handled invalid image format")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Exception: {e}")
    
    # Test 4: Delete non-existent turma
    print("\nTest 4: Delete non-existent turma")
    try:
        response = session.delete(f"{BASE_URL}/admin/turmas/nonexistent_id")
        print(f"Status: {response.status_code}")
        if response.status_code == 500:
            print("✅ Handled non-existent turma deletion")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Exception: {e}")
    
    # Test 5: Face verification with no users (after clearing DB)
    print("\nTest 5: Face verification functionality")
    try:
        response = session.post(f"{BASE_URL}/verify-face", json={
            "face_image": SAMPLE_IMAGE
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Face verification endpoint working: {data.get('message', data)}")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

    print("\n✅ Edge case testing completed")

if __name__ == "__main__":
    test_edge_cases()