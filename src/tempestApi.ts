import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';

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

  private async getTempestDeviceId(): Promise<number> {

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
