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