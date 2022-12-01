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

  private isResponseGood(response: AxiosResponse) {

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

  public async getStationCurrentObservation(retry_count = 0) {

    if (retry_count === this.max_retries) {
      this.log.error(`Reached max API retries: ${this.max_retries}. Stopping.`);
      return;
    }

    const response: AxiosResponse | undefined = await this.getStationObservation();
    if (!response || !this.isResponseGood(response as AxiosResponse)) {
      this.log.warn('Response missing "obs" data.');
      if (this.data !== undefined) {
        this.log.warn('Returning last cached response.');
        return this.data;
      }
      this.log.warn(`Retrying ${retry_count + 1} of ${this.max_retries}. No cached "obs" data.`);
      await this.delay(1000 * retry_count);
      return await this.getStationCurrentObservation(retry_count + 1);
    } else {
      if (typeof response.data === 'string') {
        response.data = JSON.parse(response.data);
      }
      this.data = response.data['obs'][0];
      return this.data;
    }

  }

}
