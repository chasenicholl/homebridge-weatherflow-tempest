import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';
import * as dgram from 'dgram';
import https from 'https';


axios.defaults.timeout = 10000; // same as default interval
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });


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
  barometric_pressure: number;     // mbar
  precip: number;                  // mm/min (minute sampling)
  precip_accum_local_day: number;  // mm
  wind_direction: number;          // degrees
  solar_radiation: number;         // W/m^2
  uv: number;                      // Index

  brightness: number;              // Lux
}


export class TempestSocket {

  private log: Logger;
  private s: dgram.Socket;
  private data: object | undefined;
  private tempest_battery_level: number;

  constructor(log: Logger) {

    this.log = log;
    this.data = undefined;
    this.tempest_battery_level = 0;
    this.s = dgram.createSocket('udp4');

    this.log.info('TempestSocket initialized.');

  }

  public start(address = '0.0.0.0', port = 50222) {

    this.setupSocket(address, port);
    this.setupSignalHandlers();

  }

  private setupSocket(address: string, port: number) {

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

    if (data.type === 'obs_st') {
      this.setTempestData(data);
    }

  }

  private setTempestData(data: any): void {

    const obs = data.obs[0];
    // const windLull = (obs[1] !== null) ? obs[1] * 2.2369 : 0;
    const windSpeed = (obs[2] !== null) ? obs[2] * 2.2369 : 0;
    const windGust = (obs[3] !== null) ? obs[3] * 2.2369 : 0;
    this.data = {
      air_temperature: obs[7],
      feels_like: obs[7],
      wind_chill: obs[7],
      dew_point: obs[7] - ((100 - obs[8]) / 5.0), // Td = T - ((100 - RH)/5.)
      relative_humidity: obs[8],
      wind_avg: windSpeed,
      wind_gust: windGust,
      barometric_pressure: obs[6],
      precip: obs[12],
      precip_accum_local_day: obs[12],
      wind_direction: obs[4],
      solar_radiation: obs[11],
      uv: obs[10],
      brightness: obs[9],
    };
    this.tempest_battery_level = Math.round((obs[16] - 1.8) * 100); // 2.80V = 100%, 1.80V = 0%

  }

  private setupSignalHandlers(): void {

    process.on('SIGTERM', () => {
      this.log.info('Got SIGTERM, shutting down Tempest Homebridge...');
      this.s.close();
    });

    process.on('SIGINT', () => {
      this.log.info('Got SIGINT, shutting down Tempest Homebridge...');
      this.s.close();
    });

  }

  public hasData(): boolean {
    return this.data !== undefined;
  }

  public getStationCurrentObservation(): Observation {
    return this.data as Observation;
  }

  public getBatteryLevel(): number {
    return this.tempest_battery_level;
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

  private async getStationObservation(): Promise<AxiosResponse | undefined> {

    let observation: AxiosResponse | undefined;

    const url = `https://swd.weatherflow.com/swd/rest/observations/station/${this.station_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status >= 200 && status < 300, // Default
    };

    await axios.get(url, options)
      .then(response => {
        observation = response.data['obs'][0];
      })

      .catch(exception => {
        this.log.warn(`[WeatherFlow] ${exception}`);
      });

    return observation;

  }

  private async delay(ms: number): Promise<unknown> {

    return new Promise(resolve => setTimeout(resolve, ms));

  }

  public async getStationCurrentObservation(retry_count: number) {

    if (retry_count === this.max_retries) {
      this.log.error(`Reached max API retries: ${this.max_retries}. Stopping.`);
      return;
    }

    const observation = await this.getStationObservation();

    if (observation === undefined) {
      this.log.warn('Response missing "obs" data.');

      if (this.data !== undefined) {
        this.log.warn('Returning last cached response.');
        return this.data;

      } else {
        this.log.warn(`Retrying ${retry_count + 1} of ${this.max_retries}. No cached "obs" data.`);
        retry_count += 1;
        await this.delay(1000 * retry_count);
        return this.getStationCurrentObservation(retry_count);
      }

    } else {

      this.data = observation;
      return this.data;

    }

  }

  public async getTempestBatteryLevel(device_id): Promise<number> {

    const url = `https://swd.weatherflow.com/swd/rest/observations/device/${device_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status >= 200 && status < 300, // Default
    };

    await axios.get(url, options) // assumes single Tempest station
      .then(response => {
        const tempest_battery_voltage = response.data.obs[0][16];
        this.tempest_battery_level = Math.round((tempest_battery_voltage - 1.8) * 100); // 2.80V = 100%, 1.80V = 0%
      })

      .catch(exception => {
        this.log.warn(`[WeatherFlow] ${exception}`);
      });

    return this.tempest_battery_level;

  }

  public async getTempestDeviceId(): Promise<number> {

    const url = `https://swd.weatherflow.com/swd/rest/stations/${this.station_id}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      validateStatus: (status: number) => status >= 200 && status < 300, // Default
    };

    await axios.get(url, options) // assumes single hub with single Tempest station
      .then(response => {
        this.tempest_device_id = response.data.stations[0].devices[1].device_id;
      })

      .catch(exception => {
        this.log.warn(`[WeatherFlow] ${exception}`);
      });

    return this.tempest_device_id;

  }

}
