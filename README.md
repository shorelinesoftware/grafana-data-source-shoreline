# Shoreline Grafana Data Source

[![Build](https://github.com/grafana/grafana-starter-datasource/workflows/CI/badge.svg)](https://github.com/grafana/grafana-starter-datasource/actions?query=workflow%3A%22CI%22)

View [Shoreline metrics](https://docs.shoreline.io/metrics) in Grafana.

## Installation
* Provide Shoreline API URL (of the form `https://<customer>.<region>.api.shoreline-<cluster>.io`)
* Provide Shoreline API Key:
    * See [Shoreline docs on API tokens](https://docs.shoreline.io/administration/access-control#manage-api-tokens) for more information
    * It is recommended to set `Execute actions` and `Execute Linux cmds` to `0` for the user for which the token is generated

## Development
* From the root of the repository, run:
    * `yarn`
    * `yarn dev`
* Install [Docker](https://docs.docker.com/get-docker/)
* Run:
    * `docker pull grafana/grafana:8.4.7`
    * `docker run -e GF_DEFAULT_APP_MODE=development -d -p 3000:3000 -v "$(pwd)"/:/var/lib/grafana/plugins --name=grafana grafana/grafana:8.4.7`
* In browser:
    * Go to `localhost:3000`
    * Enter `admin` as username and password
    * Click on the gear icon in the left side panel and then on "Data sources"
    * Search for "shoreline"
    * Add API Url and auth token
    * Click on plus icon in the left side panel, then "Dashboard", then "Add an empty panel", and then select `host` from the resource query drop down and `cpu_usage` from the metric query dropdown
    * Click on the refresh icon in the top right of the page, the graph should have data
* To see local changes in browser:
    * Run:
        * `yarn dev`
        * `docker restart grafana`
    * `yarn watch` can also be used, but the docker container will still need to be restarted
