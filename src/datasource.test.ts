import { jest } from '@jest/globals';

import { AnnotationQueryRequest, dateTime, DataQueryRequest } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { DataSource } from './datasource';
import { MyQuery, MyVariableQuery } from './types';

jest.mock('@grafana/runtime', () => ({
  ...(jest.requireActual('@grafana/runtime') as any),
  getBackendSrv: jest.fn(() => ({
    datasourceRequest: () => {}
  })),
  getTemplateSrv: () => ({
    replace: (val: string): string => val
  })
}));

describe('Shoreline datasource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when performing testDatasource call', () => {
    it('should return success on expected response', async () => {
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: () => Promise.resolve({ data: { resources: [] } })
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.testDatasource();
      expect(result.status).toEqual('success');
      expect(result.message).toEqual('Success');
    });

    it('should return error is response is missing expected data', async () => {
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: () => Promise.resolve({ data: {} })
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.testDatasource();
      expect(result.status).toEqual('error');
      expect(result.message).toEqual('Health check test query failed, response data: {}');
    });
  });

  describe('when performing query call', () => {
    it('should return expected frames on empty query', async () => {
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: () => Promise.resolve({ data: { metric_query: [] } })
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.query({
        targets: []
      } as any as DataQueryRequest<MyQuery>);
      expect(result.data).toEqual([]);
    });

    it('should return expected frames on simple query', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            metric_query: [
              {
                group_infos: [
                  {
                    group: 'METRIC',
                    name: '',
                    value: 'cpu_usage'
                  },
                  {
                    group: 'RESOURCE',
                    name: '',
                    value: '1'
                  }
                ],
                metric: {
                  values: [3],
                  timestamps: [1000],
                  tags: {},
                  sampling_resolution: 0,
                  resource_name: '1',
                  origin: '',
                  name: 'cpu_usage',
                  metadata_id: 0,
                  labels: {}
                }
              }
            ],
            resources: [
              {
                type: 'HOST',
                tags: [
                  {
                    value: 'linux',
                    key: 'kubernetes.io/os'
                  }
                ],
                parent: '',
                name: 'i-07495dacd87d73a63',
                id: 1,
                attributes: [
                  {
                    value: '5051',
                    key: 'port'
                  }
                ]
              }
            ]
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.query({
        targets: [{ refId: 'A', resourceQueryText: 'host', metricQueryText: 'cpu_usage' }],
        range: { from: dateTime(1000), to: dateTime(2000) }
      } as any as DataQueryRequest<MyQuery>);
      expect(result.data.length).toEqual(1);
      expect(result.data[0].name).toEqual('cpu_usage: i-07495dacd87d73a63');

      const timestamps = result.data[0].fields[0];
      expect(timestamps.name).toEqual('Time');
      expect(timestamps.type).toEqual('time');
      expect(timestamps.values.length).toEqual(1);
      expect(timestamps.values.buffer[0]).toEqual(1000);

      const values = result.data[0].fields[1];
      expect(values.name).toEqual('Value');
      expect(values.type).toEqual('number');
      expect(values.values.length).toEqual(1);
      expect(values.values.buffer[0]).toEqual(3);

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'host | cpu_usage | from=1000 | to=2000'
      );
    });
  });

  describe('when performing metricFindQuery call', () => {
    it('should return resource names on resource query', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            resources: [
              {
                type: 'HOST',
                tags: [
                  {
                    value: 'linux',
                    key: 'kubernetes.io/os'
                  }
                ],
                parent: '',
                name: 'i-07495dacd87d73a63',
                id: 1,
                attributes: [
                  {
                    value: '5051',
                    key: 'port'
                  }
                ]
              }
            ]
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'host'
      } as any as MyVariableQuery);
      expect(result[0].text).toEqual('i-07495dacd87d73a63');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual('host');
    });

    it('should return symbol names on list symbol', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            list_type: {
              symbol: [
                {
                  attributes: {
                    description: 'All pods',
                    name: 'pods',
                    params: '',
                    read_only: 'true',
                    res_env_var: '',
                    resource_query: '',
                    resource_type: '',
                    shell: '',
                    timeout: '',
                    type: 'RESOURCE',
                    units: '',
                    user: '',
                    value: 'resources(type="POD")'
                  },
                  formula: 'resources(type="POD")',
                  name: 'pods',
                  type: 'RESOURCE'
                },
                {
                  attributes: {
                    description: 'All containers',
                    name: 'containers',
                    params: '',
                    read_only: 'true',
                    res_env_var: '',
                    resource_query: '',
                    resource_type: '',
                    shell: '',
                    timeout: '',
                    type: 'RESOURCE',
                    units: '',
                    user: '',
                    value: 'resources(type="CONTAINER")'
                  },
                  formula: 'resources(type="CONTAINER")',
                  name: 'containers',
                  type: 'RESOURCE'
                }
              ]
            }
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'list resources'
      } as any as MyVariableQuery);
      expect(result.length).toEqual(2);
      expect(result[0].text).toEqual('pods');
      expect(result[1].text).toEqual('containers');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'list resources'
      );
    });

    it('should return list of resources', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            metric_metadata_query: {
              metric_names: ['push_time_seconds'],
              resource_names: ['2', '61', '3', '1'],
              tags: [
                {
                  name: 'instance',
                  values: ['']
                },
                {
                  name: 'job',
                  values: ['beam_service', 'resource_manager', 'oplang_service', 'db_server']
                },
                {
                  name: 'resource_manager',
                  values: ['resource_manager_server']
                },
                {
                  name: 'oplang_service',
                  values: ['oplang_server']
                },
                {
                  name: 'key',
                  values: ['ops_agent']
                },
                {
                  name: 'value',
                  values: ['beam_metrics']
                },
                {
                  name: 'db_service',
                  values: ['db_server']
                }
              ]
            }
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'metric_metadata_query(metric_name="push_time_seconds")'
      } as any as MyVariableQuery);
      expect(result.length).toEqual(4);
      expect(result[0].text).toEqual('2');
      expect(result[1].text).toEqual('61');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'metric_metadata_query(metric_name="push_time_seconds")'
      );
    });

    it('should return list of tags', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            metric_metadata_query: {
              metric_names: ['push_time_seconds'],
              resource_names: ['2', '61', '3', '1'],
              tags: [
                {
                  name: 'job',
                  values: ['beam_service', 'resource_manager', 'oplang_service', 'db_server']
                }
              ]
            }
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'metric_metadata_query(metric_name="push_time_seconds", tag_key="job")'
      } as any as MyVariableQuery);
      expect(result.length).toEqual(4);
      expect(result[0].text).toEqual('beam_service');
      expect(result[1].text).toEqual('resource_manager');
      expect(result[2].text).toEqual('oplang_service');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'metric_metadata_query(metric_name="push_time_seconds", tag_key="job")'
      );
    });

    it('should return list of metrics', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            metric_metadata_query: {
              metric_names: [
                'prometheus_sd_kubernetes_workqueue_longest_running_processor_seconds',
                'node_memory_MemTotal_bytes',
                'scraper_service_scrape_loop_scrape_total_seconds_sum',
                'scraper_service_grpc_request_duration_seconds_sum',
                'scraper_service_process_resident_memory_bytes',
                'scraper_service_scrape_loop_scrape_total_seconds_bucket',
                'node_network_receive_drop_total',
                'process_uptime_seconds',
                'scraper_service_process_virtual_memory_max_bytes',
                'statsd_metric_mapper_cache_gets_total',
                'scraper_service_scrape_loop_scrape_total_seconds_count',
                'dbserver_process_resident_memory_bytes',
                'statsd_exporter_loaded_mappings',
                'node_network_transmit_errs_total',
                'statsd_exporter_tcp_connection_errors_total',
                'scraper_service_flush_num_ingestion_dbs',
                'process_resident_memory_bytes',
                'prometheus_sd_failed_configs',
                'node_network_transmit_bytes_total',
                'node_filesystem_avail_bytes',
                'prometheus_sd_kubernetes_events_total',
                'dbserver_process_start_time_seconds',
                'prometheus_sd_kubernetes_http_request_duration_seconds_count',
                'process_virtual_memory_bytes',
                'process_max_fds',
                'node_vmstat_pgmajfault',
                'process_cpu_seconds_total',
                'statsd_it_metric',
                'scraper_service_process_max_fds',
                'process_noio_pagefaults_total',
                'prometheus_sd_kubernetes_workqueue_work_duration_seconds_sum',
                'prometheus_sd_kubernetes_http_request_total',
                'statsd_exporter_lines_total',
                'statsd_exporter_unixgram_packets_total',
                'node_disk_written_bytes_total',
                'dbserver_process_max_fds',
                'prometheus_sd_kubernetes_workqueue_depth',
                'dbserver_process_open_fds',
                'scraper_service_scrape_job_dropped_targets_num',
                'node_filesystem_free_bytes',
                'node_memory_Buffers_bytes',
                'scraper_service_flush_total_take',
                'node_filesystem_size_bytes',
                'node_network_receive_errs_total',
                'statsd_exporter_metrics_total',
                'scraper_service_config_error',
                'node_network_transmit_packets_total',
                'statsd_exporter_tags_total',
                'process_io_pagefaults_total',
                'prometheus_sd_kubernetes_workqueue_latency_seconds_count',
                'scraper_service_process_cpu_seconds_total',
                'statsd_exporter_tag_errors_total',
                'statsd_exporter_samples_total',
                'prometheus_sd_kubernetes_http_request_duration_seconds_sum',
                'prometheus_sd_received_updates_total',
                'node_disk_reads_completed_total',
                'statsd_exporter_tcp_connections_total',
                'push_failure_time_seconds',
                'scraper_service_flush_num_metrics',
                'scraper_service_alarms_num_acprs_computed_in_compiled_mode',
                'process_signals_delivered_total',
                'process_disk_writes_total',
                'scraper_service_scrape_loop_ingested_metrics_num',
                'scraper_service_log_messages_total',
                'node_vmstat_oom_kill',
                'statsd_metric_mapper_cache_length',
                'node_disk_read_bytes_total',
                'dbserver_process_virtual_memory_bytes',
                'dbserver_process_cpu_seconds_total',
                'statsd_exporter_event_queue_flushed_total',
                'process_disk_reads_total',
                'process_voluntary_context_switches_total',
                'process_involuntary_context_switches_total',
                'node_network_receive_packets_total',
                'node_cpu_seconds_total',
                'prometheus_sd_updates_total',
                'node_disk_writes_completed_total',
                'prometheus_sd_discovered_targets',
                'prometheus_sd_kubernetes_workqueue_items_total',
                'process_start_time_seconds',
                'push_time_seconds',
                'statsd_exporter_events_total',
                'node_memory_Cached_bytes',
                'node_network_transmit_drop_total',
                'node_vmstat_pgfault',
                'node_memory_MemFree_bytes',
                'process_threads_total',
                'prometheus_sd_kubernetes_workqueue_latency_seconds_sum',
                'process_max_resident_memory_bytes',
                'scraper_service_grpc_request_duration_seconds_bucket',
                'statsd_exporter_udp_packets_total',
                'scraper_service_process_open_fds',
                'statsd_metric_mapper_cache_hits_total',
                'scraper_service_alarms_registered_alarm_queries',
                'dbserver_process_threads',
                'scraper_service_alarms_check_status_alarm_queries_sum',
                'node_network_receive_bytes_total',
                'scraper_service_grpc_request_duration_seconds_count',
                'scraper_service_process_start_time_seconds',
                'scraper_service_scrape_job_active_targets_num',
                'shoreline_process_memory_bytes',
                'process_open_fds',
                'statsd_exporter_tcp_too_long_lines_total',
                'process_swaps_total',
                'scraper_service_process_virtual_memory_bytes',
                'prometheus_sd_kubernetes_workqueue_unfinished_work_seconds',
                'prometheus_sd_kubernetes_workqueue_work_duration_seconds_count',
                'scraper_service_alarms_check_status_alarm_queries_count',
                'statsd_exporter_events_unmapped_total'
              ],
              resource_names: [],
              tags: []
            }
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'metric_metadata_query(resource_id="1")'
      } as any as MyVariableQuery);
      expect(result.length).toEqual(109);
      expect(result[1].text).toEqual('node_memory_MemTotal_bytes');
      expect(result[6].text).toEqual('node_network_receive_drop_total');
      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'metric_metadata_query(resource_id="1")'
      );
    });
  });

  describe('when performing annotation query call', () => {
    it('should return correct result on alarm events query', async () => {
      const mockDatasourceRequest = jest.fn(() =>
        Promise.resolve({
          data: {
            resources: [
              {
                type: 'HOST',
                tags: [
                  {
                    value: 'linux',
                    key: 'kubernetes.io/os'
                  }
                ],
                parent: '',
                name: 'i-07495dacd87d73a63',
                id: 1,
                attributes: [
                  {
                    value: '5051',
                    key: 'port'
                  }
                ]
              }
            ],
            annotation_query_rollup: {
              annotation_details: [],
              annotation_list: [
                {
                  action: null,
                  alarm: {
                    central_id: 1652933808,
                    description: '',
                    enabled: false,
                    local_id: 4294967381,
                    name: 'cpu_host_alarm'
                  },
                  annotation_id: {
                    central_id: 1652933808,
                    local_id: 4294967380
                  },
                  bot: null,
                  class_details: '',
                  class_id: {
                    central_id: 300004229,
                    local_id: 0,
                    version: 2
                  },
                  entity_type: 'ALARM',
                  instance_details: '',
                  resource_data: {
                    host_id: '1',
                    resource_id: '1',
                    resource_name: 'i-07495dacd87d73a63',
                    resource_tags: {
                      'kubernetes.io/os': {
                        tag_values: ['linux']
                      }
                    },
                    resource_type: 'HOST'
                  },
                  row_details:
                    '{"family":"custom","fire_query":"((cpu_usage > 0) | sum(10)) >= 5","metric_name":"cpu_usage"}',
                  status: 'resolved',
                  steps: [
                    {
                      description: '',
                      resource_data: null,
                      step_details: null,
                      step_id: null,
                      step_source: null,
                      step_type: 'ALARM_FIRE',
                      timestamp: 1652933807000,
                      title: 'fired cpu_host_alarm'
                    },
                    {
                      description: '',
                      resource_data: null,
                      step_details: null,
                      step_id: null,
                      step_source: null,
                      step_type: 'ALARM_CLEAR',
                      timestamp: 1652933813000,
                      title: 'cleared cpu_host_alarm'
                    }
                  ]
                }
              ]
            }
          }
        })
      );
      (getBackendSrv as jest.Mock).mockImplementation(() => ({
        datasourceRequest: mockDatasourceRequest
      }));

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.annotationQuery({
        annotation: { expr: 'events' },
        range: { from: dateTime(1000), to: dateTime(2000) }
      } as any as AnnotationQueryRequest<MyQuery>);
      expect(result.length).toEqual(2);
      expect(result[0].title).toEqual('ALARM_FIRE: cpu_host_alarm on i-07495dacd87d73a63');
      expect(result[1].title).toEqual('ALARM_CLEAR: cpu_host_alarm on i-07495dacd87d73a63');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'events | from=1000 | to=2000'
      );
    });
  });
});
