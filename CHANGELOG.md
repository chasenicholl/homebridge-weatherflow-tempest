# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/).

## v2.1.9
* Update accessory initialization to align with new `config.json` format.
* Ensure that any `config.json` changes are picked up during plugin startup and `accessory.context` is updated.

## v2.1.8
* Revise `platform.ts` and `tempestAPI.ts` to determine `tempest_device_id` once on plugin startup.
* Change `node-version` to `[14.x, 16.x, 18.x]` in `build.yml`. Homebridge only supports even node versions.

## v2.1.7
* Add option to display metric or standard units for barometric, wind, and precipitation sensors. Note that C/F preference is set by Homebridge UI or HomeKit settings.
* Update `config.schema.json` and `README.md` form metric/standard units. 

## v2.1.6
* Correct occupancy sensor units. REST API reports in metric, plug-in displays in standard units.

## v2.1.5
* Correct wind and precipitation sensor units. REST API reports in metric, plug-in displays in standard units.

## v2.1.4
* Change `fan` speed calculation to round the `wind_avg` value rather than truncate to improve reporting of wind speed.
* Add additional screenshots for Wiki.
* Minor updates to README.md.

## v2.1.3
* Add screenshots folder and content for Wiki.
* Update README.md.

## v2.1.2
* Correct units for `UV Index` and round `value` to 1 decimal place.
* Update `README.md`.

## v2.1.1
* Update `config.schema.json` sensors to limit `value_key` dropdown options that are associated with the `sensor_type`.
* Update `platformAccessory.ts` to use `sensor_properties.value_key` for each sensor type.

## v2.1.0
* Add `barometric_pressure`, `precip`, `precip_accum_local_day`, `solar radiation` and `uv` as `occupancy sensors` which display the numerical value of the characteristic as part of the occupancy sensor name. Trip levels can be set for each occupancy sensor.
* Change PlatformAccessory SerialNumber from `000` to `station_id`.
* Add battery level to `air_temperature` Temperature sensor.
* Add functionality to unregister deleted or renamed sensors. Renamed sensors will be added as new sensor.
* Update `config.schema.json` with new functionality and to provide drop-down for available `value_key` options. 
* Update `README.md` with new functionality, clarifying `sensor_type` and associated `value_key` options, provide typical trip values.

## v2.0.1
Updates to address runtime errors:
* `platform.ts`:
  * Add check in sampling loop for undefined `observation_data`.
  * Add explicit `promise` return types.
  * Add `wind_chill` and `dew_point` to `observation_data` as additional temperature `characteristics`.
* `platformAccessory.ts`:
  * Add maximum check of `100000` in `getCurrentLux` function.
* `tempestApi.ts`:
  * Add server status checking to `getStationObservation` function.
  * Change `public async getStationCurrentObservation(retry_count = 0)` to `public async getStationCurrentObservation(retry_count: number)` and update function calls in `platform.ts` to start the loop at `0`.
  * Make explicit `retry_count` incrementing.
  * Add `wind_chill` and `dew_point` to `observation_data` as additional temperature `characteristics`.

Additional updates:
* `package.json`:
  * Update `axios` to latest version.
  * Add additional `keywords`.
* Add `CHANGELOG.md` file.
