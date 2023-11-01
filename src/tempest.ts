import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';
import * as dgram from 'dgram';

export interface Observation {
  // temperature sensors
  air_temperature: number;         // C, displayed according to Homebridge and HomeKit C/F settings
  feels_like: number;
  wind_chill: number;
  dew_point: number;

  // humidity sensor
  relative_humidity: number;       // %

  // fan and motion sensor
  wind_avg: number;                // m/s, used for Fan speed %
  wind_gust: number;               // m/s, used for motion sensor

  // occupancy sensors
  barometric_pressure: number;     // mb
  precip: number;                  // mm/min (minute sampling)
  precip_accum_local_day: number;  // mm
  wind_direction: number;          // degrees
  solar_radiation: number;         // W/m^2
  uv: number;                      // Index

  brightness: number;              // Lux
}

export interface SocketObservation {

  timestamp: number;
  windLull: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  pressure: number;
  temperature: number;
  humidity: number;
  illumination: number;
  uvIndex: number;
  solarRadiation: number;
  rain: number;
  strikes: number;
  lightningDistance: number;
  reportingInterval: number;

}


export class TempestSocket {

  private log: Logger;
  private s: dgram.Socket;

  constructor(log: Logger, address = '0.0.0.0', port = 50222) {

    this.log = log;
    this.s = dgram.createSocket('udp4');
    this.setupSocket(address, port);
    this.setupSignalHandlers();
  }

  private setupSocket(address: string, port: number) {

    // this.s.setsockopt(dgram.SOL_SOCKET, dgram.SO_REUSEADDR, 1);
    // this.s.setsockopt(dgram.SOL_SOCKET, dgram.SO_REUSEPORT, 1);
    this.s.bind({ address: address, port: port });
    this.s.on('message', (msg) => {
      try {
        const message_string = msg.toString('utf-8');
        const data = JSON.parse(message_string);
        this.processReceivedData(data);
      } catch (error) {
        this.log.warn('JSON processing of data failed');
        this.log.error(error as string);
      }
    });

    this.s.on('error', (err) => {
      this.log.error('Socket error:', err);
    });

  }

  private processReceivedData(data: any) {
    // if (data.type === 'obs_air') {
    //   console.log(data);
    //   // air_tm = this.air_data(data, air_tm);
    // }

    if (data.type === 'obs_st') {
      // console.log(data);
      this.parseTempestData(data);
      // st_tm = this.tempest_data(data, st_tm);
    }

    // if (data.type === 'obs_sky') {
    //   console.log(data);
    //   // sky_tm = this.sky_data(data, sky_tm);
    // }
  }

  private parseTempestData(data: any): SocketObservation {
    const obs = data.obs[0];
    const windLull = (obs[1] !== null) ? obs[1] * 2.2369 : 0;
    const windSpeed = (obs[2] !== null) ? obs[2] * 2.2369 : 0;
    const windGust = (obs[3] !== null) ? obs[3] * 2.2369 : 0;
    return {
      timestamp: obs[0],
      windLull: windLull,
      windSpeed: windSpeed,
      windGust: windGust,
      windDirection: obs[4],
      pressure: obs[6],
      temperature: obs[7],
      humidity: obs[8],
      illumination: obs[9],
      uvIndex: obs[10],
      solarRadiation: obs[11],
      rain: parseFloat(obs[12]),
      strikes: obs[14],
      lightningDistance: obs[15],
      reportingInterval: obs[17],
    } as SocketObservation;

  }

  private setupSignalHandlers() {

    process.on('SIGTERM', () => {
      this.log.info('Got SIGTERM, shutting down Tempest Homebridge...');
    });

    process.on('SIGINT', () => {
      this.log.info('Got SIGINT, shutting down Tempest Homebridge...');
      this.s.close();
    });

  }

}

export class TempestApi {

  private log: Logger;
  private token: string;
  private station_id: string;
  private data: object | undefined;
  private tempest_device_id: number;
  private tempest_battery_level: number;
  private readonly max_retries: number = 30;

  constructor(token: string, station_id: string, log: Logger) {

    this.log = log;
    this.token = token;
    this.station_id = station_id;
    this.data = undefined; // last sample of Observation data
    this.tempest_device_id = 0;
    this.tempest_battery_level = 0;

    this.log.info('TempestApi initialized.');

  }

  private async getStationObservation() {

    try {
      const url = `https://swd.weatherflow.com/swd/rest/observations/station/${this.station_id}`;
      const options = {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        validateStatus: (status: number) => status < 500, // Resolve only if the status code is less than 500
      };
      return await axios.get(url, options);
    } catch(exception) {
      this.log.debug(`[WeatherFlow] ${exception}`);
      return;
    }

  }

  private async delay(ms: number): Promise<unknown> {

    return new Promise(resolve => setTimeout(resolve, ms));

  }

  private isResponseGood(response: AxiosResponse): boolean {

    try {
      if (!response || !response.data) {
        return false;
      } else if (typeof response.data === 'string') {
        return ('obs' in JSON.parse(response.data));
      } else {
        return ('obs' in response.data);
      }
    } catch(exception) {
      this.log.error(exception as string);
      return false;
    }

  }

  public async getStationCurrentObservation(retry_count: number) {

    if (retry_count === this.max_retries) {
      this.log.error(`Reached max API retries: ${this.max_retries}. Stopping.`);
      return;
    }

    const response = await this.getStationObservation();
    if (!response || !this.isResponseGood(response)) {
      this.log.warn('Response missing "obs" data.');
      if (this.data !== undefined) {
        this.log.warn('Returning last cached response.');
        return this.data;
      }
      this.log.warn(`Retrying ${retry_count + 1} of ${this.max_retries}. No cached "obs" data.`);
      retry_count += 1;
      await this.delay(1000 * retry_count);
      return await this.getStationCurrentObservation(retry_count);
    } else {
      if (typeof response.data === 'string') {
        response.data = JSON.parse(response.data);
      }
      this.data = response.data['obs'][0];
      return this.data;
    }

  }

  public async getTempestBatteryLevel(device_id): Promise<number> {

    const url = `https://swd.weatherflow.com/swd/rest/observations/device/${device_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status < 500, // Resolve only if the status code is less than 500
    };

    await axios.get(url, options) // assumes single Tempest station
      .then(response => {
        const tempest_battery_voltage = response.data.obs[0][16];
        this.tempest_battery_level = Math.round((tempest_battery_voltage - 1.8) * 100); // 2.80V = 100%, 1.80V = 0%
      })

      .catch(exception => {
        this.log.debug(`[WeatherFlow] ${exception}`);
      });

    return this.tempest_battery_level;

  }

  public async getTempestDeviceId(): Promise<number> {

    const url = `https://swd.weatherflow.com/swd/rest/stations/${this.station_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status < 500, // Resolve only if the status code is less than 500
    };

    await axios.get(url, options) // assumes single hub with single Tempest station
      .then(response => {
        this.tempest_device_id = response.data.stations[0].devices[1].device_id;
      })

      .catch(exception => {
        this.log.debug(`[WeatherFlow] ${exception}`);
      });
    return this.tempest_device_id;

  }

}
