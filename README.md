# Shoreline Grafana Data Source

[![Build](https://github.com/grafana/grafana-starter-datasource/workflows/CI/badge.svg)](https://github.com/grafana/grafana-starter-datasource/actions?query=workflow%3A%22CI%22)

View [Shoreline metrics](https://docs.shoreline.io/metrics) in Grafana.

## Installation
* Provide Shoreline API URL (of the form `https://<customer>.<region>.api.shoreline-<cluster>.io`)
* Provide Shoreline API Key:
    * See [Shoreline Docs](https://docs.shoreline.io/administration/access-control#manage-api-tokens) for more information
    * It is recommended to set `Execute actions` and `Execute Linux cmds` to `0` for the user for which the token is generated
