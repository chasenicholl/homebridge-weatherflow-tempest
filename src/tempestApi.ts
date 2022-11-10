import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';

export interface Observation {
  air_temperature: number;
  feels_like: number;
  relative_humidity: number;
  wind_avg: number;
  wind_gust: number;
  wind_direction: number;
  brightness: number;
}

export class TempestApi {

  private log: Logger;
  private token: string;
  private station_id: string;
  private data: object | undefined;
  private readonly max_retries: number = 30;

  constructor(token: string, station_id: string, log: Logger) {

    this.log = log;
    this.token = token;
    this.station_id = station_id;
    this.data = undefined;

    this.log.info('TempestApi initialized.');

  }

  private async getStationObservation() {

    try {
      const url = `https://swd.weatherflow.com/swd/rest/observations/station/${this.station_id}`;
      const headers = {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      };
      return await axios.get(url, {headers: headers, responseType: 'json'});
    } catch(exception) {
      this.log.debug(`[WeatherFlow] ${exception}`);
    }

  }

  private async delay(ms: number) {

    return new Promise(resolve => setTimeout(resolve, ms));

  }

  public async getStationCurrentObservation(retry_count = 0) {

    if (retry_count === this.max_retries) {
      this.log.error(`Reached max API retries: ${this.max_retries}. Stopping.`);
      return;
    }

    const response: AxiosResponse | undefined = await this.getStationObservation();
    if (!response || !response.data || !('obs' in response.data)) {
      this.log.warn('Response missing "obs" data.');
      if (this.data !== undefined) {
        this.log.warn('Returning last cached response.');
        return this.data;
      }
      this.log.warn(`Retrying ${retry_count + 1} of ${this.max_retries}. No cached "obs" data.`);
      await this.delay(1000 * retry_count);
      return await this.getStationCurrentObservation(retry_count + 1);
    } else {
      this.data = response.data['obs'][0];
      return this.data;
    }

  }

}
