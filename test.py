import json
import socket


def open_socket_connection():

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
    s.bind(("0.0.0.0", 50222))

    stopped = False
    try:
        while not stopped:
            try:
                hub = s.recvfrom(1024)
                data = json.loads(hub[0].decode("utf-8")) # hub is a truple (json, ip, port)
            except json.JSONDecodeError:
                print("JSON processing of data failed")
                continue

            if (data["type"] == "obs_air"):
                print(data)
                # air_tm = self.air_data(data, air_tm)

            if (data["type"] == "obs_st"):
                print(data)
                parse_tempest_data(data)
                # st_tm = self.tempest_data(data, st_tm)

            if (data["type"] == "obs_sky"):
                print(data)
                # sky_tm = self.sky_data(data, sky_tm)
    except KeyboardInterrupt:
        print("Keyboard Interupt")
    s.close()


def parse_tempest_data(data):
    timestamp = data['obs'][0][0]  # ts
    # convert wind speed from m/s to MPH
    if (data["obs"][0][1] is not None):
        wind_lull = data["obs"][0][1] * 2.2369 # wind lull
    else:
        wind_lull = 0
    if (data["obs"][0][2] is not None):
        wind_speed = data["obs"][0][2] * 2.2369 # wind speed
    else:
        wind_speed = 0
    if (data["obs"][0][3] is not None):
        wind_gust = data["obs"][0][3] * 2.2369 # wind gust
    else:
        wind_gust = 0
    wind_direction = data['obs'][0][4]  # wind direction
    pressure = data['obs'][0][6]   # pressure
    temperature = data['obs'][0][7]   # temp
    humidity = data['obs'][0][8]   # humidity
    illumination = data['obs'][0][9]  # Illumination
    uv_index = data['obs'][0][10] # UV Index
    solar_radiation = data['obs'][0][11] # solar radiation
    rain = float(data['obs'][0][12])  # rain
    strikes = data['obs'][0][14] # strikes
    lightening_distance = data['obs'][0][15] # distance
    reporting_interval = data['obs'][0][17] # reporting interval


def main():
    open_socket_connection()


if __name__ == "__main__":
    main()