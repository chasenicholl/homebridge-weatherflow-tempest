import { Logger } from 'homebridge';
import axios, { AxiosResponse } from 'axios';

interface StationUnits {
  units_temp: string;
  units_wind: string;
  units_precip: string;
}

interface Observation {
  air_temperature: number;
  feels_like: number;
  relative_humidity: number;
  wind_avg: number;
  wind_gust: number;
  wind_direction: number;
  brightness: number;
}

export interface TempestObservation {
  station_units: StationUnits;
  obs: Array<Observation>;
}

export class TempestApi {

  private log: Logger;
  private token: string;
  private station_id: string;

  constructor(token: string, station_id: string, log: Logger) {

    this.log = log;
    this.token = token;
    this.station_id = station_id;

    this.log.info('TempestApi initialized.');

  }

  public async getStationCurrentObservation() {

    const url = `https://swd.weatherflow.com/swd/rest/observations/station/${this.station_id}`;
    try {
      const body: AxiosResponse = await axios.get(
        url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json',
          },
          responseType: 'json',
        },
      );
      this.log.debug(`[WeatherFlow] Response Code: ${body.status.toString()}`);
      return body.data;
    } catch(exception) {
      this.log.debug(`[WeatherFlow] ${exception}`);
    }

  }

}
