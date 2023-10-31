import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';
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
