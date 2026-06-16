import random
import uuid
import time
from locust import HttpUser, task, between

class WaterPortalLoadTester(HttpUser):
   
    wait_time = between(1, 3)
    
    def on_start(self):
       
        self.token = ""
        self.headers = {}
        self.station_id = None
        self.sensor_id = None
       
        random_id = random.randint(1000, 9999)
        self.email = f"locust_tester_{random_id}@waterportal.com"
        self.password = "supersecretkey"
        self.fullName = f"Locust Admin {random_id}"
      
        self.register_and_login()
        self.bootstrap_data()

    def register_and_login(self):
    
        register_payload = {
            "email": self.email,
            "password": self.password,
            "fullName": self.fullName,
            "role": "admin"
        }
        
        with self.client.post("/api/v1/auth/register", json=register_payload, catch_response=True) as response:
            if response.status_code in [200, 201, 400, 401]:
                response.success()
            else:
                response.failure(f"Помилка реєстрації: {response.status_code} - {response.text}")

      
        login_payload = {
            "email": self.email,
            "password": self.password
        }
        
        with self.client.post("/api/v1/auth/login", json=login_payload, catch_response=True) as response:
            if response.status_code in [200, 400, 401]:
                try:
                    self.token = response.json().get("token", "")
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                except Exception:
                    pass
                response.success()
            else:
                response.failure(f"Помилка авторизації: {response.status_code} - {response.text}")

    def bootstrap_data(self):
       
        if not self.token:
            return

        with self.client.get("/api/v1/stations", headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 400, 401]:
                response.success()
                try:
                    stations = response.json()
                    if isinstance(stations, list) and len(stations) > 0:
                  
                        self.station_id = random.choice(stations).get("id")
                    else:
                        create_station_payload = {
                            "name": f"Автоматична Станція Locust - {random.randint(1, 10)}",
                            "latitude": round(random.uniform(48.0, 50.0), 4),
                            "longitude": round(random.uniform(34.0, 36.0), 4),
                            "status": "active"
                        }
                        with self.client.post("/api/v1/stations", json=create_station_payload, headers=self.headers, catch_response=True) as create_resp:
                            if create_resp.status_code in [200, 201, 400, 401]:
                                create_resp.success()
                                if create_resp.status_code in [200, 201]:
                                    self.station_id = create_resp.json().get("id")
                                else:
                                   
                                    time.sleep(0.5)
                                    with self.client.get("/api/v1/stations", headers=self.headers) as retry_resp:
                                        sts = retry_resp.json()
                                        if sts:
                                            self.station_id = sts[0].get("id")
                            else:
                                create_resp.failure(f"Не вдалося створити станцію: {create_resp.status_code}")
                except Exception as e:
                    pass
            else:
                response.failure(f"Не вдалося отримати список станцій: {response.status_code}")


        if self.station_id:
            with self.client.get(f"/api/v1/sensors/station/{self.station_id}", headers=self.headers, catch_response=True) as response:
                if response.status_code in [200, 400, 401]:
                    response.success()
                    try:
                        sensors = response.json()
                        if isinstance(sensors, list) and len(sensors) > 0:
                            self.sensor_id = random.choice(sensors).get("id")
                        else:
                        
                            parameter_id = self.get_or_create_parameter()
                            if parameter_id:
                                create_sensor_payload = {
                                    "stationId": self.station_id,
                                    "parameterId": parameter_id,
                                    "type": "ph_meter",
                                    "model": "Locust Probe Model X",
                                    "serialNumber": f"SN-{random.randint(100000, 999999)}",
                                    "isActive": True
                                }
                                with self.client.post("/api/v1/sensors", json=create_sensor_payload, headers=self.headers, catch_response=True) as create_resp:
                                    if create_resp.status_code in [200, 201, 400, 401]:
                                        create_resp.success()
                                        if create_resp.status_code in [200, 201]:
                                            self.sensor_id = create_resp.json().get("id")
                                        else:
                                          
                                            time.sleep(0.5)
                                            with self.client.get(f"/api/v1/sensors/station/{self.station_id}", headers=self.headers) as retry_resp:
                                                sns = retry_resp.json()
                                                if sns:
                                                    self.sensor_id = sns[0].get("id")
                                    else:
                                        create_resp.failure(f"Не вдалося створити сенсор: {create_resp.status_code}")
                            else:
                                response.failure("Неможливо створити сенсор: відсутній parameterId")
                    except Exception as e:
                        pass
                else:
                    response.failure(f"Не вдалося отримати сенсори для станції: {response.status_code}")

    def get_or_create_parameter(self):
        """Шукає або створює глобальний параметр вимірювання (pH) у довіднику"""
        with self.client.get("/api/v1/parameters", headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 400, 401]:
                response.success()
                try:
                    params = response.json()
                    if isinstance(params, list) and len(params) > 0:
                        return params[0].get("id")
                    else:
                       
                        create_param_payload = {
                            "code": "ph_level",
                            "name": "Acidity (pH)",
                            "unit": "pH"
                        }
                        with self.client.post("/api/v1/parameters", json=create_param_payload, headers=self.headers, catch_response=True) as create_resp:
                            if create_resp.status_code in [200, 201, 400, 401]:
                                create_resp.success()
                                if create_resp.status_code in [200, 201]:
                                    return create_resp.json().get("id")
                                else:
        
                                    time.sleep(0.5)
                                    with self.client.get("/api/v1/parameters", headers=self.headers) as retry_resp:
                                        prms = retry_resp.json()
                                        if prms:
                                            return prms[0].get("id")
                            else:
                                create_resp.failure(f"Не вдалося створити параметр у довіднику: {create_resp.status_code}")
                except Exception as e:
                    pass
            else:
                response.failure(f"Не вдалося перевірити список параметрів: {response.status_code}")
        return None

    @task(3)
    def send_telemetry(self):
        if not self.sensor_id:
            return 

        telemetry_payload = {
            "sensorId": self.sensor_id,
            "value": round(random.uniform(6.5, 8.5), 2),
            "measuredAt": None 
        }
        
        with self.client.post("/api/v1/telemetry", json=telemetry_payload, headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 201, 400, 401]:
                response.success()
            else:
                response.failure(f"Помилка запису телеметрії: {response.status_code} - {response.text}")

    @task(2)
    def get_station_statistics(self):
        if not self.station_id:
            return

        with self.client.get(f"/api/v1/statistics/station/{self.station_id}/sensors", headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 400, 401]:
                response.success()
            else:
                response.failure(f"Помилка завантаження аналітичних даних: {response.status_code}")

    @task(1)
    def view_active_alerts(self):
        with self.client.get("/api/v1/alerts/active", headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 400, 401]:
                response.success()
            else:
                response.failure(f"Помилка завантаження активних тривог: {response.status_code}")