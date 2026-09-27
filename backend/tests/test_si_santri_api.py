"""
SI SANTRI backend API tests.
Covers: auth (3 roles + normalization + wrong password), student report upsert (no dup),
teacher dashboard/search/filter/add-student, parent dashboard/summary, RBAC isolation (403s).
"""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def do_login(api_client, role, identifier, password=PASSWORD):
    return api_client.post(f"{API}/auth/login", json={"role": role, "identifier": identifier, "password": password})


@pytest.fixture(scope="module")
def siswa_token(api_client):
    r = do_login(api_client, "siswa", "8459")
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def guru_token(api_client):
    r = do_login(api_client, "guru", "catur_anjar_anggraini")
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def wali_token(api_client):
    r = do_login(api_client, "wali_murid", "afika_putri_rievylia")
    assert r.status_code == 200
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestAuth:
    def test_siswa_login_success(self, api_client):
        r = do_login(api_client, "siswa", "8459")
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "siswa"
        assert data["profile"]["name"] == "Afika Putri Rievylia"
        assert data["profile"]["class_id"] == "7A"
        assert data["profile"]["nipd"] == "8459"
        assert "teacher_name" in data["profile"]

    def test_guru_login_snake_case(self, api_client):
        r = do_login(api_client, "guru", "catur_anjar_anggraini")
        assert r.status_code == 200
        data = r.json()
        assert data["profile"]["name"] == "Catur Anjar Anggraini"
        assert data["profile"]["total_students"] == 22

    def test_guru_login_normalized_spaced_caps(self, api_client):
        r = do_login(api_client, "guru", "Catur Anjar Anggraini")
        assert r.status_code == 200
        data = r.json()
        assert data["profile"]["name"] == "Catur Anjar Anggraini"

    def test_wali_login_snake_case(self, api_client):
        r = do_login(api_client, "wali_murid", "afika_putri_rievylia")
        assert r.status_code == 200
        data = r.json()
        assert data["profile"]["student_name"] == "Afika Putri Rievylia"

    def test_wali_login_normalized_spaced_caps(self, api_client):
        r = do_login(api_client, "wali_murid", "Afika Putri Rievylia")
        assert r.status_code == 200
        data = r.json()
        assert data["profile"]["student_name"] == "Afika Putri Rievylia"

    def test_wrong_password_friendly_error(self, api_client):
        r = do_login(api_client, "siswa", "8459", password="wrongpass")
        assert r.status_code == 401
        body = r.json()
        assert "detail" in body
        # friendly indonesian message, not a stack trace
        assert "salah" in body["detail"].lower()

    def test_invalid_role_rejected(self, api_client):
        r = do_login(api_client, "admin", "someone")
        assert r.status_code == 400

    def test_nonexistent_user(self, api_client):
        r = do_login(api_client, "siswa", "0000000")
        assert r.status_code == 401


class TestStudentReports:
    def test_dashboard(self, api_client, siswa_token):
        r = api_client.get(f"{API}/student/dashboard", headers=auth_headers(siswa_token))
        assert r.status_code == 200
        data = r.json()
        assert data["student"]["nipd"] == "8459"
        assert "today_date" in data
        assert "missed_dates" in data

    def _report_payload(self, activity_date):
        return {
            "activity_date": activity_date,
            "subuh": "jamaah", "dzuhur": "munfarid", "ashar": "jamaah",
            "maghrib": "jamaah", "isya": "tidak_sholat",
            "sleep_window": "21:00-22:00", "wake_window": "04:00-05:00",
            "nutrition_items": ["Karbohidrat", "Protein"],
            "parent_activities": ["Makan bersama"],
            "parent_activity_custom": "",
            "study_activities": ["Mengerjakan PR"],
            "study_activity_custom": "",
        }

    def test_upsert_no_duplicate(self, api_client, siswa_token):
        activity_date = (date.today() - timedelta(days=3)).isoformat()
        payload = self._report_payload(activity_date)

        r1 = api_client.post(f"{API}/student/reports", json=payload, headers=auth_headers(siswa_token))
        assert r1.status_code == 200
        assert r1.json()["activity_date"] == activity_date

        # resubmit same date with a change -> should update, not duplicate
        payload["isya"] = "jamaah"
        r2 = api_client.post(f"{API}/student/reports", json=payload, headers=auth_headers(siswa_token))
        assert r2.status_code == 200
        assert r2.json()["isya"] == "jamaah"

        # verify only ONE report exists for this date in the reports list
        r3 = api_client.get(f"{API}/student/reports", headers=auth_headers(siswa_token))
        assert r3.status_code == 200
        matching = [rep for rep in r3.json() if rep["activity_date"] == activity_date]
        assert len(matching) == 1
        assert matching[0]["isya"] == "jamaah"

    def test_submitted_late_flag_for_backfill(self, api_client, siswa_token):
        activity_date = (date.today() - timedelta(days=2)).isoformat()
        payload = self._report_payload(activity_date)
        r = api_client.post(f"{API}/student/reports", json=payload, headers=auth_headers(siswa_token))
        assert r.status_code == 200
        assert r.json()["submitted_late"] is True

    def test_future_date_rejected(self, api_client, siswa_token):
        activity_date = (date.today() + timedelta(days=1)).isoformat()
        payload = self._report_payload(activity_date)
        r = api_client.post(f"{API}/student/reports", json=payload, headers=auth_headers(siswa_token))
        assert r.status_code == 400

    def test_lainnya_requires_custom_text(self, api_client, siswa_token):
        activity_date = (date.today() - timedelta(days=4)).isoformat()
        payload = self._report_payload(activity_date)
        payload["parent_activities"] = ["Lainnya"]
        payload["parent_activity_custom"] = ""
        r = api_client.post(f"{API}/student/reports", json=payload, headers=auth_headers(siswa_token))
        assert r.status_code == 400

    def test_min_one_nutrition_item_enforced(self, api_client, siswa_token):
        activity_date = (date.today() - timedelta(days=5)).isoformat()
        payload = self._report_payload(activity_date)
        payload["nutrition_items"] = []
        r = api_client.post(f"{API}/student/reports", json=payload, headers=auth_headers(siswa_token))
        assert r.status_code == 400


class TestTeacherDashboard:
    def test_dashboard_kpi(self, api_client, guru_token):
        r = api_client.get(f"{API}/teacher/dashboard", headers=auth_headers(guru_token))
        assert r.status_code == 200
        data = r.json()
        assert data["total_students"] == 22
        assert data["submitted_today"] + data["pending_today"] == 22
        assert 0 <= data["percentage"] <= 100

    def test_search_by_name(self, api_client, guru_token):
        r = api_client.get(f"{API}/teacher/students", params={"search": "Afika"}, headers=auth_headers(guru_token))
        assert r.status_code == 200
        names = [s["name"] for s in r.json()]
        assert any("Afika" in n for n in names)

    def test_search_by_nipd(self, api_client, guru_token):
        r = api_client.get(f"{API}/teacher/students", params={"search": "8459"}, headers=auth_headers(guru_token))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["nipd"] == "8459"

    def test_filter_status_sudah_belum(self, api_client, guru_token):
        r_all = api_client.get(f"{API}/teacher/students", headers=auth_headers(guru_token))
        r_sudah = api_client.get(f"{API}/teacher/students", params={"status": "sudah"}, headers=auth_headers(guru_token))
        r_belum = api_client.get(f"{API}/teacher/students", params={"status": "belum"}, headers=auth_headers(guru_token))
        assert r_all.status_code == r_sudah.status_code == r_belum.status_code == 200
        assert len(r_sudah.json()) + len(r_belum.json()) == len(r_all.json())
        assert all(s["filled"] for s in r_sudah.json())
        assert all(not s["filled"] for s in r_belum.json())

    def test_student_detail_with_recap(self, api_client, guru_token):
        r_list = api_client.get(f"{API}/teacher/students", params={"search": "8459"}, headers=auth_headers(guru_token))
        student_id = r_list.json()[0]["student_id"]
        detail = api_client.get(f"{API}/teacher/students/{student_id}", headers=auth_headers(guru_token))
        assert detail.status_code == 200
        d = detail.json()
        assert d["student"]["nipd"] == "8459"
        assert "recap_7_days" in d and "recap_30_days" in d
        assert d["recap_7_days"]["days"] == 7
        assert d["recap_30_days"]["days"] == 30

    def test_add_student_and_immediate_login(self, api_client, guru_token):
        unique = uuid.uuid4().hex[:6]
        new_nipd = f"9{unique[:5]}"
        payload = {
            "name": f"TEST_Siswa {unique}",
            "nipd": new_nipd,
            "class_id": "7A",
        }
        r = api_client.post(f"{API}/teacher/students", json=payload, headers=auth_headers(guru_token))
        assert r.status_code == 200
        data = r.json()
        assert data["nipd"] == new_nipd

        # new student should log in immediately
        login_r = do_login(api_client, "siswa", new_nipd)
        assert login_r.status_code == 200
        assert login_r.json()["profile"]["nipd"] == new_nipd

        # new parent should log in immediately too
        parent_username = data["login_wali_murid"]["username"]
        parent_login = do_login(api_client, "wali_murid", parent_username)
        assert parent_login.status_code == 200


class TestParentDashboard:
    def test_dashboard_only_child(self, api_client, wali_token):
        r = api_client.get(f"{API}/parent/dashboard", headers=auth_headers(wali_token))
        assert r.status_code == 200
        data = r.json()
        assert data["student"]["name"] == "Afika Putri Rievylia"

    def test_summary_7_and_30(self, api_client, wali_token):
        r7 = api_client.get(f"{API}/parent/summary", params={"days": 7}, headers=auth_headers(wali_token))
        r30 = api_client.get(f"{API}/parent/summary", params={"days": 30}, headers=auth_headers(wali_token))
        assert r7.status_code == 200 and r30.status_code == 200
        assert r7.json()["days"] == 7
        assert r30.json()["days"] == 30

    def test_history(self, api_client, wali_token):
        r = api_client.get(f"{API}/parent/reports", headers=auth_headers(wali_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestRBACIsolation:
    def test_teacher_cannot_access_other_teachers_student(self, api_client, guru_token):
        # Abimael Saputro belongs to Siti Suhaidah, not Catur Anjar Anggraini
        login_r = do_login(api_client, "siswa", "8382")
        assert login_r.status_code == 200
        other_student_id = login_r.json()["profile"]["student_id"]

        r = api_client.get(f"{API}/teacher/students/{other_student_id}", headers=auth_headers(guru_token))
        assert r.status_code == 403

    def test_siswa_token_cannot_call_teacher_endpoint(self, api_client, siswa_token):
        r = api_client.get(f"{API}/teacher/dashboard", headers=auth_headers(siswa_token))
        assert r.status_code == 403

    def test_siswa_token_cannot_call_parent_endpoint(self, api_client, siswa_token):
        r = api_client.get(f"{API}/parent/dashboard", headers=auth_headers(siswa_token))
        assert r.status_code == 403

    def test_guru_token_cannot_call_student_endpoint(self, api_client, guru_token):
        r = api_client.get(f"{API}/student/dashboard", headers=auth_headers(guru_token))
        assert r.status_code == 403

    def test_wali_token_cannot_call_teacher_endpoint(self, api_client, wali_token):
        r = api_client.get(f"{API}/teacher/dashboard", headers=auth_headers(wali_token))
        assert r.status_code == 403

    def test_no_token_unauthorized(self, api_client):
        r = api_client.get(f"{API}/student/dashboard")
        assert r.status_code == 401
