# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/).

## v4.1.0
* Confirm plug-in operation with Homebridge 2.0.0. Updated package.json per homebridge instructions.
* Update `config.schema.json` to require `station_id` for both `http_api` and `local_api`. Update associated code in `platform.ts`.
* Update `@types/node` to "^22.0.0"
* Update `@typescript-eslint/eslint-plugin` to "^8.0.0"
* Update `@typescript-eslint/parser` to "^8.0.0"
* Update `eslint` to "^9.0.0".
* Update `rimraf` to "^6.0.1"
* Update `axios` to "1.7.7

## v4.0.2
* When using HTTP API, check that `token` and `station_id` are present and have valid characteristics.
* When Local API is used, `token` and `station_id` are not required and are not validated. 
* User is able to switch between HTTP API to Local API and back to HTTP API without the need to re-enter `token` and `station_id` as these are retained in the config.sys file.

## v4.0.1
* Check that `station_id` length is more than one character when initializing plugin in Local API mode.
* Update axios to v1.6.2 to address moderate severity vulnerability.

## v4.0.0
* Added Local UDP API support! Now you can choose to listen to your Weather Stations observations directly over your local network. No Station ID or API Token needed. 
    * To use the local API add `local_api`: `true` or `false` to your top level configuration. 
    * Observations are broadcasted every 60 seconds. 
    * Leverages the `obs_st` message. See [documentation](https://weatherflow.github.io/Tempest/api/udp/v171/) for more information.
    * `precip_accum_local_day` not available with local API

## v3.0.3
* Update node-version: [18.x, 20.x], remove 16.x which is no longer supported by homebridge.
* Reformated `getStationObservation()` and `getStationCurrentObservation()` in `tempestApi.ts`.
* Addresses `observation_data is undefined, skipping update` error in `platform.ts` polling loop.

## v3.0.2
* Update node-version: [16.x, 18.x, 20.x], remove 14.x which is no longer supported by homebridge.
* Update `devDependencies` and `dependencies` to latest versions. Update/lock `axios` to version `1.5.1`.
* Updates to `tempestApi.ts`:
  * Add `import https from 'https';`
  * Add `axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });`
  * Add `axios.defaults.timeout = 10000;`
  * Add explicit `Promise` returns to `getStationObservation`
  * Change `validateStatus` from `<500` to `>= 200 && status < 300` for `axios.get` calls
  * Delete `isResponseGood` function as additional `obs` parsing is not required.
  * Refactor `getStationCurrentObservation` so that retry loop is executed.
* Updates to `package.ts`:
  * Revise `setInterval` loop to make use of `async/await`.

## v3.0.1
* Update `config.schema.json` to include sensor `name` field.
* Add cautionary note to `README.md` when upgrading from a previous version of the plugin.

## v3.0.0
* New version providing additional functionality using `occupancy sensors` to display the Tempest sensor values. <br><u>NOTE:</u> There is a current limitation as HomeKit accessory names are set when the accessory is initially added and cannot be dynamically updated. The accessories are correctly displayed and updated in the Homebridge "Accessories" tab of the webpage interface. This version is not backwards compatible.

* Update supported `node-versions` to `[14.x, 16.x, 18.x]` in per homebridge guidelines.
* Add functionality to unregister deleted or renamed sensors. Renamed sensors will be added as new sensor and prior version deleted.

* Add `barometric_pressure`, `precip`, `precip_accum_local_day`, `solar radiation` and `uv` as `occupancy sensors` which display the numerical value of the characteristic as part of the occupancy sensor name. Trip levels can be set for each occupancy sensor.
* Add battery level to `air_temperature` Temperature sensor.
* Change PlatformAccessory SerialNumber from `000` to `station_id`.
* Correct occupancy sensor units. REST API reports in metric, plug-in displays in standard units.
* Correct `fan` speed units and calculation to round the `wind_avg` value rather than truncate to improve reporting of wind speed.
* Revise `platform.ts` and `tempestApi.ts` to determine `tempest_device_id` once on plugin startup.
* Update `platformAccessory.ts` to use `sensor_properties.value_key` for each sensor type.

* Update `config.schema.json` with new functionality to provide drop-down for available `value_key` options that are associated with the `sensor_type`. Add option to display metric or standard units for barometric, wind, and precipitation sensors. Note that C/F preference is set by Homebridge UI or HomeKit settings.
* Ensure that any `config.schema.json` changes are picked up during plugin startup and `accessory.context` is updated.

* Update `README.md` with new functionality, clarifying `sensor_type` and associated `value_key` options, provide typical trip values, and to provide additional details and `occupancy_sensor` limitations.

* Add screenshots folder and content for Wiki.

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
