
<p align="center">
<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
<br />
<img src="https://weatherflow.com/wp-content/uploads/2016/05/Tempest-powered-by-01.svg" width="250">
</p>

# Homebridge WeatherFlow Tempest Plugin

Homebridge Plugin providing basic WeatherFlow Tempest support. Including Temperature Sensor, Humidity Sensor, Light Sensor and Fan (Wind Speed).

### Setup and Parameters

You will need to create an account at https://tempestwx.com/ and then generate a Personal Use Token https://tempestwx.com/settings/tokens.

- `name`: _(Required)_ Must always be set to `WeatherFlow Tempest Platform`.
- `token`: _(Required)_ Oauth2 Personal Use Token, create via your tempestwx account.
- `station_id`: _(Required)_ The station ID you are pulling weather data from.
- `interval`: _(Required)_ How often to poll the Tempest REST API. Default 10 seconds. Minimum every second.
- `sensors`: _(Required)_ An array of sensors to create. This is dynamic incase you want to target different temperature or wind speed attributes.
- `sensors.name`: _(Required)_ Display name of Sensor in Apple Home.
- `sensors.sensor_type`: _(Required)_ The type of Home Sensor to create. There are 4 options ["Temperature Sensor", "Light Sensor", "Humidity Sensor", "Fan"].
- `sensors.value_key`: _(Required)_ Which REST API response body key to target for its value. If you'd like to use different temperature or wind speeds. You can find the available keys here: https://weatherflow.github.io/Tempest/api/swagger/#!/observations/getStationObservation.

#### Config Example

```json
{
  "name": "WeatherFlow Tempest Platform",
  "token": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "station_id": "10000",
  "interval": 10,
  "sensors": [
    {
      "name": "Outside Temperature",
      "sensor_type": "Temperature Sensor",
      "value_key": "air_temperature"
    },
    {
       "name": "Outside Relative Humidity",
       "sensor_type": "Humidity Sensor",
       "value_key": "relative_humidity"
    },
    {
       "name": "Outside Light Level",
       "sensor_type": "Light Sensor",
       "value_key": "brightness"
    },
    {
       "name": "Outside Wind Speed",
       "sensor_type": "Fan",
       "value_key": "wind_avg"
    },
  ],
  "platform": "WeatherFlowTempest"
}
```